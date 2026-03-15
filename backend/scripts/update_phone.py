from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app()

with app.app_context():
    target_phone = '5566992073166'
    target_email = 'fitgen@douglasgermano.com'
    
    print(f"Searching for user {target_email}...")
    user = User.query.filter_by(email=target_email).first()
    
    if not user:
        print(f"User {target_email} not found. Checking for any user...")
        user = User.query.first()
        if user:
            print(f"Found user: {user.email}")
        else:
            print("No users found in database.")
            
    if user:
        print(f"Updating user {user.email}...")
        user.phone = target_phone
        try:
            db.session.commit()
            print(f"SUCCESS: Updated {user.email} phone to {user.phone}")
        except Exception as e:
            print(f"Error updating user: {e}")
            db.session.rollback()
