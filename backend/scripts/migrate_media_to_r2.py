"""Copy existing local images to the R2 bucket and point the database at them.

Run inside the API container (it has the uploads mounted and the R2 variables):
    docker compose exec api python scripts/migrate_media_to_r2.py --dry-run
    docker compose exec api python scripts/migrate_media_to_r2.py

Idempotent: rows already pointing at R2 are skipped, and an object that was
uploaded is reused if the database update is retried. Local files are NOT deleted;
remove them yourself once the app shows every image correctly.
"""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

TARGETS = [
    # (label, model import path, column, storage kind)
    ('perfil', 'app.modules.identity.domain.models:User', 'profile_picture', 'avatars'),
    ('posts', 'app.modules.community.domain.models:Activity', 'image_path', 'posts'),
    ('clubes', 'app.modules.community.domain.models:CommunityGroup', 'profile_picture', 'groups'),
]


def load(path):
    module, name = path.split(':')
    return getattr(__import__(module, fromlist=[name]), name)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help='só mostra o que seria enviado')
    args = parser.parse_args()

    from app import create_app
    from app.shared import storage
    from app.shared.extensions import db

    if not storage.configured():
        sys.exit('R2 não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET.')

    app = create_app()
    totals = {'enviadas': 0, 'puladas': 0, 'sem arquivo': 0, 'falhas': 0}
    with app.app_context():
        for label, model_path, column, kind in TARGETS:
            model = load(model_path)
            rows = model.query.filter(getattr(model, column).isnot(None)).all()
            for row in rows:
                value = getattr(row, column)
                if storage.is_r2(value) or value.startswith(('http://', 'https://')):
                    totals['puladas'] += 1
                    continue
                data = storage.read(kind, value)
                if data is None:
                    print(f'  [{label}] sem arquivo local: {value}')
                    totals['sem arquivo'] += 1
                    continue
                ext = value.rsplit('.', 1)[-1].lower()
                filename = os.path.basename(value)
                if args.dry_run:
                    print(f'  [{label}] enviaria {value} ({len(data) // 1024} KB)')
                    totals['enviadas'] += 1
                    continue
                try:
                    setattr(row, column, storage.save_as_r2(kind, filename, data, ext))
                    db.session.commit()
                    totals['enviadas'] += 1
                    print(f'  [{label}] ok {value}')
                except Exception as exc:
                    db.session.rollback()
                    totals['falhas'] += 1
                    print(f'  [{label}] FALHOU {value}: {exc}')
    print('\n' + (' (simulação) ' if args.dry_run else ' ') + ', '.join(f'{k}: {v}' for k, v in totals.items()))
    sys.exit(1 if totals['falhas'] else 0)


if __name__ == '__main__':
    main()
