
import sys
from sqlalchemy import create_engine, text

# URL provided by user
DATABASE_URL = "postgresql://admin:Samsepiol%40123@159.89.157.120:5432/fitgen"

def test_connection():
    try:
        print(f"Attempting to connect to: {DATABASE_URL.split('@')[-1]}") # Hide auth in logs
        engine = create_engine(DATABASE_URL, connect_args={'connect_timeout': 5})
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("âœ… Connection Successful!")
            print(f"Result: {result.fetchone()}")
    except Exception as e:
        print("âŒ Connection Failed!")
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
