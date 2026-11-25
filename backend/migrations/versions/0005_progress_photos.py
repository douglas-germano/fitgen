"""Add private progress photos."""
from alembic import op
import sqlalchemy as sa

revision = "0005_progress_photos"
down_revision = "0004_referral_programs"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "progress_photos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pose", sa.String(8), nullable=False),
        sa.Column("taken_at", sa.DateTime(), nullable=False),
        sa.Column("storage_key", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_progress_photos_user_id", "progress_photos", ["user_id"])


def downgrade():
    op.drop_index("ix_progress_photos_user_id", table_name="progress_photos")
    op.drop_table("progress_photos")
