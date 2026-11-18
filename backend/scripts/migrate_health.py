"""Add the private HealthKit import ledger to the local database, idempotently."""
from pathlib import Path
import sys
import os
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / '.env')

if __name__ == '__main__':
    if make_url(os.environ['DATABASE_URL']).host not in ('localhost', '127.0.0.1', '::1'):
        sys.exit('Migração local: use um banco em localhost.')
    from app import create_app
    from app.shared.extensions import db
    from app.modules.analytics.domain.health_import import HealthImport
    with create_app().app_context():
        HealthImport.__table__.create(db.engine, checkfirst=True)
    print('Tabela de importações do Saúde disponível. Dados existentes preservados.')
