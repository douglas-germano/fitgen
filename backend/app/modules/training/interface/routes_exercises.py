import uuid

from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared import storage
from app.shared.extensions import db
from app.shared.subscription_access import EXERCISE_HISTORY_FEATURE, access_payload, user_has_access
from app.modules.identity.domain.models import User
from app.modules.training.application.exercise_animations import ANIMATION_STORAGE_KIND, exercise_animation_url
from app.modules.training.domain.models import WorkoutSession, ExerciseLog, Exercise, WorkoutDay, WorkoutPlan
from app.modules.training.domain.exercise_library import ExerciseLibrary
from datetime import datetime, timedelta
from app.shared.utils.timezone import now_cuiaba

exercises_bp = Blueprint('exercises', __name__)


def _lines(text):
    return [line.strip() for line in (text or '').splitlines() if line.strip()]


def library_item(ex):
    return {
        'id': str(ex.id),
        'name': ex.name,
        'category': ex.category,
        'difficulty_level': ex.difficulty_level,
        'muscle_groups': ex.muscle_groups or [],
        'equipment_needed': ex.equipment_needed or [],
        'description': ex.description,
        'instructions': _lines(ex.instructions),
        'tips': _lines(ex.tips),
        'common_mistakes': _lines(ex.common_mistakes),
        'video_url': ex.video_url,
        'thumbnail_url': ex.thumbnail_url,
        'animation_url': exercise_animation_url(ex),
    }


@exercises_bp.route('/library', methods=['GET'])
@jwt_required()
def get_library():
    """The whole active exercise catalog (small; the app searches and filters it locally)."""
    rows = ExerciseLibrary.query.filter_by(is_active=True).order_by(ExerciseLibrary.name).all()
    return jsonify([library_item(ex) for ex in rows]), 200


@exercises_bp.route('/library/<uuid:exercise_id>', methods=['GET'])
@jwt_required()
def get_library_exercise(exercise_id):
    ex = ExerciseLibrary.query.filter_by(id=exercise_id, is_active=True).first()
    if not ex:
        return jsonify({'msg': 'Exercício não encontrado.'}), 404
    return jsonify(library_item(ex)), 200


@exercises_bp.get('/library/<uuid:exercise_id>/history')
@jwt_required()
def get_library_exercise_history(exercise_id):
    user_id = uuid.UUID(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'msg': 'Conta não encontrada.'}), 401
    if not user_has_access(user):
        return jsonify({
            'code': 'premium_required',
            'feature': EXERCISE_HISTORY_FEATURE,
            'msg': 'O histórico por exercício faz parte do FitGen Premium.',
            **access_payload(user),
        }), 402
    if not db.session.get(ExerciseLibrary, exercise_id):
        return jsonify({'msg': 'Exercício não encontrado.'}), 404

    page = max(1, request.args.get('page', default=1, type=int))
    page_size = 20
    logged_sets = ExerciseLog.query.filter_by(
        user_id=user_id, exercise_library_id=exercise_id, completed=True,
    )
    session_ids = logged_sets.with_entities(ExerciseLog.workout_session_id)
    sessions = (WorkoutSession.query.filter_by(user_id=user_id, status='completed')
                .filter(WorkoutSession.id.in_(session_ids.statement))
                .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id.desc())
                .offset((page - 1) * page_size).limit(page_size + 1).all())
    visible_sessions = sessions[:page_size]
    history = {session.id: {
        'id': str(session.id),
        'started_at': session.started_at.isoformat(),
        'sets': [],
    } for session in visible_sessions}
    if history:
        logs = (logged_sets.filter(ExerciseLog.workout_session_id.in_(history))
                .order_by(ExerciseLog.created_at, ExerciseLog.id).all())
        for log in logs:
            history[log.workout_session_id]['sets'].append({
                'id': str(log.id),
                'set_number': log.set_number,
                'reps': log.reps_done,
                'weight_kg': log.weight_used_kg,
            })
    return jsonify({'sessions': list(history.values()), 'has_more': len(sessions) > page_size})


RECORD_WINDOW_DAYS = 14


def recent_records(rows, since, limit=3):
    """Exercises whose heaviest set since `since` beats every earlier session.

    `rows` are (library_id, name, started_at, weight_kg) for completed, weighted sets. The first
    time an exercise is logged is not a record: there is nothing to beat yet.
    """
    best = {}
    for library_id, name, started_at, weight in rows:
        entry = best.setdefault(library_id, {'name': name, 'before': 0.0, 'recent': 0.0, 'at': None})
        if started_at < since:
            entry['before'] = max(entry['before'], weight)
        elif weight > entry['recent'] or (weight == entry['recent'] and started_at < entry['at']):
            entry['recent'], entry['at'] = weight, started_at
    records = [{
        'exercise_library_id': str(library_id),
        'name': entry['name'],
        'weight_kg': entry['recent'],
        'previous_kg': entry['before'],
        'achieved_at': entry['at'].isoformat(),
    } for library_id, entry in best.items() if entry['before'] > 0 and entry['recent'] > entry['before']]
    return sorted(records, key=lambda record: record['achieved_at'], reverse=True)[:limit]


@exercises_bp.get('/records/recent')
@jwt_required()
def get_recent_records():
    """Personal records (heaviest completed set) set in the last two weeks."""
    user_id = uuid.UUID(get_jwt_identity())
    since = datetime.utcnow() - timedelta(days=RECORD_WINDOW_DAYS)
    weighted = (db.session.query(ExerciseLog.exercise_library_id)
                .join(WorkoutSession, WorkoutSession.id == ExerciseLog.workout_session_id)
                .filter(ExerciseLog.user_id == user_id, ExerciseLog.completed.is_(True),
                        ExerciseLog.exercise_library_id.isnot(None), ExerciseLog.weight_used_kg > 0,
                        WorkoutSession.status == 'completed'))
    touched = weighted.filter(WorkoutSession.started_at >= since).distinct()
    rows = (weighted.join(ExerciseLibrary, ExerciseLibrary.id == ExerciseLog.exercise_library_id)
            .filter(ExerciseLog.exercise_library_id.in_(touched.subquery().select()))
            .with_entities(ExerciseLog.exercise_library_id, ExerciseLibrary.name,
                           WorkoutSession.started_at, ExerciseLog.weight_used_kg)
            .all())
    return jsonify(recent_records(rows, since)), 200


@exercises_bp.get('/library/animations/<filename>')
def get_exercise_animation(filename):
    """Deliver only media linked to an active official catalog entry."""
    if not ExerciseLibrary.query.filter_by(animation_key=filename, is_active=True).first():
        return jsonify({'msg': 'Animação não encontrada.'}), 404
    url = storage.signed_url(f'{storage.SCHEME}{ANIMATION_STORAGE_KIND}/{filename}')
    if not url:
        return jsonify({'msg': 'Animação temporariamente indisponível.'}), 503
    response = redirect(url)
    response.headers['Cache-Control'] = 'no-store'
    return response


@exercises_bp.route('/sessions/active', methods=['GET'])
@jwt_required()
def get_active_session():
    user_id = get_jwt_identity()
    session = WorkoutSession.query.filter_by(user_id=user_id, status='in_progress').first()
    if not session:
        return jsonify({'msg': 'Nenhuma sessão ativa.'}), 404
    day = WorkoutDay.query.filter_by(id=session.workout_day_id, user_id=user_id).first()
    if not day:
        return jsonify({'msg': 'Treino não encontrado.'}), 404
    return jsonify({
        'session_id': str(session.id), 'workout_day_id': str(day.id),
        'plan_id': str(day.workout_plan_id), 'started_at': session.started_at.isoformat(),
        'elapsed_seconds': max(0, int((now_cuiaba() - session.started_at).total_seconds())),
        'logs': [{'exercise_id': str(log.exercise_id), 'set_number': log.set_number,
                  'reps_done': log.reps_done, 'weight_used_kg': log.weight_used_kg}
                 for log in session.logs if log.completed],
    }), 200

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
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    try:
        workout_day_id = uuid.UUID(str(data.get('workout_day_id')))
    except ValueError:
        return jsonify({"msg": "workout_day_id is required"}), 400
        
    # Serialize starts for the same user, including starts on different workout days.
    User.query.filter_by(id=user_id).with_for_update().one()
    day = WorkoutDay.query.filter_by(id=workout_day_id, user_id=user_id).with_for_update().first()
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
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    session = WorkoutSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session or session.status != 'in_progress':
        return jsonify({"msg": "Active session not found"}), 404
        
    try:
        exercise_id = uuid.UUID(str(data.get('exercise_id')))
    except ValueError:
        return jsonify({'msg': 'Exercício não encontrado neste treino.'}), 404
    exercise = Exercise.query.filter_by(id=exercise_id, user_id=user_id, workout_day_id=session.workout_day_id).first()
    if not exercise:
        return jsonify({'msg': 'Exercício não encontrado neste treino.'}), 404
    reps = data.get('reps_done')
    weight = data.get('weight_used_kg')
    set_number = data.get('set_number', 1)
    import math
    if (isinstance(reps, bool) or not isinstance(reps, int) or reps <= 0 or
            isinstance(weight, bool) or not isinstance(weight, (int, float)) or not math.isfinite(weight) or weight < 0 or
            isinstance(set_number, bool) or not isinstance(set_number, int) or not 1 <= set_number <= (exercise.sets or 0)):
        return jsonify({'msg': 'Informe série, repetições e peso válidos.'}), 400
    existing = ExerciseLog.query.filter_by(workout_session_id=session.id, exercise_id=exercise.id, set_number=set_number).first()
    if existing:
        # Re-posting a set corrects it (the app lets the user edit a finished set);
        # a retry with identical values is a no-op.
        existing.reps_done = reps
        existing.weight_used_kg = weight
        db.session.commit()
        return jsonify({'msg': 'Série atualizada.', 'log_id': str(existing.id)}), 200
    
    log = ExerciseLog(
        workout_session_id=session.id,
        exercise_id=exercise_id,
        exercise_library_id=exercise.exercise_library_id,
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
    if session.status == 'completed':
        return jsonify({'msg': 'Session finished', 'duration': session.total_duration_seconds, 'calories': session.calories_burned}), 200
    if session.status != 'in_progress':
        return jsonify({'msg': 'A sessão não está em andamento.'}), 409
        
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
    
    if user and user.profile and user.profile.current_weight_kg:
        weight_kg = user.profile.current_weight_kg
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

    # Community: share the workout (respects the user's privacy settings) and update challenges.
    from app.modules.community.application import publisher
    publisher.on_workout_finished(user_id, session)
    publisher.after_activity(user_id)

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
