from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.exercise_library import ExerciseLibrary
from app.models.workout import Exercise
import uuid

admin_bp = Blueprint('admin', __name__)

@admin_bp.before_request
@jwt_required()
def check_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    print(f"Admin Access Check: User {user.email if user else 'None'} ({user_id}), Role: {user.role if user else 'None'}")
    if not user or user.role != 'admin':
        print("Admin access denied.")
        return jsonify({"msg": "Admin access required"}), 403

@admin_bp.route('/exercises', methods=['GET'])
def get_exercises():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    
    query = ExerciseLibrary.query.filter_by(is_active=True)
    if search:
        query = query.filter(ExerciseLibrary.name.ilike(f"%{search}%"))
        
    pagination = query.order_by(ExerciseLibrary.name).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "items": [{
            "id": ex.id,
            "name": ex.name,
            "category": ex.category,
            "difficulty_level": ex.difficulty_level,
            "video_url": ex.video_url,
            "description": ex.description
        } for ex in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })

@admin_bp.route('/exercises', methods=['POST'])
def create_exercise():
    data = request.get_json()
    
    if not data.get('name') or not data.get('category'):
        return jsonify({"msg": "Name and Category are required"}), 400
        
    exists = ExerciseLibrary.query.filter_by(name=data['name']).first()
    if exists:
        return jsonify({"msg": "Exercise already exists"}), 409
        
    new_ex = ExerciseLibrary(
        name=data['name'],
        category=data['category'],
        difficulty_level=data.get('difficulty_level', 'beginner'),
        video_url=data.get('video_url'),
        description=data.get('description'),
        instructions=data.get('instructions'),
        # Add simpler defaults for complex json fields if needed
        muscle_groups=[], 
        equipment_needed=[]
    )
    db.session.add(new_ex)
    db.session.commit()
    return jsonify({"msg": "Exercise created", "id": new_ex.id}), 201

@admin_bp.route('/exercises/<uuid:id>', methods=['PUT'])
def update_exercise(id):
    ex = ExerciseLibrary.query.get_or_404(id)
    data = request.get_json()
    
    if 'name' in data: ex.name = data['name']
    if 'category' in data: ex.category = data['category']
    if 'difficulty_level' in data: ex.difficulty_level = data['difficulty_level']
    if 'video_url' in data: ex.video_url = data['video_url']
    if 'description' in data: ex.description = data['description']
    if 'instructions' in data: ex.instructions = data['instructions']
    
    db.session.commit()
    return jsonify({"msg": "Exercise updated"}), 200

@admin_bp.route('/exercises/<uuid:id>', methods=['DELETE'])
def delete_exercise(id):
    ex = ExerciseLibrary.query.get_or_404(id)
    
    # Check if used in any plan
    in_use = Exercise.query.filter_by(exercise_library_id=id).first()
    if in_use:
         # Optional: Allow force delete if query param present? For now, block.
         return jsonify({"msg": "Cannot delete: Exercise is in use in user plans."}), 409

    db.session.delete(ex)
    db.session.commit()
    return jsonify({"msg": "Exercise deleted"}), 200

@admin_bp.route('/stats', methods=['GET'])
def get_stats():
    # Calculate date 7 days ago
    from datetime import datetime, timedelta
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    total_users = User.query.count()
    new_users = User.query.filter(User.created_at >= seven_days_ago).count()
    
    # Placeholder for active subs (assuming logic or field exists, user.is_premium?)
    # For now, 0 or mock
    active_subs = 0
    
    # Workouts
    from app.models.workout import WorkoutPlan
    total_workouts = WorkoutPlan.query.count()
    # Assuming we can distinguish AI generated (maybe check created_at or specific flag if added)
    # For now returns total
    
    return jsonify({
        "users": {
            "total": total_users,
            "new_last_7_days": new_users,
            "active_subs": active_subs
        },
        "workouts": {
            "total": total_workouts,
            "ai_generated": total_workouts # All plans are effectively AI generated or system generated for now
        },
        "activity": {
            "meals_logged": 0 # Placeholder needs Diet/Meal model query
        }
    })

@admin_bp.route('/users', methods=['GET'])
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    role = request.args.get('role', 'all')
    
    query = User.query
    
    from sqlalchemy import or_
    
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%")
            )
        )
    
    if role != 'all':
        query = query.filter_by(role=role)
        
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "users": [{
            "id": u.id,
            "name": u.name or u.email.split('@')[0],
            "email": u.email,
            "role": u.role,
            "status": u.subscription_status or "active",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": None 
        } for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
        "per_page": per_page
    })

@admin_bp.route('/users/<uuid:id>', methods=['GET'])
def get_user_details(id):
    user = User.query.get_or_404(id)
    
    profile_data = None
    if user.profile:
        profile_data = {
            "age": user.profile.age,
            "height": user.profile.height_cm,
            "weight": user.profile.current_weight_kg,
            "fitness_goal": user.profile.fitness_goal
        }
        
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": user.subscription_status,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": profile_data,
        "activity": {
            "workouts": user.workouts.count(),
            "meals_logged": user.meals.count(),
            "metrics_logged": user.body_metrics.count()
        }
    })

@admin_bp.route('/users/<uuid:id>', methods=['PUT'])
def update_user(id):
    user = User.query.get_or_404(id)
    data = request.get_json()
    
    if 'name' in data: user.name = data['name']
    if 'email' in data: user.email = data['email'] # Should check uniqueness?
    if 'subscription_status' in data: user.subscription_status = data['subscription_status']
    
    db.session.commit()
    return jsonify({"msg": "User updated"}), 200

@admin_bp.route('/users/<uuid:id>/suspend', methods=['PUT'])
def suspend_user(id):
    user = User.query.get_or_404(id)
    user.subscription_status = 'suspended'
    db.session.commit()
    return jsonify({"msg": "User suspended"}), 200

@admin_bp.route('/users/<uuid:id>/activate', methods=['PUT'])
def activate_user(id):
    user = User.query.get_or_404(id)
    user.subscription_status = 'active'
    db.session.commit()
    return jsonify({"msg": "User activated"}), 200

@admin_bp.route('/users/<uuid:id>/role', methods=['PUT'])
def change_user_role(id):
    user = User.query.get_or_404(id)
    data = request.get_json()
    
    if 'role' not in data or data['role'] not in ['user', 'admin']:
        return jsonify({"msg": "Invalid role"}), 400
        
    user.role = data['role']
    db.session.commit()
    return jsonify({"msg": "User role updated"}), 200

@admin_bp.route('/users/<uuid:id>', methods=['DELETE'])
def delete_user(id):
    user = User.query.get_or_404(id)
    
    # Optional: Prevent deleting self?
    current_user_id = get_jwt_identity()
    if str(user.id) == current_user_id:
        return jsonify({"msg": "Cannot delete yourself"}), 400
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "User deleted"}), 200

# --- Notification Management ---

@admin_bp.route('/notifications', methods=['GET'])
def list_system_notifications():
    from app.models.notification import Notification
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # List all notifications ordered by recent
    pagination = Notification.query.order_by(Notification.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "items": [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "user_email": n.user.email if n.user else "Unknown",
            "created_at": n.created_at.isoformat()
        } for n in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })

@admin_bp.route('/notifications/broadcast', methods=['POST'])
def broadcast_notification():
    from app.services.notification_service import NotificationService
    
    data = request.get_json()
    title = data.get('title')
    message = data.get('message')
    type = data.get('type', 'system')
    
    if not title or not message:
        return jsonify({"msg": "Title and message required"}), 400
        
    count = NotificationService.broadcast_notification(title, message, type)
    return jsonify({"msg": f"Notification sent to {count} users"}), 200

# --- Workout Management ---

@admin_bp.route('/workouts', methods=['GET'])
def list_workouts():
    """
    List all workout plans with pagination and filtering
    """
    from app.models.workout import WorkoutPlan, WorkoutDay
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user_id = request.args.get('user_id', '')
    is_active = request.args.get('is_active', 'all')
    
    query = WorkoutPlan.query
    
    # Filter by user
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    # Filter by active status
    if is_active != 'all':
        query = query.filter_by(is_active=(is_active == 'true'))
    
    # Join with User for sorting/display
    query = query.join(User, WorkoutPlan.user_id == User.id)
    
    pagination = query.order_by(WorkoutPlan.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    result = []
    for plan in pagination.items:
        # Count days
        num_days = WorkoutDay.query.filter_by(workout_plan_id=plan.id).count()
        
        result.append({
            "id": plan.id,
            "user": {
                "id": plan.user_id,
                "name": plan.user.name or plan.user.email.split('@')[0],
                "email": plan.user.email
            },
            "name": plan.name,
            "description": plan.description,
            "is_active": plan.is_active,
            "generated_by_ai": plan.generated_by_ai,
            "created_at": plan.created_at.isoformat() if plan.created_at else None,
            "num_days": num_days
        })
    
    return jsonify({
        "workouts": result,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
        "per_page": per_page
    })

@admin_bp.route('/workouts/<uuid:plan_id>', methods=['GET'])
def get_workout_detail(plan_id):
    """
    Get specific workout plan with all days and exercises
    """
    from app.models.workout import WorkoutPlan
    
    plan = WorkoutPlan.query.get_or_404(plan_id)
    
    # Build full structure
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
                "weight_kg": ex.weight_kg,
                "notes": ex.notes,
                "order": ex.order
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
        "user": {
            "id": plan.user_id,
            "name": plan.user.name or plan.user.email.split('@')[0],
            "email": plan.user.email
        },
        "name": plan.name,
        "description": plan.description,
        "is_active": plan.is_active,
        "generated_by_ai": plan.generated_by_ai,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "days": days_data
    })

@admin_bp.route('/workouts/<uuid:plan_id>', methods=['DELETE'])
def delete_workout(plan_id):
    """
    Delete workout plan and all associated data (cascade)
    """
    from app.models.workout import WorkoutPlan
    
    plan = WorkoutPlan.query.get_or_404(plan_id)
    
    # Store user info for response
    user_name = plan.user.name or plan.user.email
    
    # Delete will cascade to days and exercises
    db.session.delete(plan)
    db.session.commit()
    
    return jsonify({"msg": f"Workout plan deleted successfully for user {user_name}"}), 200

@admin_bp.route('/workouts/<uuid:plan_id>/regenerate', methods=['POST'])
def regenerate_workout(plan_id):
    """
    Regenerate workout for a user (deactivate old, create new)
    """
    from app.models.workout import WorkoutPlan
    from app.services.workout_generator import WorkoutGenerator
    
    plan = WorkoutPlan.query.get_or_404(plan_id)
    user = plan.user
    
    if not user.profile:
        return jsonify({"msg": "User has no profile for workout generation"}), 400
    
    # Deactivate current plan
    plan.is_active = False
    
    # Generate new plan
    try:
        generator = WorkoutGenerator(user.id)
        new_plan = generator.generate()
        
        db.session.commit()
        
        return jsonify({
            "msg": "Workout regenerated successfully",
            "new_plan_id": new_plan.id
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Failed to regenerate: {str(e)}"}), 500
