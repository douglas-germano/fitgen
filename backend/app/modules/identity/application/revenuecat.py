"""Applies RevenueCat webhook events (App Store / Google Play subscriptions).

RevenueCat docs: https://www.revenuecat.com/docs/integrations/webhooks

Contract with the app: the app calls `Purchases.logIn(<FitGen user id>)`, so
`app_user_id` is our `users.id` (UUID). Anonymous ids (`$RCAnonymousID:...`) are
ignored until the purchase is attached to a logged-in user (RevenueCat then sends
a TRANSFER / the next event carries the real id).

Access semantics (kept compatible with the Kiwify/Herospark flow):
- paid / renewed        -> subscription_status 'active', expiry = RevenueCat expiration
- cancelled (period left)-> 'canceled' (access until expiry)
- expired / refunded    -> 'canceled' with expiry in the past. We never use 'suspended'
                           here because it blocks login and the user must be able to
                           log in to re-subscribe inside the app.
- billing issue         -> 'past_due'
"""
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from flask import current_app

from app.modules.identity.application.billing_recorder import safe_record, to_decimal
from app.modules.identity.domain.models import User

IGNORED_TYPES = {"TEST", "TRANSFER", "SUBSCRIBER_ALIAS", "SUBSCRIPTION_PAUSED", "INVOICE_ISSUANCE", "TEMPORARY_ENTITLEMENT_GRANT", "EXPERIMENT_ENROLLMENT"}
PAID_TYPES = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE"}
STORE_METHOD = {"APP_STORE": "app_store", "MAC_APP_STORE": "app_store", "PLAY_STORE": "play_store"}


def _dt(ms) -> datetime | None:
    if not ms:
        return None
    return datetime.fromtimestamp(int(ms) / 1000, timezone.utc).replace(tzinfo=None)


def _period(purchased: datetime | None, expires: datetime | None) -> str:
    if not purchased or not expires:
        return "monthly"
    days = (expires - purchased).days
    if days >= 300:
        return "yearly"
    if days >= 150:
        return "semiannual"
    if days >= 60:
        return "quarterly"
    return "monthly"


def _find_user(event: dict) -> User | None:
    candidates = [event.get("app_user_id"), event.get("original_app_user_id"), *(event.get("aliases") or [])]
    for raw in candidates:
        if not raw or str(raw).startswith("$RCAnonymousID"):
            continue
        try:
            user = User.query.get(uuid.UUID(str(raw)))
        except (ValueError, TypeError):
            continue
        if user:
            return user
    return None


def apply_revenuecat_event(event: dict) -> str:
    """Returns a short human-readable outcome (also useful in logs/tests)."""
    event_type = event.get("type")
    if event_type in IGNORED_TYPES:
        return f"ignored:{event_type}"

    user = _find_user(event)
    if not user:
        current_app.logger.warning("RevenueCat %s for unknown/anonymous user %s", event_type, event.get("app_user_id"))
        return "ignored:unknown-user"

    # Sandbox purchases (App Review, TestFlight, Test Store) must still unlock the app, but they
    # are not real money: keep them out of the finance ledger unless explicitly accepted.
    sandbox = event.get("environment") == "SANDBOX"
    ledger = not sandbox or os.getenv("REVENUECAT_ACCEPT_SANDBOX", "").lower() in ("1", "true", "yes")
    record = safe_record if ledger else (lambda *a, **k: None)

    purchased = _dt(event.get("purchased_at_ms"))
    expires = _dt(event.get("expiration_at_ms"))
    method = STORE_METHOD.get(event.get("store"), None)

    currency = (event.get("currency") or "BRL").upper()
    amount = to_decimal(event.get("price_in_purchased_currency"))
    if amount is None and event.get("price") is not None:
        amount, currency = to_decimal(abs(Decimal(str(event["price"])))), "USD"
    if amount is not None:
        amount = abs(amount)

    common = dict(
        gateway=(event.get("store") or "revenuecat").lower(),
        method=method,
        external_id=event.get("transaction_id"),
        subscription_external_id=event.get("original_transaction_id"),
        period=_period(purchased, expires),
        currency=currency,
    )

    # `record` is a no-op for ignored sandbox events (the user's access fields are still updated).
    if event_type in PAID_TYPES or event_type == "PRODUCT_CHANGE":
        is_trial = event.get("period_type") == "TRIAL"
        # PRODUCT_CHANGE and free trials only move the subscription window; no money changed hands.
        record_payment = event_type != "PRODUCT_CHANGE" and not is_trial
        user.subscription_status = "active"
        user.subscription_expires_at = expires or user.subscription_expires_at
        record(user, kind="paid", amount=amount, paid_at=purchased, next_billing=expires,
                    record_payment=record_payment, **common)
        return ("paid" if record_payment else "trial-or-change") + ("" if ledger else ":sandbox-no-ledger")

    if event_type == "CANCELLATION":
        if event.get("cancel_reason") == "CUSTOMER_SUPPORT":  # refunded by Apple/Google
            user.subscription_status = "canceled"
            user.subscription_expires_at = datetime.utcnow()
            record(user, kind="refunded", amount=amount, paid_at=_dt(event.get("event_timestamp_ms")), **common)
            return "refunded"
        user.subscription_status = "canceled"  # keeps access until `expiration_at_ms`
        user.subscription_expires_at = expires or user.subscription_expires_at
        record(user, kind="canceled", amount=None, **common)
        return "canceled"

    if event_type == "EXPIRATION":
        user.subscription_status = "canceled"
        user.subscription_expires_at = expires or datetime.utcnow()
        record(user, kind="expired", amount=None, **common)
        return "expired"

    if event_type == "BILLING_ISSUE":
        user.subscription_status = "past_due"
        record(user, kind="late", amount=None, **common)
        return "billing-issue"

    return f"ignored:{event_type}"


# ---------------------------------------------------------------------------
# Pull-based sync (REST API): unlocks the app right after a purchase / restore without
# waiting for the webhook, and repairs missed webhooks.
# ---------------------------------------------------------------------------

def _parse_iso(value) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)


def sync_user_access(user) -> dict:
    """Reads the subscriber from RevenueCat and extends the user's access if it grants more.

    Never shortens access (the user may also be paid up through Kiwify). Money is not recorded
    here: payments reach the ledger through the webhook.
    """
    import requests

    secret = os.getenv("REVENUECAT_SECRET_API_KEY")
    if not secret:
        raise RuntimeError("REVENUECAT_SECRET_API_KEY is not set")
    response = requests.get(
        f"https://api.revenuecat.com/v1/subscribers/{uuid.UUID(str(user.id))}",
        headers={"Authorization": f"Bearer {secret}", "Accept": "application/json"},
        timeout=8,
    )
    response.raise_for_status()
    subscriber = response.json().get("subscriber", {})

    entitlement = (subscriber.get("entitlements") or {}).get(os.getenv("REVENUECAT_ENTITLEMENT", "premium"))
    if not entitlement:
        return {"entitled": False}

    expires = _parse_iso(entitlement.get("grace_period_expires_date")) or _parse_iso(entitlement.get("expires_date"))
    expires = expires or datetime(2099, 1, 1)  # lifetime / non-expiring
    product = (subscriber.get("subscriptions") or {}).get(entitlement.get("product_identifier"), {})

    now = datetime.utcnow()
    if expires > now:
        status = "past_due" if product.get("billing_issues_detected_at") else "canceled" if product.get("unsubscribe_detected_at") else "active"
    else:
        status = "canceled"
    if expires > (user.subscription_expires_at or datetime.min):
        user.subscription_status = status
        user.subscription_expires_at = expires
    return {"entitled": expires > now, "expires_at": expires.isoformat(), "status": status}
