from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.identity.domain.models import User
from app.modules.training.domain.exercise_library import ExerciseLibrary
from app.modules.training.domain.models import Exercise
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
    """Get admin dashboard statistics with subscription metrics"""
    from datetime import datetime, timedelta
    from app.modules.identity.domain.subscription import Subscription
    from sqlalchemy import func
    
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # User stats
    total_users = User.query.filter(User.deleted_at.is_(None)).count()
    new_users = User.query.filter(User.created_at >= seven_days_ago, User.deleted_at.is_(None)).count()
    new_users_30d = User.query.filter(User.created_at >= thirty_days_ago, User.deleted_at.is_(None)).count()
    
    # Subscription stats
    active_subs = Subscription.query.filter_by(status='active').count()
    premium_subs = Subscription.query.filter(
        Subscription.status == 'active',
        Subscription.plan_type.in_(['premium', 'pro'])
    ).count()
    
    # Calculate MRR (Monthly Recurring Revenue)
    mrr_result = db.session.query(func.sum(Subscription.price_monthly)).filter(
        Subscription.status == 'active'
    ).scalar()
    mrr = float(mrr_result) if mrr_result else 0.0
    
    # Subscription breakdown by plan
    sub_breakdown = db.session.query(
        Subscription.plan_type,
        func.count(Subscription.id)
    ).filter(
        Subscription.status == 'active'
    ).group_by(Subscription.plan_type).all()
    
    plan_counts = {plan: count for plan, count in sub_breakdown}
    
    # Workouts
    from app.modules.training.domain.models import WorkoutPlan
    total_workouts = WorkoutPlan.query.count()
    ai_generated_workouts = WorkoutPlan.query.filter_by(generated_by_ai=True).count()
    
    return jsonify({
        "users": {
            "total": total_users,
            "new_last_7_days": new_users,
            "new_last_30_days": new_users_30d,
            "active_subs": active_subs,
            "premium_subs": premium_subs
        },
        "revenue": {
            "mrr": mrr,
            "currency": "BRL"
        },
        "subscriptions": {
            "total_active": active_subs,
            "free": plan_counts.get('free', 0),
            "premium": plan_counts.get('premium', 0),
            "pro": plan_counts.get('pro', 0)
        },
        "workouts": {
            "total": total_workouts,
            "ai_generated": ai_generated_workouts
        },
        "activity": {
            "meals_logged": 0  # TODO: Add when meal tracking is implemented
        }
    })

@admin_bp.route('/users', methods=['GET'])
def get_users():
    """Get users with advanced filtering and optional CSV export"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    role = request.args.get('role', 'all')
    export_csv = request.args.get('export', 'false').lower() == 'true'
    
    # Date filters
    created_after = request.args.get('created_after')
    created_before = request.args.get('created_before')
    last_login_after = request.args.get('last_login_after')
    last_login_before = request.args.get('last_login_before')
    
    from sqlalchemy import or_
    from datetime import datetime
    
    query = User.query.filter(User.deleted_at.is_(None))  # Exclude soft-deleted users
    
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%")
            )
        )
    
    if role != 'all':
        query = query.filter_by(role=role)
    
    # Date range filters
    if created_after:
        try:
            date_obj = datetime.fromisoformat(created_after)
            query = query.filter(User.created_at >= date_obj)
        except ValueError:
            pass
    
    if created_before:
        try:
            date_obj = datetime.fromisoformat(created_before)
            query = query.filter(User.created_at <= date_obj)
        except ValueError:
            pass
    
    if last_login_after:
        try:
            date_obj = datetime.fromisoformat(last_login_after)
            query = query.filter(User.last_login >= date_obj)
        except ValueError:
            pass
    
    if last_login_before:
        try:
            date_obj = datetime.fromisoformat(last_login_before)
            query = query.filter(User.last_login <= date_obj)
        except ValueError:
            pass
        
    # CSV Export
    if export_csv:
        import csv
        from io import StringIO
        from flask import make_response
        
        all_users = query.order_by(User.created_at.desc()).all()
        
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(['ID', 'Nome', 'Email', 'Função', 'Status', 'Cadastro', 'Último Login'])
        
        for u in all_users:
            writer.writerow([
                str(u.id),
                u.name or u.email.split('@')[0],
                u.email,
                u.role,
                u.subscription_status or "active",
                u.created_at.isoformat() if u.created_at else '',
                u.last_login.isoformat() if u.last_login else 'Nunca'
            ])
        
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=users_export.csv"
        output.headers["Content-type"] = "text/csv"
        return output
        
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "users": [{
            "id": u.id,
            "name": u.name or u.email.split('@')[0],
            "email": u.email,
            "role": u.role,
            "status": u.subscription_status or "active",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None
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
    from app.modules.communication.domain.notification import Notification
    
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
    from app.modules.communication.application.notification_service import NotificationService
    
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
    from app.modules.training.domain.models import WorkoutPlan, WorkoutDay
    
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
    from app.modules.training.domain.models import WorkoutPlan
    
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
    from app.modules.training.domain.models import WorkoutPlan
    
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
    from app.modules.training.domain.models import WorkoutPlan
    from app.modules.training.application.workout_generator import WorkoutGenerator
    
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

# ========================================
# AUDIT LOGS ENDPOINTS
# ========================================

@admin_bp.route('/audit-logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs with filtering and pagination"""
    from app.modules.identity.domain.audit_log import AuditLog
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Filters
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    resource_type = request.args.get('resource_type')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    from datetime import datetime
    
    query = AuditLog.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    if action:
        query = query.filter_by(action=action)
    if resource_type:
        query = query.filter_by(resource_type=resource_type)
    if date_from:
        try:
            date_obj = datetime.fromisoformat(date_from)
            query = query.filter(AuditLog.created_at >= date_obj)
        except ValueError:
            pass
    if date_to:
        try:
            date_obj = datetime.fromisoformat(date_to)
            query = query.filter(AuditLog.created_at <= date_obj)
        except ValueError:
            pass
    
    pagination = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "logs": [{
            "id": log.id,
            "user_email": log.user_email,
            "user_role": log.user_role,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "description": log.description,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "ip_address": log.ip_address
        } for log in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })


# ========================================
# ANALYTICS ENDPOINTS
# ========================================

@admin_bp.route('/analytics/growth', methods=['GET'])
def get_growth_analytics():
    """Get user growth analytics over time"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    
    # Get days parameter (default 30)
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily user signups
    daily_signups = db.session.query(
        cast(User.created_at, Date).label('date'),
        func.count(User.id).label('count')
    ).filter(
        User.created_at >= start_date,
        User.deleted_at.is_(None)
    ).group_by(
        cast(User.created_at, Date)
    ).order_by('date').all()
    
    # Calculate cumulative
    cumulative = []
    total = User.query.filter(User.created_at < start_date, User.deleted_at.is_(None)).count()
    
    for date, count in daily_signups:
        total += count
        cumulative.append({
            "date": date.isoformat(),
            "new_users": count,
            "total_users": total
        })
    
    return jsonify({
        "period_days": days,
        "data": cumulative
    })


@admin_bp.route('/analytics/retention', methods=['GET'])
def get_retention_analytics():
    """Calculate user retention rate"""
    from datetime import datetime, timedelta
    
    # Users from 30 days ago
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    users_30d_ago = User.query.filter(
        User.created_at <= thirty_days_ago,
        User.deleted_at.is_(None)
    ).count()
    
    # Active users (logged in last 7 days)
    active_users = User.query.filter(
        User.created_at <= thirty_days_ago,
        User.last_login >= seven_days_ago,
        User.deleted_at.is_(None)
    ).count()
    
    retention_rate = (active_users / users_30d_ago * 100) if users_30d_ago > 0 else 0
    
    return jsonify({
        "users_30d_ago": users_30d_ago,
        "active_users": active_users,
        "retention_rate": round(retention_rate, 2),
        "period": "30_days"
    })


# ========================================
# ACHIEVEMENTS MANAGEMENT
# ========================================

@admin_bp.route('/achievements', methods=['GET'])
def list_achievements_admin():
    """List all achievements with unlock statistics"""
    from app.modules.gamification.domain.achievements import Achievement, UserAchievement
    from sqlalchemy import func
    
    achievements = Achievement.query.filter_by(is_active=True).all()
    
    result = []
    for ach in achievements:
        unlock_count = UserAchievement.query.filter_by(achievement_id=ach.id).count()
        
        result.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "tier": ach.tier,
            "icon": ach.icon,
            "points": ach.points,
            "unlock_count": unlock_count,
            "unlock_rate": round((unlock_count / User.query.filter(User.deleted_at.is_(None)).count() * 100), 2) if User.query.count() > 0 else 0
        })
    
    return jsonify({"achievements": result})


@admin_bp.route('/achievements', methods=['POST'])
def create_achievement_admin():
    """Create a new achievement"""
    from app.modules.gamification.domain.achievements import Achievement
    
    data = request.get_json()
    
    if not data.get('name') or not data.get('description'):
        return jsonify({"msg": "Name and description required"}), 400
    
    new_achievement = Achievement(
        name=data['name'],
        description=data['description'],
        tier=data.get('tier', 'bronze'),
        icon=data.get('icon', '🏆'),
        points=data.get('points', 10),
        criteria=data.get('criteria', {})
    )
    
    db.session.add(new_achievement)
    db.session.commit()
    
    return jsonify({
        "msg": "Achievement created",
        "id": new_achievement.id
    }), 201


@admin_bp.route('/achievements/<uuid:achievement_id>', methods=['PUT'])
def update_achievement_admin(achievement_id):
    """Update an achievement"""
    from app.modules.gamification.domain.achievements import Achievement
    
    achievement = Achievement.query.get_or_404(achievement_id)
    data = request.get_json()
    
    if 'name' in data:
        achievement.name = data['name']
    if 'description' in data:
        achievement.description = data['description']
    if 'tier' in data:
        achievement.tier = data['tier']
    if 'icon' in data:
        achievement.icon = data['icon']
    if 'points' in data:
        achievement.points = data['points']
    if 'criteria' in data:
        achievement.criteria = data['criteria']
    
    db.session.commit()
    
    return jsonify({"msg": "Achievement updated"}), 200


@admin_bp.route('/users/<uuid:user_id>/achievements/<uuid:achievement_id>', methods=['POST'])
def grant_achievement_to_user(user_id, achievement_id):
    """Manually grant an achievement to a user"""
    from app.modules.gamification.domain.achievements import Achievement, UserAchievement
    from app.modules.identity.domain.audit_log import AuditLog
    
    user = User.query.get_or_404(user_id)
    achievement = Achievement.query.get_or_404(achievement_id)
    
    # Check if already unlocked
    existing = UserAchievement.query.filter_by(
        user_id=user_id,
        achievement_id=achievement_id
    ).first()
    
    if existing:
        return jsonify({"msg": "Achievement already unlocked"}), 409
    
    # Grant achievement
    user_achievement = UserAchievement(
        user_id=user_id,
        achievement_id=achievement_id
    )
    
    db.session.add(user_achievement)
    
    # Log action
    current_admin = User.query.get(get_jwt_identity())
    AuditLog.log(
        user=current_admin,
        action='grant_achievement',
        resource_type='user_achievement',
        resource_id=user_id,
        description=f"Granted achievement '{achievement.name}' to {user.email}"
    )
    
    db.session.commit()
    
    return jsonify({"msg": "Achievement granted"}), 201
