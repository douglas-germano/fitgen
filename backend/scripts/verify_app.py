
import os
import sys
from datetime import timedelta

# Mock environment variables required by config.py
os.environ['SECRET_KEY'] = 'dev-secret-key'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:' # Dummy DB
os.environ['JWT_SECRET_KEY'] = 'dev-jwt-key'
os.environ['JWT_ACCESS_TOKEN_EXPIRES'] = '3600'
os.environ['JWT_REFRESH_TOKEN_EXPIRES'] = '86400'

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app import create_app
    app = create_app('default')
    
    print("✅ Application Factory created successfully!")
    print(f"✅ Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    print("\nRegistered Blueprints:")
    for blueprint in app.blueprints:
        print(f"  - {blueprint}")
        
    print("\nRegistered Routes (first 10):")
    rules = list(app.url_map.iter_rules())
    for rule in rules[:10]:
        print(f"  - {rule} -> {rule.endpoint}")
        
    print(f"\nTotal Routes: {len(rules)}")
    
    if len(app.blueprints) < 5:
        print("❌ WARNING: Too few blueprints registered. Check app/__init__.py")
        sys.exit(1)
        
    print("\n✅ VERIFICATION SUCCESSFUL: App initializes and routes are wired.")
    
except Exception as e:
    print(f"\n❌ VERIFICATION FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
