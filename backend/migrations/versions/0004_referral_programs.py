"""Add attribution, Premium rewards, and recurring partner commissions."""
from alembic import op
import sqlalchemy as sa

revision = "0004_referral_programs"
down_revision = "0003_challenge_cover"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "referral_codes",
        sa.Column("code", sa.String(24), primary_key=True),
        sa.Column("owner_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("program", sa.String(16), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("owner_id", "program"),
    )
    op.create_table(
        "referrals",
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("code", sa.String(24), sa.ForeignKey("referral_codes.code", ondelete="CASCADE"), nullable=False),
        sa.Column("qualified_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_referrals_code", "referrals", ["code"])
    op.create_table(
        "referral_rewards",
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "partner_commissions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("referrals.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_id", sa.String(255), nullable=False, unique=True),
        sa.Column("payment_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("received_amount", sa.Numeric(12, 2)),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("payout_reference", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_partner_commissions_user_id", "partner_commissions", ["user_id"])


def downgrade():
    op.drop_table("partner_commissions")
    op.drop_table("referral_rewards")
    op.drop_table("referrals")
    op.drop_table("referral_codes")
