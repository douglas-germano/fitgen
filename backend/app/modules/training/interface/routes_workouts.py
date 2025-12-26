import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.training.domain.models import WorkoutPlan, WorkoutDay, Exercise
from datetime import datetime

workouts_bp = Blueprint('workouts', __name__)

@workouts_bp.route('', methods=['GET'])
@jwt_required()
def get_workouts():
    """
    Get all workout plans
    ---
    tags:
      - Workouts
    responses:
      200:
        description: List of workout plans
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              name:
                type: string
              is_active:
                type: boolean
    """
    user_id = uuid.UUID(get_jwt_identity())
    plans = WorkoutPlan.query.filter_by(user_id=user_id).order_by(WorkoutPlan.created_at.desc()).all()
    
    result = []
    for p in plans:
        result.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "is_active": p.is_active,
            "generated_by_ai": p.generated_by_ai,
            "created_at": p.created_at.isoformat()
        })
        
    return jsonify(result), 200

@workouts_bp.route('/<uuid:plan_id>', methods=['GET'])
@jwt_required()
def get_workout_details(plan_id):
    """
    Get workout details
    ---
    tags:
      - Workouts
    parameters:
      - in: path
        name: plan_id
        type: string
        required: true
    responses:
      200:
        description: Workout plan details
      404:
        description: Plan not found
    """
    user_id = uuid.UUID(get_jwt_identity())
    plan = WorkoutPlan.query.options(
        joinedload(WorkoutPlan.days).joinedload(WorkoutDay.exercises).joinedload(Exercise.exercise_library)
    ).filter_by(id=plan_id, user_id=user_id).first()
    
    if not plan:
        return jsonify({"msg": "Plan not found"}), 404
        
    days_data = []
    for day in plan.days:
        exercises_data = []
        for ex in day.exercises:
            exercises_data.append({
                "id": ex.id,
                "name": ex.name,
                "sets": ex.sets,
                "reps": ex.reps,
                "rest_seconds": ex.rest_seconds,
                "notes": ex.notes,
                "order": ex.order,
                "video_url": ex.exercise_library.video_url if ex.exercise_library else None
            })
            
        days_data.append({
            "id": day.id,
            "name": day.name,
            "day_of_week": day.day_of_week,
            "muscle_groups": day.muscle_groups,
            "order": day.order,
            "exercises": exercises_data
        })
        
    return jsonify({
        "id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "is_active": plan.is_active,
        "days": days_data
    }), 200

@workouts_bp.route('', methods=['POST'])
@jwt_required()
def create_workout():
    """
    Create a workout plan
    ---
    tags:
      - Workouts
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
            description:
              type: string
    responses:
      201:
        description: Plan created
      400:
        description: Invalid data
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({"msg": "Name is required"}), 400
        
    new_plan = WorkoutPlan(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', ''),
        generated_by_ai=False,
        is_active=False
    )
    
    db.session.add(new_plan)
    db.session.commit()
    
    return jsonify({"msg": "Plan created", "id": new_plan.id}), 201

@workouts_bp.route('/<uuid:plan_id>/activate', methods=['PUT'])
@jwt_required()
def activate_workout(plan_id):
    """
    Activate a workout plan
    ---
    tags:
      - Workouts
    parameters:
      - in: path
        name: plan_id
        type: string
        required: true
    responses:
      200:
        description: Plan activated
      404:
        description: Plan not found
    """
    user_id = uuid.UUID(get_jwt_identity())
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first()
    
    if not plan:
        return jsonify({"msg": "Plan not found"}), 404
        
    # Deactivate others
    WorkoutPlan.query.filter_by(user_id=user_id, is_active=True).update({"is_active": False})
    
    plan.is_active = True
    db.session.commit()
    
    return jsonify({"msg": "Plan activated"}), 200
