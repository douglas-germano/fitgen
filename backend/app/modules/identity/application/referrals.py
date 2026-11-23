import secrets
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from app.modules.identity.domain.models import User
from app.modules.identity.domain.referral import PartnerCommission, Referral, ReferralCode, ReferralReward
from app.shared.extensions import db


def new_code(user, program):
    db.session.query(User.id).filter_by(id=user.id).with_for_update().one()
    row = ReferralCode.query.filter_by(owner_id=user.id, program=program).first()
    if row is None:
        row = ReferralCode(code=secrets.token_hex(9).upper(), owner_id=user.id, program=program)
        db.session.add(row)
    return row


def lookup_code(raw):
    if isinstance(raw, str) and 0 < len(raw.strip()) <= 24:
        return ReferralCode.query.filter_by(code=raw.strip().upper(), enabled=True).first()
    return None


def attribute_signup(user, code):
    if code:
        db.session.flush()
        db.session.add(Referral(user_id=user.id, code=code.code))


def preserve_bonus(user, previous_expiry):
    """Move the unspent bonus around changes to the paid access window."""
    now = datetime.utcnow()
    before = max(now, previous_expiry or now)
    after = max(now, user.subscription_expires_at or now)
    if before == after:
        return
    reward = db.session.get(ReferralReward, user.id, with_for_update=True)
    if reward is None:
        return
    left = reward.ends_at - max(now, reward.starts_at)
    if left <= timedelta(0):
        return
    if after > max(now, reward.starts_at) or (after < before and reward.starts_at == before):
        reward.starts_at = after
        reward.ends_at = after + left


def record_referral_payment(user, payment_id, amount, currency, *, source):
    if not payment_id or amount is None or not amount.is_finite() or amount <= 0:
        return
    referral = db.session.get(Referral, user.id, with_for_update=True)
    if not referral:
        return
    code = db.session.get(ReferralCode, referral.code)
    if code.program == "partner":
        payment_key = f"{source}:{payment_id}"
        if not PartnerCommission.query.filter_by(payment_id=payment_key).first():
            db.session.add(PartnerCommission(
                user_id=user.id, payment_id=payment_key, payment_amount=amount,
                currency=currency, amount=commission_amount(amount),
            ))
        if referral.qualified_at is None:
            referral.qualified_at = datetime.utcnow()
        return

    if referral.qualified_at is not None:
        return
    owner = db.session.get(User, code.owner_id, with_for_update=True)
    now = datetime.utcnow()
    referral.qualified_at = now
    qualified = Referral.query.filter(Referral.code == code.code, Referral.qualified_at.is_not(None)).count()
    if qualified % 3:
        return

    starts_at = max(now, owner.subscription_expires_at or now)
    reward = db.session.get(ReferralReward, owner.id, with_for_update=True)
    if reward is None:
        db.session.add(ReferralReward(user_id=owner.id, starts_at=starts_at, ends_at=starts_at + timedelta(days=30)))
    else:
        if reward.ends_at <= now:
            reward.starts_at = starts_at
        reward.ends_at = max(starts_at, reward.ends_at) + timedelta(days=30)


def program_summary(code):
    referrals = Referral.query.filter_by(code=code.code)
    qualified = referrals.filter(Referral.qualified_at.is_not(None)).count()
    return {
        "code": code.code,
        "enabled": code.enabled,
        "signups": referrals.count(),
        "qualified": qualified,
    }


def commission_amount(received):
    return (received * Decimal("0.30")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def commission_payload(row):
    return {
        "id": str(row.id), "payment_id": row.payment_id,
        "payment_amount": str(row.payment_amount),
        "received_amount": str(row.received_amount) if row.received_amount is not None else None, "amount": str(row.amount), "currency": row.currency,
        "status": row.status, "payout_reference": row.payout_reference,
        "created_at": row.created_at.isoformat(),
    }
