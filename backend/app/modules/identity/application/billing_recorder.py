"""Records gateway events (Kiwify / Herospark) in `subscriptions` and `payment_history`.

The webhooks used to only flip `User.subscription_status`; no amounts were kept,
so the admin finance panel had nothing to show. This keeps a ledger.

Safety rules:
- Never raise into the webhook: callers wrap it in a SAVEPOINT (see `safe_record`).
- Idempotent: a payment with the same (external id, status) is stored once.
- If the payload carries no amount, `BILLING_DEFAULT_PRICE_BRL` (env) is used, and
  the row is tagged in `notes` so it can be audited.
"""
import os
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from flask import current_app

from app.modules.identity.domain.subscription import PaymentHistory, Subscription
from app.shared.extensions import db

PERIOD_MONTHS = {"monthly": 1, "quarterly": 3, "semiannual": 6, "yearly": 12}
SUB_STATUS = {"paid": "active", "canceled": "cancelled", "late": "past_due", "refunded": "expired", "expired": "expired"}
METHODS = {
    "credit_card": "credit_card", "card": "credit_card", "pix": "pix", "boleto": "boleto", "billet": "boleto",
    "app_store": "app_store", "play_store": "play_store",
}


def to_decimal(value, cents: bool = False) -> Decimal | None:
    """Parses a gateway amount; returns None when missing/invalid/non-positive."""
    if value in (None, ""):
        return None
    try:
        number = Decimal(str(value).replace(",", "."))
    except InvalidOperation:
        return None
    if cents:
        number = number / 100
    return number if number > 0 else None


def default_price() -> Decimal | None:
    return to_decimal(os.getenv("BILLING_DEFAULT_PRICE_BRL"))


def normalize_method(raw) -> str | None:
    return METHODS.get(str(raw).lower()) if raw else None


def record_gateway_event(
    user,
    *,
    kind: str,                      # 'paid' | 'canceled' | 'late' | 'refunded' | 'expired'
    gateway: str,
    amount: Decimal | None = None,
    method: str | None = None,
    external_id: str | None = None,         # payment/transaction id (idempotency key)
    subscription_external_id: str | None = None,
    period: str = "monthly",
    paid_at: datetime | None = None,
    next_billing: datetime | None = None,
    currency: str = "BRL",
    record_payment: bool = True,            # False for free trials: updates the subscription only
) -> None:
    now = datetime.utcnow()
    months = PERIOD_MONTHS.get(period, 1)

    sub = Subscription.query.filter_by(user_id=user.id).first()
    if not sub:
        sub = Subscription(user_id=user.id, plan_type="premium", start_date=now, currency="BRL")
        db.session.add(sub)
    if sub.plan_type == "free":
        sub.plan_type = "premium"

    assumed = False
    if kind in ("paid", "refunded") and amount is None and record_payment:
        amount = default_price()
        assumed = amount is not None

    sub.status = SUB_STATUS[kind]
    sub.payment_method = normalize_method(method) or sub.payment_method
    sub.external_subscription_id = subscription_external_id or external_id or sub.external_subscription_id
    sub.currency = currency
    if kind == "paid":
        sub.cancelled_at = None
        sub.current_period_start = paid_at or now
        sub.next_billing_date = next_billing or (sub.current_period_start + timedelta(days=30 * months))
        sub.current_period_end = sub.next_billing_date
        if amount and record_payment:
            sub.price_monthly = (amount / months).quantize(Decimal("0.01"))
    elif kind == "canceled":
        sub.cancelled_at = now
    db.session.flush()

    if kind not in ("paid", "refunded") or not record_payment or amount is None:
        return

    status = "completed" if kind == "paid" else "refunded"
    if external_id and PaymentHistory.query.filter_by(external_payment_id=external_id, status=status).first():
        return  # duplicate delivery of the same event

    db.session.add(PaymentHistory(
        subscription_id=sub.id,
        amount=amount,
        currency=currency,
        status=status,
        payment_method=normalize_method(method),
        external_payment_id=external_id,
        payment_date=paid_at or now,
        notes=f"{gateway}" + (" · valor assumido (BILLING_DEFAULT_PRICE_BRL)" if assumed else ""),
    ))


def safe_record(user, **kwargs) -> None:
    """Runs `record_gateway_event` inside a savepoint; failures are logged, never raised."""
    try:
        with db.session.begin_nested():
            record_gateway_event(user, **kwargs)
    except Exception:  # noqa: BLE001 - must never break access granting
        current_app.logger.exception("Could not record billing event for %s", getattr(user, "email", "?"))
