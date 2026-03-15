
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
import os

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your_jwt_secret_key_here_change_in_production'  # Matching .env
jwt = JWTManager(app)

with app.app_context():
    # Generate token for Douglas
    token = create_access_token(identity='1f63fcd2-7388-466d-be83-28ca982e178f')
    print(token)
