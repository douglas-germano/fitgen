#!/usr/bin/env python3
"""
Script para testar envio de email via Brevo
"""
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, '/var/www/fitgen/backend')

from app import create_app
from app.modules.communication.application.email_service import EmailService

def test_email(to_email):
    app = create_app()
    
    with app.app_context():
        email_service = EmailService()
        
        print(f"📧 Enviando email de teste para: {to_email}")
        success = email_service.send_welcome_email(
            to_email=to_email,
            name="Teste",
            password="senha123"
        )
        
        if success:
            print("✅ Email enviado com sucesso!")
            return 0
        else:
            print("❌ Falha ao enviar email. Verifique os logs acima.")
            return 1

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Uso: python test_email.py <email>")
        sys.exit(1)
    
    sys.exit(test_email(sys.argv[1]))
