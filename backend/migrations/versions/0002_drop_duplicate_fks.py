"""drop duplicate foreign keys

Revision ID: 0002_duplicate_fks
Revises: 0001_baseline
Create Date: 2026-11-22

Four models (Feedback, Notification, ProgressSnapshot, UserStreak) declared their foreign
keys twice, in __table_args__ and on the column, so db.create_all() gave production two
identical constraints per column (e.g. feedback_user_id_fkey and feedback_user_id_fkey1).
The models now declare each once; drop the extra copies where they exist.
"""
from alembic import op

revision = '0002_duplicate_fks'
down_revision = '0001_baseline'
branch_labels = None
depends_on = None


DUPLICATES = [
    ('feedback', 'feedback_user_id_fkey1'),
    ('feedback', 'feedback_admin_user_id_fkey1'),
    ('notifications', 'notifications_user_id_fkey1'),
    ('progress_snapshots', 'progress_snapshots_user_id_fkey1'),
    ('user_streaks', 'user_streaks_user_id_fkey1'),
]


def upgrade():
    for table, constraint in DUPLICATES:
        op.execute(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}')


def downgrade():
    # The duplicates were redundant: nothing to restore.
    pass
