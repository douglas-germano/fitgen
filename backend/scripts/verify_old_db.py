
import sys
from sqlalchemy import create_engine, text

# Old Database URL (from previous .env content)
DATABASE_URL = "postgresql://admin:Samsepiol%40123@72.60.242.175:5432/fitgen"

def check_users():
    try:
        print(f"Connecting to OLD database: {DATABASE_URL.split('@')[-1]}")
        engine = create_engine(DATABASE_URL, connect_args={'connect_timeout': 10})
        with engine.connect() as connection:
            result = connection.execute(text("SELECT id, email, name, password_hash FROM users LIMIT 5"))
            rows = result.fetchall()
            print("\n--- Users in Old Database ---")
            for row in rows:
                print(f"ID: {row[0]}, Email: {row[1]}, Name: {row[2]}")
                print(f"Hash: {row[3][:20]}..." if row[3] else "Hash: None")
                print("-" * 30)
            
            if not rows:
                print("No users found in old database.")
                
    except Exception as e:
        print("â Œ Connection Failed!")
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    check_users()
