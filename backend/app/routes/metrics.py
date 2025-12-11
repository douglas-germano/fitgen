from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.body_metrics import BodyMetric
from app.models.user import UserProfile
from app.models.workout import WorkoutSession
from app.models.achievements import UserAchievement
from app.services.gamification_service import GamificationService
from app.services.metrics_service import MetricsService
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

from app.models.nutrition import Meal
from app.models.hydration import HydrationLog, HydrationGoal
from app.models.diet import DietPreference

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
    from app.utils.timezone import get_today_cuiaba
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
    from app.models.user_streak import UserStreak
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
        }
    }), 200
