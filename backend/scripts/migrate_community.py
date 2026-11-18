"""Create the community tables without replaying the legacy Alembic branches.

Run once before starting this version: venv/bin/python scripts/migrate_community.py
Additive and idempotent: missing community_* tables and the optional group profile_picture column are created.
Also creates this month's public FitGen challenges.
"""
from pathlib import Path
import sys

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / '.env')


def main():
    from sqlalchemy.engine import make_url
    from sqlalchemy import text
    import os
    url = make_url(os.environ['DATABASE_URL'])
    if url.host not in ('localhost', '127.0.0.1', '::1'):
        sys.exit('Este comando local só aceita um banco em localhost. Use uma migração revisada no servidor.')
    from app import create_app
    from app.shared.extensions import db
    from app.modules.community.domain.models import ALL_TABLES
    app = create_app()
    with app.app_context():
        db.metadata.create_all(db.engine, tables=ALL_TABLES, checkfirst=True)
        with db.engine.begin() as conn:
            conn.execute(text('ALTER TABLE community_groups ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500)'))
            conn.execute(text('ALTER TABLE community_groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_community_groups_is_public ON community_groups (is_public)'))
        from app.commands import seed_official_challenges
        created = seed_official_challenges()
    print(f'Tabelas da comunidade disponíveis ({created} desafios públicos criados). Dados existentes preservados.')


if __name__ == '__main__':
    main()
