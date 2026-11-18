"""Stripe web checkout (fitgen.pro/assinar): card + Pix (Pix Automático) subscriptions.

Flow:
  1. `create_checkout_session(user)` → Stripe Checkout in subscription mode (R$ 29,90/mês,
     7-day trial for first-time subscribers). `client_reference_id` and subscription metadata
     carry the FitGen user id.
  2. Stripe calls `/api/webhooks/stripe` (signature-verified); `apply_stripe_event` moves the
     user's access window (`subscription_status` / `subscription_expires_at`) and feeds the
     finance ledger through `billing_recorder`.
  3. `create_portal_session(user)` lets the customer cancel or change the payment method.

The iPhone app keeps using RevenueCat (App Store); both paths converge on the same access fields.

Env:
  STRIPE_SECRET_KEY          sk_test_… / sk_live_…
  STRIPE_WEBHOOK_SECRET      whsec_… of the /api/webhooks/stripe endpoint
  STRIPE_PRICE_LOOKUP_KEY    lookup key of the monthly BRL price (default fitgen_monthly_brl)
  STRIPE_TRIAL_DAYS          default 7 (0 disables the trial)
  STRIPE_PIX_MANDATE_MAX     max BRL cents the Pix Automático mandate allows (default 2× price)
  SITE_URL                   default https://fitgen.pro
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from decimal import Decimal

import stripe
from flask import current_app

from app.modules.identity.application.billing_recorder import safe_record
from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import Subscription
from app.shared.extensions import db

GATEWAY = "stripe"
ACTIVE = {"trialing", "active"}
ENDED = {"canceled", "unpaid", "incomplete_expired"}


class StripeNotConfigured(RuntimeError):
    pass


def _client() -> stripe.StripeClient:
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise StripeNotConfigured("STRIPE_SECRET_KEY is not set")
    return stripe.StripeClient(key)


def _site() -> str:
    return os.getenv("SITE_URL", "https://fitgen.pro").rstrip("/")


def _dt(ts) -> datetime | None:
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).replace(tzinfo=None) if ts else None


def _get(obj, key, default=None):
    """Works for StripeObject and plain dicts (tests / raw webhook payloads)."""
    try:
        value = obj[key]
    except (KeyError, TypeError, AttributeError):
        return default
    return default if value is None else value


def _price(client: stripe.StripeClient):
    lookup = os.getenv("STRIPE_PRICE_LOOKUP_KEY", "fitgen_monthly_brl")
    prices = client.v1.prices.list(params={"lookup_keys": [lookup], "active": True, "limit": 1})
    if not prices.data:
        raise StripeNotConfigured(f"No active Stripe price with lookup_key={lookup}")
    return prices.data[0]


def _subscription_row(user) -> Subscription | None:
    return Subscription.query.filter_by(user_id=user.id).first()


def _ensure_customer(client: stripe.StripeClient, user) -> str:
    sub = _subscription_row(user)
    if sub and sub.stripe_customer_id:
        return sub.stripe_customer_id
    customer = client.v1.customers.create(params={
        "email": user.email,
        "name": user.name,
        "metadata": {"user_id": str(user.id)},
    })
    if not sub:
        sub = Subscription(user_id=user.id, plan_type="free", status="incomplete", currency="BRL")
        db.session.add(sub)
    sub.stripe_customer_id = customer.id
    db.session.commit()
    return customer.id


def _trial_days(user) -> int:
    days = int(os.getenv("STRIPE_TRIAL_DAYS", "7"))
    sub = _subscription_row(user)
    had_subscription = bool(sub and (sub.stripe_subscription_id or sub.external_subscription_id)) or bool(user.subscription_expires_at)
    return 0 if had_subscription else days


def create_checkout_session(user) -> str:
    """Returns the hosted Checkout URL."""
    client = _client()
    price = _price(client)
    trial = _trial_days(user)
    subscription_data = {"metadata": {"user_id": str(user.id)}}
    if trial:
        subscription_data["trial_period_days"] = trial
    mandate_max = int(os.getenv("STRIPE_PIX_MANDATE_MAX", str((price.unit_amount or 2990) * 2)))

    base = {
        "mode": "subscription",
        "customer": _ensure_customer(client, user),
        "client_reference_id": str(user.id),
        "line_items": [{"price": price.id, "quantity": 1}],
        "subscription_data": subscription_data,
        "locale": "pt-BR",
        "allow_promotion_codes": True,
        "success_url": f"{_site()}/assinar?checkout=sucesso",
        "cancel_url": f"{_site()}/assinar?checkout=cancelado",
    }
    with_pix = {
        **base,
        "payment_method_types": ["card", "pix"],
        "payment_method_options": {"pix": {"mandate_options": {
            "amount": mandate_max, "amount_type": "maximum", "payment_schedule": "monthly",
        }}},
    }
    try:
        session = client.v1.checkout.sessions.create(params=with_pix)
    except stripe.InvalidRequestError as exc:
        # Pix Automático not enabled on the account (yet): don't block card sales.
        current_app.logger.warning("Stripe Checkout with Pix rejected, falling back to card: %s", exc.user_message or exc)
        session = client.v1.checkout.sessions.create(params={**base, "payment_method_types": ["card"]})
    return session.url


def create_portal_session(user) -> str:
    sub = _subscription_row(user)
    if not sub or not sub.stripe_customer_id:
        raise LookupError("No Stripe customer for this user")
    session = _client().v1.billing_portal.sessions.create(params={
        "customer": sub.stripe_customer_id, "return_url": f"{_site()}/assinar",
    })
    return session.url


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

def construct_event(payload: bytes, signature: str):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise StripeNotConfigured("STRIPE_WEBHOOK_SECRET is not set")
    return stripe.Webhook.construct_event(payload, signature, secret)


def _user_for(obj) -> User | None:
    meta = _get(obj, "metadata", {}) or {}
    for candidate in (_get(obj, "client_reference_id"), _get(meta, "user_id")):
        if candidate:
            try:
                user = db.session.get(User, candidate)
            except Exception:
                user = None
            if user:
                return user
    sub_id = _get(obj, "subscription") if _get(obj, "object") != "subscription" else _get(obj, "id")
    customer = _get(obj, "customer")
    query = None
    if sub_id:
        query = Subscription.query.filter_by(stripe_subscription_id=sub_id).first()
    if not query and customer:
        query = Subscription.query.filter_by(stripe_customer_id=customer).first()
    return db.session.get(User, query.user_id) if query else None


def _period_end(subscription) -> datetime | None:
    """`current_period_end` moved to subscription items in recent API versions."""
    if _get(subscription, "status") == "trialing" and _get(subscription, "trial_end"):
        return _dt(_get(subscription, "trial_end"))
    if _get(subscription, "current_period_end"):
        return _dt(_get(subscription, "current_period_end"))
    items = _get(_get(subscription, "items", {}), "data", []) or []
    ends = [_get(i, "current_period_end") for i in items if _get(i, "current_period_end")]
    return _dt(max(ends)) if ends else None


def _method(subscription) -> str | None:
    pm = _get(subscription, "default_payment_method")
    pm_type = _get(pm, "type") if isinstance(pm, (dict, stripe.StripeObject)) else None
    return "pix" if pm_type == "pix" else "credit_card" if pm_type else None


def _apply_subscription(user, subscription) -> str:
    status = _get(subscription, "status")
    expires = _period_end(subscription)
    row = _subscription_row(user)
    if row:
        row.stripe_subscription_id = _get(subscription, "id") or row.stripe_subscription_id
        row.stripe_customer_id = _get(subscription, "customer") or row.stripe_customer_id
    common = dict(gateway=GATEWAY, method=_method(subscription), subscription_external_id=_get(subscription, "id"))

    if status in ACTIVE:
        canceling = bool(_get(subscription, "cancel_at_period_end") or _get(subscription, "cancel_at"))
        user.subscription_status = "canceled" if canceling else "active"  # canceled keeps access until expiry
        user.subscription_expires_at = expires or user.subscription_expires_at
        safe_record(user, kind="canceled" if canceling else "paid", next_billing=expires, record_payment=False, **common)
        return "canceling" if canceling else status
    if status == "past_due":
        user.subscription_status = "past_due"
        safe_record(user, kind="late", **common)
        return "past_due"
    if status in ENDED:
        user.subscription_status = "canceled"
        user.subscription_expires_at = _dt(_get(subscription, "ended_at")) or datetime.utcnow()
        safe_record(user, kind="expired", **common)
        return "ended"
    return f"ignored-status:{status}"  # incomplete, paused…


def apply_stripe_event(event, client: stripe.StripeClient | None = None) -> str:
    etype = _get(event, "type")
    obj = _get(_get(event, "data", {}), "object", {})

    if etype == "checkout.session.completed":
        user = _user_for(obj)
        if not user:
            return "ignored:unknown-user"
        row = _subscription_row(user) or Subscription(user_id=user.id, plan_type="premium", currency="BRL")
        db.session.add(row)
        row.stripe_customer_id = _get(obj, "customer") or row.stripe_customer_id
        row.stripe_subscription_id = _get(obj, "subscription") or row.stripe_subscription_id
        if _get(obj, "subscription"):
            client = client or _client()
            subscription = client.v1.subscriptions.retrieve(_get(obj, "subscription"), params={"expand": ["default_payment_method"]})
            return "checkout:" + _apply_subscription(user, subscription)
        return "checkout:no-subscription"

    if etype in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
                 "customer.subscription.trial_will_end"):
        user = _user_for(obj)
        if not user:
            return "ignored:unknown-user"
        if not isinstance(_get(obj, "default_payment_method"), (dict, stripe.StripeObject)) and _get(obj, "default_payment_method"):
            client = client or _client()
            obj = client.v1.subscriptions.retrieve(_get(obj, "id"), params={"expand": ["default_payment_method"]})
        return _apply_subscription(user, obj)

    if etype == "invoice.paid":
        amount = Decimal(_get(obj, "amount_paid", 0)) / 100
        if amount <= 0:
            return "ignored:zero-invoice"  # trial start / 100% coupon
        user = _user_for(obj) or _user_for({"customer": _get(obj, "customer")})
        if not user:
            return "ignored:unknown-user"
        lines = _get(_get(obj, "lines", {}), "data", []) or []
        period_end = max((_get(_get(l, "period", {}), "end", 0) for l in lines), default=0)
        sub_id = _get(_get(_get(obj, "parent", {}), "subscription_details", {}), "subscription") or _get(obj, "subscription")
        method = None
        if sub_id:
            try:
                subscription = (client or _client()).v1.subscriptions.retrieve(sub_id, params={"expand": ["default_payment_method"]})
                method = _method(subscription)
            except Exception:  # ledger detail only; never fail the webhook for it
                pass
        expires = _dt(period_end)
        user.subscription_status = "active"
        if expires and expires > (user.subscription_expires_at or datetime.min):
            user.subscription_expires_at = expires
        safe_record(user, kind="paid", gateway=GATEWAY, method=method, amount=amount,
                    currency=(_get(obj, "currency") or "brl").upper(), external_id=_get(obj, "id"),
                    subscription_external_id=sub_id, paid_at=_dt(_get(_get(obj, "status_transitions", {}), "paid_at")),
                    next_billing=expires)
        return "paid"

    if etype == "invoice.payment_failed":
        user = _user_for(obj) or _user_for({"customer": _get(obj, "customer")})
        if not user:
            return "ignored:unknown-user"
        user.subscription_status = "past_due"
        safe_record(user, kind="late", gateway=GATEWAY)
        return "payment-failed"

    return f"ignored:{etype}"
