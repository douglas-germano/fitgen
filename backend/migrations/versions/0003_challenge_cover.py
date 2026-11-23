"""Add optional cover images to community challenges."""
from alembic import op
import sqlalchemy as sa

revision = '0003_challenge_cover'
down_revision = '0002_duplicate_fks'
branch_labels = None
depends_on = None


def upgrade():
    # Fresh databases can already contain the field from the model-backed baseline.
    op.add_column('community_challenges', sa.Column('cover_image', sa.String(500)), if_not_exists=True)


def downgrade():
    op.drop_column('community_challenges', 'cover_image')
