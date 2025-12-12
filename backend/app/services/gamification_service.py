from datetime import datetime, timedelta
from app.extensions import db
from app.models.user import UserProfile
from app.models.user_streak import UserStreak
from app.models.achievements import Achievement, UserAchievement

class GamificationService:
    # XP Constants
    XP_WORKOUT_COMPLETE = 100
    XP_MEAL_LOG = 10
    XP_HYDRATION_LOG = 5
    
    @staticmethod
    def handle_activity(user_id, activity_type, **kwargs):
        """
        Centralized method to handle gamification events.
        activity_type: 'workout_finish', 'meal_log', 'hydration_log'
        kwargs: extra params like 'is_goal_met' for hydration
        """
        if activity_type == 'workout_finish':
            GamificationService.update_streak(user_id, 'workout')
            GamificationService.award_xp(user_id, GamificationService.XP_WORKOUT_COMPLETE, "Workout Completed")
            
        elif activity_type == 'meal_log':
            GamificationService.update_streak(user_id, 'nutrition')
            GamificationService.award_xp(user_id, GamificationService.XP_MEAL_LOG, "Meal Logged")
            
        elif activity_type == 'hydration_log':
            # Always award XP for logging water
            GamificationService.award_xp(user_id, GamificationService.XP_HYDRATION_LOG, "Hydration Log")
            
            # Only update streak if goal is met
            if kwargs.get('is_goal_met', False):
                GamificationService.update_streak(user_id, 'hydration')

    @staticmethod
    def update_streak(user_id, category):
        """
        Updates the user's streak for a given category (workout, nutrition, hydration).
        category: 'workout', 'nutrition', or 'hydration'
        """
        streak_record = UserStreak.query.filter_by(user_id=user_id).first()
        
        if not streak_record:
            streak_record = UserStreak(user_id=user_id)
            db.session.add(streak_record)
        
        # Use BRT Timezone for consistency with other services
        from app.utils.timezone import get_today_cuiaba
        today = get_today_cuiaba()
        
        # Map category to dynamic fields
        if category == 'workout':
            last_date_attr = 'last_workout_date'
            current_streak_attr = 'current_workout_streak'
            longest_streak_attr = 'longest_workout_streak'
        elif category == 'nutrition':
            last_date_attr = 'last_nutrition_log_date'
            current_streak_attr = 'current_nutrition_streak'
            longest_streak_attr = 'longest_nutrition_streak'
        elif category == 'hydration':
            last_date_attr = 'last_hydration_date'
            current_streak_attr = 'current_hydration_streak'
            longest_streak_attr = 'longest_hydration_streak'
        else:
            return None

        last_date = getattr(streak_record, last_date_attr)
        current_streak = getattr(streak_record, current_streak_attr)
        
        new_streak = current_streak

        if last_date == today:
            # Already active today, do nothing
            pass
        elif last_date == today - timedelta(days=1):
            # Consecutive day, increment
            new_streak += 1
            setattr(streak_record, current_streak_attr, new_streak)
            setattr(streak_record, last_date_attr, today)
        else:
            # Streak broken or first time
            new_streak = 1
            setattr(streak_record, current_streak_attr, 1)
            setattr(streak_record, last_date_attr, today)
            
        # Check longest
        longest = getattr(streak_record, longest_streak_attr)
        if new_streak > longest:
            setattr(streak_record, longest_streak_attr, new_streak)
            
        db.session.commit()
        
        # Check for streak achievements (e.g. 3 days, 7 days, 30 days)
        GamificationService.check_streak_achievements(user_id, category, new_streak)
        
        return new_streak

    @staticmethod
    def check_streak_achievements(user_id, category, streak_count):
        # Basic milestones
        milestones = [3, 7, 14, 30, 90]
        
        if streak_count in milestones:
            # Construct achievement codename, e.g., "workout_streak_7"
            code = f"{category}_streak_{streak_count}"
            
            # Find or create mostly to ensure we don't crash, 
            # in real app these should be seeded
            ach = Achievement.query.filter_by(code=code).first()
            if ach:
                existing = UserAchievement.query.filter_by(user_id=user_id, achievement_id=ach.id).first()
                if not existing:
                    from app.utils.timezone import now_cuiaba
                    ua = UserAchievement(user_id=user_id, achievement_id=ach.id, unlocked_at=now_cuiaba())
                    db.session.add(ua)
                    db.session.commit()
                    
                    # Award XP for achievement
                    GamificationService.award_xp(user_id, 50 * (streak_count // 3), f"Achievement: {ach.name}")

    @staticmethod
    def calculate_level(xp):
        # Simple formula: Level = sqrt(XP) * 0.1 or just XP / 100
        # Let's use: Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc.
        current_xp = xp or 0
        return int(current_xp / 100) + 1

    @staticmethod
    def award_xp(user_id, amount, reason="Activity"):
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            return None
        
        if profile.xp is None:
            profile.xp = 0
            
        old_level = GamificationService.calculate_level(profile.xp)
        profile.xp += amount
        new_level = GamificationService.calculate_level(profile.xp)
        
        # Check for level up
        level_up = new_level > old_level
        profile.level = new_level
        
        db.session.commit()
        
        return {
            "new_xp": profile.xp,
            "level": new_level,
            "level_up": level_up,
            "gained": amount
        }

    @staticmethod
    def check_achievements(user_id, event_type):
        # This would be more complex in real app, checking specific conditions
        # For now, we just grant a 'First Step' achievement if not exists
        if event_type == 'first_workout':
            ach = Achievement.query.filter_by(name='Primeiro Passo').first()
            if ach:
                existing = UserAchievement.query.filter_by(user_id=user_id, achievement_id=ach.id).first()
                if not existing:
                    from app.utils.timezone import now_cuiaba
                    ua = UserAchievement(user_id=user_id, achievement_id=ach.id, unlocked_at=now_cuiaba())
                    db.session.add(ua)
                    db.session.commit()
                    return ach.name
        return None
