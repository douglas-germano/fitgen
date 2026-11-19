import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.training.application.exercise_animations import exercise_animation_url
from app.modules.training.domain.exercise_library import ExerciseLibrary
from app.modules.training.domain.models import WorkoutPlan, WorkoutDay, Exercise, ExerciseLog, WorkoutSession
from sqlalchemy.orm import joinedload
from datetime import datetime


def exercise_fields(data):
    if not isinstance(data, dict) or not isinstance(data.get('name'), str) or not data['name'].strip():
        raise ValueError('Informe o nome do exercício.')
    sets = data.get('sets', 3)
    rest = data.get('rest_seconds', 60)
    if isinstance(sets, bool) or not isinstance(sets, int) or not 1 <= sets <= 50:
        raise ValueError('Informe de 1 a 50 séries.')
    if isinstance(rest, bool) or not isinstance(rest, int) or not 0 <= rest <= 3600:
        raise ValueError('Informe um descanso de 0 a 3600 segundos.')
    reps = str(data.get('reps') or '').strip()
    if not reps:
        raise ValueError('Informe as repetições.')
    fields = dict(name=data['name'].strip(), sets=sets, reps=reps,
                  rest_seconds=rest, notes=data.get('notes') or '')
    # Picked from the library (or unlinked with null when the name was typed by hand).
    if 'exercise_library_id' in data:
        library_id = data['exercise_library_id']
        if library_id is not None:
            try:
                library_id = uuid.UUID(str(library_id))
            except ValueError:
                raise ValueError('Exercício da biblioteca inválido.')
            item = ExerciseLibrary.query.filter_by(id=library_id, is_active=True).first()
            if not item:
                raise ValueError('Exercício da biblioteca não encontrado.')
            fields['name'] = item.name
        fields['exercise_library_id'] = library_id
    return fields

def primary_muscle_label(library_exercise):
    from app.modules.training.data.exercise_catalog import MUSCLE_LABELS
    muscles = (library_exercise.muscle_groups if library_exercise else None) or []
    return MUSCLE_LABELS.get(muscles[0], muscles[0]) if muscles else None


workouts_bp = Blueprint('workouts', __name__)


@workouts_bp.route('/day/<uuid:day_id>/exercises', methods=['POST'])
@jwt_required()
def add_exercise(day_id):
    user_id = uuid.UUID(get_jwt_identity())
    day = WorkoutDay.query.filter_by(id=day_id, user_id=user_id).first()
    if not day:
        return jsonify({'msg': 'Treino não encontrado.'}), 404
    try:
        fields = exercise_fields(request.get_json(silent=True))
    except ValueError as error:
        return jsonify({'msg': str(error)}), 400
    order = max((exercise.order or 0 for exercise in day.exercises), default=0) + 1
    exercise = Exercise(workout_day_id=day.id, user_id=user_id, order=order, **fields)
    db.session.add(exercise)
    db.session.commit()
    return jsonify({'id': str(exercise.id), 'msg': 'Exercício adicionado.'}), 201


@workouts_bp.route('/exercises/<uuid:exercise_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def edit_exercise(exercise_id):
    user_id = uuid.UUID(get_jwt_identity())
    exercise = Exercise.query.filter_by(id=exercise_id, user_id=user_id).first()
    if not exercise:
        return jsonify({'msg': 'Exercício não encontrado.'}), 404
    if request.method == 'DELETE':
        # Keep completed session logs attached to their original exercise.
        if ExerciseLog.query.filter_by(exercise_id=exercise_id).first():
            return jsonify({'msg': 'Este exercício já tem séries registradas. Edite-o ou gere um novo plano para preservar seu histórico.'}), 409
        db.session.delete(exercise)
    else:
        try:
            fields = exercise_fields(request.get_json(silent=True))
        except ValueError as error:
            return jsonify({'msg': str(error)}), 400
        if 'exercise_library_id' in fields:
            # Starting a session uses the same day lock so a swap cannot race the start.
            WorkoutDay.query.filter_by(id=exercise.workout_day_id, user_id=user_id).with_for_update().one()
            db.session.refresh(exercise)
        if 'exercise_library_id' in fields and fields['exercise_library_id'] != exercise.exercise_library_id:
            if not fields['exercise_library_id']:
                return jsonify({'msg': 'Selecione o novo exercício na biblioteca.'}), 400
            active = WorkoutSession.query.filter_by(workout_day_id=exercise.workout_day_id, user_id=user_id).filter(
                WorkoutSession.status.in_(('in_progress', 'paused'))
            ).first()
            if active:
                return jsonify({'msg': 'Finalize o treino em andamento antes de trocar o exercício.'}), 409
            exercise.weight_kg = None
            exercise.description = None
        for key, value in fields.items():
            setattr(exercise, key, value)
    db.session.commit()
    return jsonify({'msg': 'Exercício atualizado.'}), 200

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
            "created_at": p.created_at.isoformat() if p.created_at else None
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
                "exercise_library_id": str(ex.exercise_library_id) if ex.exercise_library_id else None,
                "muscle_group": primary_muscle_label(ex.exercise_library),
                "animation_url": exercise_animation_url(ex.exercise_library),
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
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
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
