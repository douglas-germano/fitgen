#!/usr/bin/env python3
"""
Script para adicionar campo subscription_expires_at à tabela users
"""
import os
import sys
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Adicionar diretório ao path
sys.path.insert(0, '/var/www/fitgen/backend')

from app import create_app
from app.shared.extensions import db
from sqlalchemy import text

def main():
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Adicionando campo subscription_expires_at...")
            
            # Adicionar coluna
            db.session.execute(text(
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP'
            ))
            db.session.commit()
            
            print("✅ Campo adicionado com sucesso!")
            
            # Verificar
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'subscription_expires_at'
            """))
            
            row = result.fetchone()
            if row:
                print(f"✅ Verificado: {row[0]} ({row[1]}) - Nullable: {row[2]}")
                return 0
            else:
                print("❌ Campo não encontrado após criação")
                return 1
                
        except Exception as e:
            print(f"❌ Erro: {e}")
            db.session.rollback()
            return 1

if __name__ == '__main__':
    sys.exit(main())
