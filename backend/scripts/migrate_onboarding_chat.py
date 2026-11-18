"""Add the chat answer column without replaying the legacy Alembic branches.

Run once before starting this version: venv/bin/python scripts/migrate_onboarding_chat.py
The operation is additive, transactional and idempotent; existing profiles are preserved.
"""
from pathlib import Path
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
import os

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')


def main():
    url = make_url(os.environ['DATABASE_URL'])
    if url.host not in ('localhost', '127.0.0.1', '::1'):
        sys.exit('Este comando local só aceita um banco em localhost. Use uma migração revisada no servidor.')
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_answers JSON'))
    print('Coluna onboarding_answers disponível. Dados existentes preservados.')


if __name__ == '__main__':
    main()
