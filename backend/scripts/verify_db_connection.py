
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

def verify_connection():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not found in .env")
        sys.exit(1)

    # Mask password for display
    safe_url = db_url.split('@')[-1] if '@' in db_url else '***'
    print(f"Testing connection to: ...@{safe_url}")

    if '10.120.0.3' not in db_url:
        print("⚠️ WARNING: DATABASE_URL does not seem to contain the private IP (10.120.0.3)")
        print(f"Current URL content (partial): {safe_url}")

    try:
        engine = create_engine(db_url, connect_args={'connect_timeout': 5})
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database Connection Successful!")
            print(f"  Result: {result.fetchone()}")
            return True
    except Exception as e:
        print(f"❌ Database Connection Failed: {e}")
        return False

if __name__ == "__main__":
    if verify_connection():
        sys.exit(0)
    else:
        sys.exit(1)
