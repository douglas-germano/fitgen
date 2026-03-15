import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.user import User

app = create_app('development')

with app.app_context():
    email = "contato@douglasgermano.com"
    user = User.query.filter_by(email=email).first()
    
    if user:
        user.role = 'admin'
        db.session.commit()
        print(f"User {email} successfully promoted to ADMIN.")
    else:
        print(f"User {email} not found.")
