from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.training.domain.models import WorkoutSession, ExerciseLog, Exercise, WorkoutDay, WorkoutPlan
from datetime import datetime, timedelta
from app.shared.utils.timezone import now_cuiaba

exercises_bp = Blueprint('exercises', __name__)

@exercises_bp.route('/sessions/start', methods=['POST'])
@jwt_required()
def start_session():
    """
    Start a workout session
    ---
    tags:
      - Exercises
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - workout_day_id
          properties:
            workout_day_id:
              type: string
    responses:
      201:
        description: Session started
      409:
        description: Active session already exists
      404:
        description: Workout day not found
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    workout_day_id = data.get('workout_day_id')
    if not workout_day_id:
        return jsonify({"msg": "workout_day_id is required"}), 400
        
    # Verify ownership
    day = WorkoutDay.query.filter_by(id=workout_day_id, user_id=user_id).first()
    if not day:
        return jsonify({"msg": "Workout day not found"}), 404
        
    # Check if there is already an active session
    active_session = WorkoutSession.query.filter_by(
        user_id=user_id, status='in_progress'
    ).first()
    
    if active_session:
        return jsonify({
            "msg": "There is already an active session",
            "session_id": active_session.id
        }), 409
        
    new_session = WorkoutSession(
        user_id=user_id,
        workout_day_id=workout_day_id,
        started_at=now_cuiaba(),
        status='in_progress'
    )
    
    db.session.add(new_session)
    db.session.commit()
    
    return jsonify({"msg": "Session started", "session_id": new_session.id}), 201

@exercises_bp.route('/sessions/<uuid:session_id>/log-set', methods=['POST'])
@jwt_required()
def log_set(session_id):
    """
    Log a set for an exercise
    ---
    tags:
      - Exercises
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
      - in: body
        name: body
        schema:
          type: object
          required:
            - exercise_id
            - reps_done
            - weight_used_kg
          properties:
            exercise_id:
              type: string
            set_number:
              type: integer
            reps_done:
              type: integer
            weight_used_kg:
              type: number
    responses:
      201:
        description: Set logged
      404:
        description: Active session not found
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session or session.status != 'in_progress':
        return jsonify({"msg": "Active session not found"}), 404
        
    exercise_id = data.get('exercise_id')
    
    log = ExerciseLog(
        workout_session_id=session.id,
        exercise_id=exercise_id,
        user_id=user_id,
        set_number=data.get('set_number', 1),
        reps_done=data.get('reps_done'),
        weight_used_kg=data.get('weight_used_kg'),
        completed=True
    )
    
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"msg": "Set logged", "log_id": log.id}), 201

@exercises_bp.route('/sessions/<uuid:session_id>/finish', methods=['PUT'])
@jwt_required()
def finish_session(session_id):
    """
    Finish a workout session
    ---
    tags:
      - Exercises
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            notes:
              type: string
    responses:
      200:
        description: Session finished
      404:
        description: Session not found
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({"msg": "Session not found"}), 404
        
    session.status = 'completed'
    session.completed_at = now_cuiaba()
    session.notes = data.get('notes')
    
    # Calculate duration
    duration = (session.completed_at - session.started_at).total_seconds()
    session.total_duration_seconds = int(duration)
    
    # Calculate calories burned using MET formula
    # MET (Metabolic Equivalent of Task) * weight_kg * hours = calories
    from app.modules.identity.domain.models import User
    user = User.query.get(user_id)
    
    if user and user.profile and user.profile.weight_kg:
        weight_kg = user.profile.weight_kg
        hours = duration / 3600
        met_value = 6.0  # Moderate-intensity weight training
        calories = met_value * weight_kg * hours
        session.calories_burned = round(calories, 1)
    else:
        # Fallback: 5 calories per minute estimate
        minutes = duration / 60
        session.calories_burned = round(minutes * 5, 1)
    
    db.session.commit()
    
    # Gamification: Update Workout Streak
    try:
        from app.modules.gamification.application.service import GamificationService
        GamificationService.handle_activity(user_id, 'workout_finish')
    except Exception as e:
        print(f"Gamification error: {e}")

    return jsonify({
        "msg": "Session finished", 
        "duration": session.total_duration_seconds,
        "calories": session.calories_burned
    }), 200

@exercises_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """
    Get workout session history
    ---
    tags:
      - Exercises
    responses:
      200:
        description: List of completed sessions
    """
    user_id = get_jwt_identity()
    
    # Filters
    days = request.args.get('days', type=int)
    limit = request.args.get('limit', default=50, type=int)
    
    query = WorkoutSession.query.filter_by(user_id=user_id, status='completed')
    
    if days:
        cutoff_date = now_cuiaba() - timedelta(days=days)
        query = query.filter(WorkoutSession.completed_at >= cutoff_date)
        
    sessions = query.order_by(WorkoutSession.completed_at.desc())\
        .limit(limit).all()
        
    result = []
    for s in sessions:
        # Get workout day name if available
        day_name = "Unknown Workout"
        day = WorkoutDay.query.get(s.workout_day_id)
        if day:
            day_name = day.name
            
        result.append({
            "id": s.id,
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "duration_seconds": s.total_duration_seconds,
            "workout_name": day_name,
            "calories": s.calories_burned
        })
        
    return jsonify(result), 200
