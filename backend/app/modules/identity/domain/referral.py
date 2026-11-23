import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID

from app.shared.extensions import db


class ReferralCode(db.Model):
    __tablename__ = "referral_codes"

    code = db.Column(db.String(24), primary_key=True)
    owner_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    program = db.Column(db.String(16), nullable=False)
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    __table_args__ = (db.UniqueConstraint("owner_id", "program"),)


class Referral(db.Model):
    __tablename__ = "referrals"

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    code = db.Column(db.String(24), db.ForeignKey("referral_codes.code", ondelete="CASCADE"), nullable=False, index=True)
    qualified_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class ReferralReward(db.Model):
    __tablename__ = "referral_rewards"

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)


class PartnerCommission(db.Model):
    __tablename__ = "partner_commissions"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("referrals.user_id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = db.Column(db.String(255), nullable=False, unique=True)
    payment_amount = db.Column(db.Numeric(12, 2), nullable=False)
    received_amount = db.Column(db.Numeric(12, 2))
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    status = db.Column(db.String(16), nullable=False, default="pending")
    payout_reference = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
