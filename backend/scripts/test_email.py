#!/usr/bin/env python3
"""
Send the FitGen transactional emails to an address, through Brevo.

    cd backend && python scripts/test_email.py you@example.com [reset|welcome|all]
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.modules.communication.application.email_service import EmailService, missing_config  # noqa: E402


def main(to_email, which):
    if missing_config():
        print(f"Faltam variáveis: {', '.join(missing_config())}")
        return 1
    app = create_app()
    with app.app_context():
        service = EmailService()
        results = {}
        if which in ("reset", "all"):
            base = os.getenv('FRONTEND_URL', 'https://admin.fitgen.pro').rstrip('/')
            results["reset"] = service.send_password_reset_email(to_email, f"{base}/reset-password?token=teste")
        if which in ("welcome", "all"):
            results["welcome"] = service.send_welcome_email(to_email, "Teste FitGen", "senha-de-teste")
    for name, ok in results.items():
        print(f"{'✅' if ok else '❌'} {name}")
    return 0 if all(results.values()) else 1


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        print(__doc__)
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else "all"))
