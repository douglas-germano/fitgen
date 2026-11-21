import os
import threading
import uuid
from flask import Blueprint, request, jsonify, current_app
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

def _wait_seconds() -> float:
    """How long the request waits for the plan before answering 202.

    Must stay well below gunicorn's --timeout (120 s): past that the worker is
    killed mid-request (SystemExit, Sentry FITGEN-BACKEND-7) and the user gets nothing.
    """
    return float(os.environ.get('ONBOARDING_WORKOUT_WAIT_SECONDS', '75'))


# One generation per user at a time, per gunicorn worker. Kept in memory on purpose:
# the plan itself is saved in the database, this only tracks the job in flight.
_workout_jobs: dict[str, dict] = {}
_workout_jobs_lock = threading.Lock()


def _run_workout_job(app, user_id: uuid.UUID, job: dict) -> None:
    """Generates the plan outside the request, so a slow AI answer can't kill the worker."""
    with app.app_context():
        try:
            user = User.query.get(user_id)
            profile = user.profile if user else None
            if not profile:
                raise ValueError('Onboarding not completed')
            plan = WorkoutGeneratorService().generate_workout_plan(user, profile)
            user.onboarding_completed = True
            profile.onboarding_completed = True
            db.session.commit()
            job.update(status='done', plan_id=str(plan.id), plan_name=plan.name)
        except Exception:
            db.session.rollback()
            app.logger.exception('Failed to generate onboarding workout')
            job['status'] = 'failed'
        finally:
            db.session.remove()
            job['event'].set()


def _start_or_join_job(user_id: uuid.UUID) -> dict:
    key = str(user_id)
    with _workout_jobs_lock:
        job = _workout_jobs.get(key)
        if job and job['status'] == 'pending':
            return job
        job = {'status': 'pending', 'event': threading.Event(), 'plan_id': None, 'plan_name': None}
        _workout_jobs[key] = job
    app = current_app._get_current_object()
    threading.Thread(target=_run_workout_job, args=(app, user_id, job), daemon=True,
                     name=f'onboarding-workout-{key}').start()
    return job


def _job_response(job: dict):
    if job['status'] == 'done':
        return jsonify({
            "msg": "Workout plan generated successfully",
            "status": "done",
            "plan_id": job['plan_id'],
            "plan_name": job['plan_name'],
        }), 200
    if job['status'] == 'failed':
        return jsonify({"msg": "Failed to generate workout plan", "status": "failed"}), 500
    return jsonify({"msg": "Workout plan is being generated", "status": "pending"}), 202


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
      202:
        description: Still generating; the plan is saved when ready (poll /generate-workout/status)
      400:
        description: Onboarding not completed
      500:
        description: Failed to generate workout plan
    """
    user_id = uuid.UUID(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.profile:
        return jsonify({"msg": "Onboarding not completed"}), 400

    job = _start_or_join_job(user_id)
    job['event'].wait(timeout=_wait_seconds())
    return _job_response(job)


@onboarding_bp.route('/generate-workout/status', methods=['GET'])
@jwt_required()
def generate_workout_status():
    """
    Status of the onboarding workout generation started by POST /generate-workout
    ---
    tags:
      - Onboarding
    responses:
      200:
        description: "status: idle, pending, done or failed"
    """
    job = _workout_jobs.get(get_jwt_identity())
    if not job:
        return jsonify({"status": "idle"}), 200
    body, code = _job_response(job)
    return body, 200

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


@onboarding_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_conversation():
    from sqlalchemy.exc import SQLAlchemyError
    from app.modules.identity.application.onboarding import validate_answers
    from app.modules.nutrition.domain.diet import DietPreference
    data = request.get_json(silent=True)
    try:
        answers, fields, nutrition = validate_answers(data.get('answers') if isinstance(data, dict) else None)
    except ValueError as error:
        return jsonify({'msg': str(error)}), 400
    user_id = uuid.UUID(get_jwt_identity())
    try:
        # Serialize completion/retries for this user; baseline is only recorded once.
        user = User.query.filter_by(id=user_id).with_for_update().first()
        if not user:
            return jsonify({'msg': 'Usuário não encontrado.'}), 404
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
        for key, value in fields.items():
            setattr(profile, key, value)
        profile.onboarding_answers = answers
        profile.onboarding_completed = True
        profile.bmr = calculate_bmr(fields['current_weight_kg'], fields['height_cm'], fields['age'], fields['gender'])
        profile.tdee = calculate_tdee(profile.bmr, fields['activity_level'])
        pref = DietPreference.query.filter_by(user_id=user_id).first()
        if not pref:
            pref = DietPreference(user_id=user_id)
            db.session.add(pref)
        for key, value in nutrition.items():
            setattr(pref, key, value)
        if not BodyMetric.query.filter_by(user_id=user_id).first():
            db.session.add(BodyMetric(user_id=user_id, weight_kg=fields['current_weight_kg'], notes='Peso inicial informado no onboarding'))
        user.name = answers['name']
        user.onboarding_completed = True
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception('Could not save onboarding conversation')
        return jsonify({'msg': 'Não foi possível salvar agora. Suas respostas continuam no aparelho. Tente novamente.'}), 503
    return jsonify({'msg': 'Seu perfil e suas preferências foram salvos.', 'onboarding_completed': True}), 200
