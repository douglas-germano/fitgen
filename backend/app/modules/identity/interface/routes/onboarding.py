import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.identity.domain.models import User, UserProfile
from app.modules.analytics.domain.metrics_calculator import calculate_bmr, calculate_tdee
from app.modules.training.application.workout_generator import WorkoutGeneratorService

onboarding_bp = Blueprint('onboarding', __name__)

from app.modules.analytics.domain.body_metrics import BodyMetric
from datetime import datetime

@onboarding_bp.route('', methods=['POST'])
@jwt_required()
def save_onboarding_data():
    """
    Save onboarding data
    ---
    tags:
      - Onboarding
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            current_weight_kg:
              type: number
            height_cm:
              type: number
            age:
              type: integer
            gender:
              type: string
            activity_level:
              type: string
            fitness_goal:
              type: string
            experience_level:
              type: string
    responses:
      200:
        description: Onboarding data saved
      400:
        description: Invalid data or calculation error
    """
    user_id = uuid.UUID(get_jwt_identity())
    user = User.query.get(user_id)
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    # Calculate metrics
    try:
        weight = float(data.get('current_weight_kg'))
        height = float(data.get('height_cm'))
        age = int(data.get('age'))
        gender = data.get('gender')
        activity = data.get('activity_level')
        
        bmr = calculate_bmr(weight, height, age, gender)
        tdee = calculate_tdee(bmr, activity)
    except (ValueError, TypeError) as e:
        return jsonify({"msg": "Invalid data for metric calculation"}), 400

    # Create or Update Profile
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
    
    # Update fields
    profile.age = age
    profile.gender = gender
    profile.height_cm = height
    profile.current_weight_kg = weight
    profile.target_weight_kg = float(data.get('target_weight_kg'))
    profile.activity_level = activity
    # Map frontend values to backend Enum values
    goal_mapping = {
        'weight_loss': 'lose_weight',
        'muscle_gain': 'gain_muscle',
        'maintenance': 'maintain',
        'strength_gain': 'gain_strength',
        'health': 'improve_health'
    }
    
    frontend_goal = data.get('fitness_goal')
    profile.fitness_goal = goal_mapping.get(frontend_goal, frontend_goal)
    profile.experience_level = data.get('experience_level')
    profile.available_days = data.get('available_days') # JSON
    profile.workout_duration_minutes = int(data.get('workout_duration_minutes', 60))
    profile.equipment_available = data.get('equipment_available') # JSON
    profile.injuries_limitations = data.get('injuries_limitations')
    profile.dietary_restrictions = data.get('dietary_restrictions')
    profile.bmr = bmr
    profile.tdee = tdee
    
    user.onboarding_completed = True
    
    # Save Initial Body Metric
    try:
        # Calculate Body Fat
        height_m = height / 100
        bmi = weight / (height_m ** 2)
        gender_factor = 1 if gender == 'male' else 0
        calculated_fat = (1.20 * bmi) + (0.23 * age) - (10.8 * gender_factor) - 5.4
        body_fat = round(max(calculated_fat, 0), 1)

        metric = BodyMetric.query.filter_by(user_id=user_id).order_by(BodyMetric.recorded_at.desc()).first()
        
        # Only create if no recent metric exists (or logic could be to always create on onboarding)
        # Let's create a new one to establish baseline
        new_metric = BodyMetric(
            user_id=user_id,
            weight_kg=weight,
            body_fat_percentage=body_fat,
            recorded_at=datetime.utcnow(),
            notes="Initial onboarding measurement"
        )
        db.session.add(new_metric)
    except Exception as e:
        print(f"Error saving initial metric: {e}")

    db.session.commit()
    
    return jsonify({
        "msg": "Onboarding data saved",
        "profile": {
            "bmr": bmr,
            "tdee": tdee
        }
    }), 200

@onboarding_bp.route('/generate-workout', methods=['POST'])
@jwt_required()
def generate_workout():
    """
    Generate initial workout plan
    ---
    tags:
      - Onboarding
    responses:
      200:
        description: Workout plan generated successfully
      400:
        description: Onboarding not completed
      500:
        description: Failed to generate workout plan
    """
    user_id = uuid.UUID(get_jwt_identity())
    user = User.query.get(user_id)
    profile = user.profile
    
    if not profile:
        return jsonify({"msg": "Onboarding not completed"}), 400
        
    try:
        generator = WorkoutGeneratorService()
        plan = generator.generate_workout_plan(user, profile)
        
        # Mark onboarding as completed
        user.onboarding_completed = True
        if profile:
            profile.onboarding_completed = True
        db.session.commit()
        
        return jsonify({
            "msg": "Workout plan generated successfully",
            "plan_id": plan.id,
            "plan_name": plan.name
        }), 200
    except Exception as e:
        print(f"Error generating workout: {e}")
        return jsonify({"msg": "Failed to generate workout plan"}), 500

@onboarding_bp.route('/status', methods=['GET'])
@jwt_required()
def get_status():
    """
    Get onboarding status
    ---
    tags:
      - Onboarding
    responses:
      200:
        description: Onboarding status retrieved
        schema:
          type: object
          properties:
            onboarding_completed:
              type: boolean
            has_profile:
              type: boolean
    """
    user_id = uuid.UUID(get_jwt_identity())
    user = User.query.get(user_id)
    
    return jsonify({
        "onboarding_completed": user.onboarding_completed,
        "has_profile": user.profile is not None
    }), 200
