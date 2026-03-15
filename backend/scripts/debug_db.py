from app import create_app
from app.extensions import db
from app.models.user import User, UserProfile
from app.models.body_metrics import BodyMetric

app = create_app()

with app.app_context():
    email = "douglassilvagermano@gmail.com"
    user = User.query.filter_by(email=email).first()
    
    if user:
        print(f"User Found: {user.id}")
        print(f"Onboarding Completed: {user.onboarding_completed}")
        
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        if profile:
            print(f"Profile: Weight={profile.current_weight_kg}, Age={profile.age}, Gender={profile.gender}")
        else:
            print("No Profile Found")
            
        metrics = BodyMetric.query.filter_by(user_id=user.id).all()
        print(f"Metrics Count: {len(metrics)}")
        for m in metrics:
            print(f" - Metric: Weight={m.weight_kg}, Fat={m.body_fat_percentage}, Date={m.recorded_at}")
    else:
        print("User not found")
