from app.modules.identity.domain.models import User, UserProfile
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.training.domain.models import WorkoutPlan, WorkoutDay
from app.modules.nutrition.domain.models import Meal
from app.modules.nutrition.domain.hydration import HydrationLog
from datetime import datetime, timedelta
from sqlalchemy import func

class CoachContextService:
    
    @staticmethod
    def get_user_context(user_id):
        """
        Coleta todos os dados relevantes do usuário para o coach
        
        Returns:
            dict com user_info, metrics, workouts, nutrition, goals
        """
        user = User.query.get(user_id)
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        
        if not user or not profile:
            return {"error": "User not found"}
        
        # 1. Dados básicos
        user_info = {
            "name": user.name,
            "email": user.email,
            "age": profile.age,
            "gender": profile.gender,
            "height": profile.height_cm,
            "fitness_level": profile.experience_level
        }

        
        # 2. Métricas recentes
        metrics = CoachContextService._get_recent_metrics(user_id)
        
        # 3. Treinos
        workouts = CoachContextService._get_workout_status(user_id)
        
        # 4. Nutrição
        nutrition = CoachContextService._get_nutrition_status(user_id)
        
        # 5. Objetivos
        goals = {
            "fitness_goal": profile.fitness_goal,
            "target_weight": profile.target_weight_kg,
            "hydration_goal": 2500  # Default goal in ml
        }
        
        return {
            "user_id": str(user_id),
            "user_info": user_info,
            "metrics": metrics,
            "workouts": workouts,
            "nutrition": nutrition,
            "goals": goals
        }
    
    @staticmethod
    def _get_recent_metrics(user_id):
        """Pega métricas dos últimos 7 dias"""
        from app.shared.utils.timezone import get_today_cuiaba
        
        today = get_today_cuiaba()
        week_ago = today - timedelta(days=7)
        
        # Última métrica
        latest = BodyMetric.query.filter_by(
            user_id=user_id
        ).order_by(BodyMetric.recorded_at.desc()).first()
        
        # Métrica de 7 dias atrás
        old = BodyMetric.query.filter(
            BodyMetric.user_id == user_id,
            func.date(BodyMetric.recorded_at) <= week_ago
        ).order_by(BodyMetric.recorded_at.desc()).first()
        
        if not latest:
            return {}
        
        metrics = {
            "current_weight": latest.weight_kg,
            "body_fat": latest.body_fat_percentage,
            "muscle_mass": latest.muscle_mass_kg
        }
        
        # Calculate BMI if height is available
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if profile and profile.height_cm:
            height_m = profile.height_cm / 100
            metrics["bmi"] = round(latest.weight_kg / (height_m ** 2), 1)
        
        if old:
            metrics["weight_7d_ago"] = old.weight_kg
            metrics["weight_change"] = round(latest.weight_kg - old.weight_kg, 1)
        
        return metrics
    
    @staticmethod
    def _get_workout_status(user_id):
        """Status dos treinos da semana"""
        from app.modules.training.domain.models import WorkoutSession
        from app.shared.utils.timezone import get_today_cuiaba
        
        # Plano ativo
        plan = WorkoutPlan.query.filter_by(
            user_id=user_id,
            is_active=True
        ).first()
        
        if not plan:
            return {"planned": 0, "completed": 0}
        
        # Dias da semana no plano
        days = WorkoutDay.query.filter_by(workout_plan_id=plan.id).all()
        
        # Contar sessões completadas nos últimos 7 dias
        today = get_today_cuiaba()
        week_ago = today - timedelta(days=7)
        
        completed_sessions = WorkoutSession.query.filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == 'completed',
            func.date(WorkoutSession.completed_at) >= week_ago
        ).count()
        
        # Primeiro dia como sugestão de próximo treino
        next_workout = days[0].name if days else None
        
        return {
            "planned": len(days),
            "completed": completed_sessions,
            "next_workout": next_workout
        }
    
    @staticmethod
    def _get_nutrition_status(user_id):
        """Status nutricional de hoje"""
        from app.shared.utils.timezone import get_today_cuiaba
        
        today = get_today_cuiaba()
        
        # Refeições de hoje
        meals = Meal.query.filter(
            Meal.user_id == user_id,
            func.date(Meal.consumed_at) == today
        ).all()
        
        today_calories = sum(m.calories or 0 for m in meals)
        today_protein = sum(m.protein_g or 0 for m in meals)
        today_carbs = sum(m.carbs_g or 0 for m in meals)
        today_fats = sum(m.fat_g or 0 for m in meals)
        
        # Hidratação de hoje
        water_logs = HydrationLog.query.filter(
            HydrationLog.user_id == user_id,
            func.date(HydrationLog.logged_at) == today
        ).all()
        
        today_water = sum(log.amount_ml for log in water_logs)
        
        # Meta (pode vir do perfil ou ser calculado)
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        target_calories = 2000  # Default, pode calcular TDEE depois
        
        return {
            "today_calories": int(today_calories),
            "today_protein": int(today_protein),
            "today_carbs": int(today_carbs),
            "today_fats": int(today_fats),
            "today_water": today_water,
            "target_calories": target_calories
        }
