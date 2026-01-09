import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv('.env')

from app import create_app
from app.modules.training.application.workout_generator import WorkoutGeneratorService
from app.modules.identity.domain.models import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email="contato@douglasgermano.com").first()
    if not user:
        print("User not found")
        exit(1)
    
    # Ensure profile exists
    if not user.profile:
        print("User profile not found")
        exit(1)

    print(f"Generating workout for {user.name} (ID: {user.id})")
    try:
        service = WorkoutGeneratorService()
        # Mocking the prompt if needed, or seeing if it works with real Gemini
        plan = service.generate_workout_plan(user, user.profile)
        print(f"Plan generated successfully: ID={plan.id}")
    except Exception as e:
        print("Caught exception:")
        import traceback
        traceback.print_exc()
