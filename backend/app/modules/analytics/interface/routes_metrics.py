from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.nutrition.domain.models import Meal
from app.modules.nutrition.domain.hydration import HydrationLog, HydrationGoal
from app.modules.nutrition.domain.diet import DietPreference
from app.modules.identity.domain.models import UserProfile
from app.modules.training.domain.models import WorkoutSession
from app.modules.gamification.domain.achievements import UserAchievement
from app.modules.gamification.application.service import GamificationService
from app.modules.analytics.application.metrics_service import MetricsService
from datetime import datetime, timedelta
from sqlalchemy import func

metrics_bp = Blueprint('metrics', __name__)

@metrics_bp.route('/log', methods=['POST'])
@jwt_required()
def log_metrics():
    """
    Log new metrics
    ---
    tags:
      - Metrics
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            weight_kg:
              type: number
            body_fat_percentage:
              type: number
            muscle_mass_kg:
              type: number
            waist_cm:
              type: number
    responses:
      201:
        description: Metrics logged
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        metric = MetricsService.log_metric(user_id, data)
        return jsonify({"msg": "Metrics logged", "id": metric.id}), 201
    except Exception as e:
        return jsonify({"msg": "Error logging metrics", "error": str(e)}), 500

@metrics_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """
    Get metrics history
    ---
    tags:
      - Metrics
    parameters:
      - in: query
        name: type
        type: string
        enum: [weight, fat, muscle]
        default: weight
      - in: query
        name: limit
        type: integer
        default: 30
    responses:
      200:
        description: List of historical data points
    """
    user_id = get_jwt_identity()
    metric_type = request.args.get('type', 'weight') # weight, fat, muscle
    limit = int(request.args.get('limit', 30))
    
    data = MetricsService.get_history(user_id, metric_type, limit)
             
    return jsonify(data), 200



@metrics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    """
    Get dashboard summary metrics
    ---
    tags:
      - Metrics
    responses:
      200:
        description: A comprehensive summary of user metrics
    """
    user_id = get_jwt_identity()
    # Fix: Use Cuiabá Timezone for "Today" to match Meal logs
    from app.shared.utils.timezone import get_today_cuiaba
    today = get_today_cuiaba()
    
    # 1. Profile Info (Weight Progress or Goals)
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    weight_info = {
        "current": profile.current_weight_kg if profile else 0,
        "target": profile.target_weight_kg if profile else 0,
    }
    
    # 2. Workout Consistency (Last 7 days)
    week_ago = today - timedelta(days=7)
    
    workouts_last_week = WorkoutSession.query.filter(
        WorkoutSession.user_id == user_id,
        WorkoutSession.started_at >= week_ago,
        WorkoutSession.status == 'completed' # Only count finished
    ).count()
    
    # 3. Centralized Streak Logic
    # No more manual calculation! Using the robust UserStreak model.
    from app.modules.gamification.domain.user_streak import UserStreak
    streak_record = UserStreak.query.filter_by(user_id=user_id).first()
    
    current_streak = streak_record.current_workout_streak if streak_record else 0

    # 4. Recent Achievements
    recent_achievements = UserAchievement.query.filter_by(user_id=user_id)\
        .order_by(UserAchievement.unlocked_at.desc()).limit(3).all()
        
    achievements_data = [{
        "name": ua.achievement.name,
        "date": ua.unlocked_at.strftime("%Y-%m-%d")
    } for ua in recent_achievements]
    
    # 5. Gamification (Level/XP)
    current_xp = profile.xp if profile and profile.xp else 0
    level = GamificationService.calculate_level(current_xp)
    
    # 6. Nutrition (Calories Today)
    # Get calorie goal from DietPreference or default
    diet_pref = DietPreference.query.filter_by(user_id=user_id).first()
    calorie_goal = diet_pref.calorie_goal if diet_pref and diet_pref.calorie_goal else 2000
    
    # Sum calories from meals today
    today_calories = db.session.query(func.sum(Meal.calories)).filter(
        Meal.user_id == user_id,
        func.date(Meal.consumed_at) == today
    ).scalar() or 0
    
    # 7. Hydration (Water Today)
    # Get hydration goal
    hyd_goal_obj = HydrationGoal.query.filter_by(user_id=user_id).first()
    hydration_goal = hyd_goal_obj.daily_goal_ml if hyd_goal_obj else 2500
    
    # Sum hydration logs today
    today_hydration = db.session.query(func.sum(HydrationLog.amount_ml)).filter(
        HydrationLog.user_id == user_id,
        func.date(HydrationLog.logged_at) == today
    ).scalar() or 0
    
    # 8. Workout Volume (Total weight × reps × sets this week vs last week)
    # This week
    this_week_start = today - timedelta(days=today.weekday())
    
    # Calculate volume from ExerciseLog (actual performed exercises)
    from app.modules.training.domain.models import ExerciseLog
    
    this_week_logs = db.session.query(
        func.sum(ExerciseLog.weight_used_kg * ExerciseLog.reps_done)
    ).join(
        WorkoutSession,
        ExerciseLog.workout_session_id == WorkoutSession.id
    ).filter(
        ExerciseLog.user_id == user_id,
        WorkoutSession.status == 'completed',
        func.date(WorkoutSession.started_at) >= this_week_start,
        func.date(WorkoutSession.started_at) <= today
    ).scalar() or 0
    
    # Last week
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)
    
    last_week_logs = db.session.query(
        func.sum(ExerciseLog.weight_used_kg * ExerciseLog.reps_done)
    ).join(
        WorkoutSession,
        ExerciseLog.workout_session_id == WorkoutSession.id
    ).filter(
        ExerciseLog.user_id == user_id,
        WorkoutSession.status == 'completed',
        func.date(WorkoutSession.started_at) >= last_week_start,
        func.date(WorkoutSession.started_at) <= last_week_end
    ).scalar() or 0
    
    # Calculate percentage change
    volume_change_percentage = 0
    if last_week_logs > 0:
        volume_change_percentage = ((this_week_logs - last_week_logs) / last_week_logs) * 100
    elif this_week_logs > 0:
        volume_change_percentage = 100  # First week, show 100% increase
    
    return jsonify({
        "weight": weight_info,
        "consistency": {
            "workouts_last_7_days": workouts_last_week,
            "current_streak": current_streak
        },
        "achievements": achievements_data,
        "level": level,
        "xp": current_xp,
        "nutrition": {
            "calories": int(today_calories),
            "goal": calorie_goal
        },
        "hydration": {
            "consumed_ml": int(today_hydration),
            "goal_ml": hydration_goal
        },
        "workout_volume": {
            "volume_kg": round(this_week_logs, 1),
            "change_percentage": round(volume_change_percentage, 1)
        }
    }), 200
