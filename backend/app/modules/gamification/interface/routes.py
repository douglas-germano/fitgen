from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc
from app.modules.identity.domain.models import UserProfile, User
from app.modules.gamification.domain.achievements import UserAchievement, Achievement
from app.modules.gamification.domain.user_streak import UserStreak
from app.modules.gamification.application.service import GamificationService

gamification_bp = Blueprint('gamification', __name__)

@gamification_bp.route('/streaks', methods=['GET'])
@jwt_required()
def get_streaks():
    """
    Get the current user's streaks
    ---
    tags:
      - Gamification
    responses:
      200:
        description: User streaks data
    """
    user_id = get_jwt_identity()
    streaks = UserStreak.query.filter_by(user_id=user_id).first()
    
    if not streaks:
        return jsonify({
            "workout_streak": 0,
            "nutrition_streak": 0,
            "hydration_streak": 0
        }), 200
        
    return jsonify({
        "workout_streak": streaks.current_workout_streak,
        "nutrition_streak": streaks.current_nutrition_streak,
        "hydration_streak": streaks.current_hydration_streak
    }), 200

@gamification_bp.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """
    Get gamification progress (XP, level)
    ---
    tags:
      - Gamification
    responses:
      200:
        description: User progress data
      404:
        description: Profile not found
    """
    user_id = get_jwt_identity()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
        
    current_xp = profile.xp or 0
    current_level = GamificationService.calculate_level(current_xp)
    next_level_xp = (current_level) * 100
    
    return jsonify({
        "xp": current_xp,
        "level": current_level,
        "next_level_xp": next_level_xp,
        "progress_percent": (current_xp % 100) # Simple % for 100xp levels
    }), 200

@gamification_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """
    Get user achievements
    ---
    tags:
      - Gamification
    responses:
      200:
        description: List of achievements
    """
    user_id = get_jwt_identity()
    
    # Get all achievements
    all_achievements = Achievement.query.all()
    
    # Get user's unlocked achievements
    user_unlocks = UserAchievement.query.filter_by(user_id=user_id).all()
    unlocked_ids = {ua.achievement_id for ua in user_unlocks}
    
    result = []
    for ach in all_achievements:
        unlocked_ua = next((ua for ua in user_unlocks if ua.achievement_id == ach.id), None)
        result.append({
            "id": str(ach.id),
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon,
            "category": ach.category,
            "unlocked": ach.id in unlocked_ids,
            "unlocked_at": unlocked_ua.unlocked_at.isoformat() if unlocked_ua else None
        })
        
    return jsonify(result), 200

@gamification_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    """
    Get top users leaderboard
    ---
    tags:
      - Gamification
    responses:
      200:
        description: Leaderboard data
    """
    # Query users with their profiles, ordered by level (DESC) and XP (DESC)
    # Count achievements for each user
    leaderboard_query = (
        User.query
        .join(UserProfile, User.id == UserProfile.user_id)
        .outerjoin(UserAchievement, User.id == UserAchievement.user_id)
        .filter(User.is_active == True)
        .filter(User.deleted_at.is_(None))
        .group_by(User.id, UserProfile.id)
        .order_by(desc(UserProfile.level), desc(UserProfile.xp))
        .limit(100)
        .add_columns(
            User.id,
            User.name,
            User.profile_picture,
            UserProfile.level,
            UserProfile.xp,
            func.count(UserAchievement.id).label('medals_count')
        )
    )
    
    results = leaderboard_query.all()
    
    leaderboard = []
    for idx, row in enumerate(results, start=1):
        leaderboard.append({
            "rank": idx,
            "user_id": str(row.id),
            "name": row.name,
            "profile_picture": row.profile_picture,
            "level": row.level or 1,
            "medals_count": row.medals_count
        })
    
    return jsonify(leaderboard), 200

# Dev-only endpoint to test XP
@gamification_bp.route('/debug/award-xp', methods=['POST'])
@jwt_required()
def debug_award_xp():
    """
    Debug: Award XP manually
    ---
    tags:
      - Gamification
    responses:
      200:
        description: XP awarded
    """
    user_id = get_jwt_identity()
    result = GamificationService.award_xp(user_id, 50, "Debug Award")
    return jsonify(result), 200
