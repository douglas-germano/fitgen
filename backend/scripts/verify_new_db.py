
import sys
from app.shared.extensions import db
from app import create_app
from sqlalchemy import text

app = create_app()

def list_users():
    with app.app_context():
        try:
            print(f"Connecting to database...")
            # Using raw SQL to avoid model dependency issues if schemas mismatch slightly
            result = db.session.execute(text("SELECT id, email, name, password_hash FROM users LIMIT 5"))
            rows = result.fetchall()
            print("\n--- Users in NEW Database (159.89.157.120) ---")
            for row in rows:
                print(f"ID: {row[0]}, Email: {row[1]}, Name: {row[2]}")
                print(f"Hash: {row[3][:20]}..." if row[3] else "Hash: None")
                print("-" * 30)
            
            if not rows:
                print("No users found in NEW database.")
                
        except Exception as e:
            print("â Œ Error querying database!")
            print(f"Error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    list_users()
