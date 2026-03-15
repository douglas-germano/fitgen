#!/usr/bin/env python3
"""
Script para definir senha para usuário criado via webhook
"""
import sys
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()
sys.path.insert(0, '/var/www/fitgen/backend')

from app import create_app
from app.shared.extensions import db
from app.modules.identity.domain.models import User

def set_password(email, new_password):
    app = create_app()
    
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"❌ Usuário {email} não encontrado")
            return 1
        
        # Definir nova senha
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        print(f"✅ Senha atualizada para: {email}")
        print(f"Nova senha: {new_password}")
        print(f"\nAcesse: https://fitgen.suacozinha.site/login")
        return 0

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Uso: python set_user_password.py <email> <senha>")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    sys.exit(set_password(email, password))
