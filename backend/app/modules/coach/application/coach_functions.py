"""
Coach Function Calling Service

Provides executable functions for the AI Coach to perform actions
like logging meals, water, workouts, and fetching user data.
"""

from app.modules.nutrition.domain.models import Meal
from app.modules.nutrition.domain.hydration import HydrationLog
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.training.domain.models import WorkoutSession, WorkoutPlan, WorkoutDay, Exercise, ExerciseLog
from app.shared.extensions import db
from app.shared.utils.timezone import now_cuiaba, get_today_cuiaba
from datetime import timedelta
from sqlalchemy import func
import uuid


class CoachFunctions:
    """Executable functions for AI Coach"""
    
    # ==================== NUTRITION FUNCTIONS ====================
    
    @staticmethod
    def log_meal(user_id: str, name: str, calories: int, protein: int = 0, carbs: int = 0, fats: int = 0) -> dict:
        """
        Registra uma refeição com informações nutricionais
        
        Args:
            user_id: ID do usuário
            name: Nome da refeição
            calories: Calorias totais
            protein: Proteína em gramas
            carbs: Carboidratos em gramas
            fats: Gorduras em gramas
        """
        try:
            meal = Meal(
                user_id=uuid.UUID(user_id),
                name=name,
                calories=calories,
                protein_g=protein,
                carbs_g=carbs,
                fat_g=fats,
                consumed_at=now_cuiaba()
            )
            db.session.add(meal)
            db.session.commit()
            
            return {
                "success": True,
                "message": f"Refeição '{name}' registrada com sucesso!",
                "data": {
                    "calories": calories,
                    "protein": protein,
                    "carbs": carbs,
                    "fats": fats
                }
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_nutrition_summary(user_id: str, days: int = 1) -> dict:
        """
        Retorna resumo nutricional de um período
        
        Args:
            user_id: ID do usuário
            days: Número de dias (padrão: 1 para hoje)
        """
        try:
            today = get_today_cuiaba()
            start_date = today - timedelta(days=days-1)
            
            meals = Meal.query.filter(
                Meal.user_id == user_id,
                func.date(Meal.consumed_at) >= start_date,
                func.date(Meal.consumed_at) <= today
            ).all()
            
            total_calories = sum(m.calories or 0 for m in meals)
            total_protein = sum(m.protein_g or 0 for m in meals)
            total_carbs = sum(m.carbs_g or 0 for m in meals)
            total_fats = sum(m.fat_g or 0 for m in meals)
            
            avg_calories = total_calories / days if days > 0 else 0
            
            return {
                "success": True,
                "period_days": days,
                "total_meals": len(meals),
                "totals": {
                    "calories": total_calories,
                    "protein": total_protein,
                    "carbs": total_carbs,
                    "fats": total_fats
                },
                "averages": {
                    "calories_per_day": round(avg_calories, 1),
                    "protein_per_day": round(total_protein / days, 1) if days > 0 else 0,
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_calorie_breakdown(user_id: str, days: int = 7) -> dict:
        """
        Análise detalhada de calorias por período
        
        Args:
            user_id: ID do usuário
            days: Número de dias (padrão: 7)
        """
        try:
            today = get_today_cuiaba()
            start_date = today - timedelta(days=days-1)
            
            meals = Meal.query.filter(
                Meal.user_id == user_id,
                func.date(Meal.consumed_at) >= start_date,
                func.date(Meal.consumed_at) <= today
            ).all()
            
            # Agrupar por dia
            daily_calories = {}
            for meal in meals:
                day = meal.consumed_at.date().isoformat()
                if day not in daily_calories:
                    daily_calories[day] = 0
                daily_calories[day] += meal.calories or 0
            
            total = sum(daily_calories.values())
            avg = total / days if days > 0 else 0
            
            return {
                "success": True,
                "period_days": days,
                "total_calories": total,
                "average_per_day": round(avg, 1),
                "daily_breakdown": daily_calories,
                "highest_day": max(daily_calories.items(), key=lambda x: x[1]) if daily_calories else None,
                "lowest_day": min(daily_calories.items(), key=lambda x: x[1]) if daily_calories else None
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== HYDRATION FUNCTIONS ====================
    
    @staticmethod
    def log_water(user_id: str, amount_ml: int) -> dict:
        """
        Registra consumo de água
        
        Args:
            user_id: ID do usuário
            amount_ml: Quantidade em mililitros
        """
        try:
            log = HydrationLog(
                user_id=uuid.UUID(user_id),
                amount_ml=amount_ml,
                logged_at=now_cuiaba()
            )
            db.session.add(log)
            db.session.commit()
            
            # Calcular total do dia
            today = get_today_cuiaba()
            today_total = db.session.query(func.sum(HydrationLog.amount_ml)).filter(
                HydrationLog.user_id == user_id,
                func.date(HydrationLog.logged_at) == today
            ).scalar() or 0
            
            return {
                "success": True,
                "message": f"{amount_ml}ml de água registrados!",
                "today_total_ml": int(today_total),
                "goal_ml": 2500,
                "remaining_ml": max(0, 2500 - today_total)
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_hydration_status(user_id: str) -> dict:
        """
        Status de hidratação do dia atual
        
        Args:
            user_id: ID do usuário
        """
        try:
            today = get_today_cuiaba()
            logs = HydrationLog.query.filter(
                HydrationLog.user_id == user_id,
                func.date(HydrationLog.logged_at) == today
            ).all()
            
            total = sum(log.amount_ml for log in logs)
            goal = 2500
            percentage = round((total / goal) * 100, 1) if goal > 0 else 0
            
            return {
                "success": True,
                "total_ml": total,
                "goal_ml": goal,
                "remaining_ml": max(0, goal - total),
                "percentage": percentage,
                "logs_today": len(logs)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== WORKOUT FUNCTIONS ====================
    
    @staticmethod
    def start_workout_session(user_id: str, workout_day_id: str = None) -> dict:
        """
        Inicia uma nova sessão de treino
        
        Args:
            user_id: ID do usuário
            workout_day_id: ID do dia de treino (opcional)
        """
        try:
            # Se não forneceu workout_day_id, pega o primeiro do plano ativo
            if not workout_day_id:
                plan = WorkoutPlan.query.filter_by(
                    user_id=user_id,
                    is_active=True
                ).first()
                
                if not plan:
                    return {"success": False, "error": "Nenhum plano de treino ativo encontrado"}
                
                day = WorkoutDay.query.filter_by(
                    workout_plan_id=plan.id
                ).order_by(WorkoutDay.order).first()
                
                if not day:
                    return {"success": False, "error": "Nenhum dia de treino encontrado no plano"}
                
                workout_day_id = str(day.id)
            
            # Criar sessão
            session = WorkoutSession(
                user_id=uuid.UUID(user_id),
                workout_day_id=uuid.UUID(workout_day_id),
                status='in_progress',
                started_at=now_cuiaba()
            )
            db.session.add(session)
            db.session.commit()
            
            # Buscar exercícios do dia
            day = WorkoutDay.query.get(uuid.UUID(workout_day_id))
            exercises = Exercise.query.filter_by(workout_day_id=uuid.UUID(workout_day_id)).all()
            
            return {
                "success": True,
                "message": f"Treino '{day.name}' iniciado!",
                "session_id": str(session.id),
                "workout_name": day.name,
                "total_exercises": len(exercises)
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def log_exercise_set(user_id: str, exercise_name: str, reps: int, weight_kg: float = None) -> dict:
        """
        Registra uma série de exercício
        
        Args:
            user_id: ID do usuário
            exercise_name: Nome do exercício
            reps: Número de repetições
            weight_kg: Peso usado em kg (opcional)
        """
        try:
            # Buscar sessão ativa
            session = WorkoutSession.query.filter_by(
                user_id=user_id,
                status='in_progress'
            ).order_by(WorkoutSession.started_at.desc()).first()
            
            if not session:
                return {"success": False, "error": "Nenhuma sessão de treino ativa. Inicie um treino primeiro!"}
            
            # Buscar exercício pelo nome (aproximado)
            exercise = Exercise.query.filter(
                Exercise.workout_day_id == session.workout_day_id,
                Exercise.name.ilike(f"%{exercise_name}%")
            ).first()
            
            if not exercise:
                return {"success": False, "error": f"Exercício '{exercise_name}' não encontrado no treino atual"}
            
            # Contar quantas séries já foram feitas deste exercício
            set_number = ExerciseLog.query.filter_by(
                workout_session_id=session.id,
                exercise_id=exercise.id
            ).count() + 1
            
            # Registrar série
            log = ExerciseLog(
                workout_session_id=session.id,
                exercise_id=exercise.id,
                user_id=uuid.UUID(user_id),
                set_number=set_number,
                reps_done=reps,
                weight_used_kg=weight_kg,
                completed=True
            )
            db.session.add(log)
            db.session.commit()
            
            return {
                "success": True,
                "message": f"Série {set_number} de {exercise.name} registrada!",
                "exercise": exercise.name,
                "set_number": set_number,
                "reps": reps,
                "weight_kg": weight_kg
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_workout_progress(user_id: str, days: int = 30) -> dict:
        """
        Retorna estatísticas de treino
        
        Args:
            user_id: ID do usuário
            days: Período em dias (padrão: 30)
        """
        try:
            today = get_today_cuiaba()
            start_date = today - timedelta(days=days-1)
            
            sessions = WorkoutSession.query.filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == 'completed',
                func.date(WorkoutSession.completed_at) >= start_date
            ).all()
            
            total_sessions = len(sessions)
            total_duration = sum(s.total_duration_seconds or 0 for s in sessions)
            avg_duration = total_duration / total_sessions if total_sessions > 0 else 0
            
            # Calcular frequência semanal
            weekly_frequency = (total_sessions / days) * 7 if days > 0 else 0
            
            return {
                "success": True,
                "period_days": days,
                "total_workouts": total_sessions,
                "total_duration_minutes": round(total_duration / 60, 1),
                "average_duration_minutes": round(avg_duration / 60, 1),
                "weekly_frequency": round(weekly_frequency, 1)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== METRICS FUNCTIONS ====================
    
    @staticmethod
    def log_body_metric(user_id: str, weight_kg: float, body_fat_percentage: float = None, muscle_mass_kg: float = None) -> dict:
        """
        Registra medidas corporais
        
        Args:
            user_id: ID do usuário
            weight_kg: Peso em kg (obrigatório)
            body_fat_percentage: % de gordura (opcional)
            muscle_mass_kg: Massa muscular em kg (opcional)
        """
        try:
            metric = BodyMetric(
                user_id=uuid.UUID(user_id),
                weight_kg=weight_kg,
                body_fat_percentage=body_fat_percentage,
                muscle_mass_kg=muscle_mass_kg,
                recorded_at=now_cuiaba()
            )
            db.session.add(metric)
            db.session.commit()
            
            # Buscar métrica anterior para comparação
            previous = BodyMetric.query.filter(
                BodyMetric.user_id == user_id,
                BodyMetric.id != metric.id
            ).order_by(BodyMetric.recorded_at.desc()).first()
            
            weight_change = None
            if previous:
                weight_change = round(weight_kg - previous.weight_kg, 1)
            
            return {
                "success": True,
                "message": "Medidas registradas com sucesso!",
                "weight_kg": weight_kg,
                "body_fat_percentage": body_fat_percentage,
                "muscle_mass_kg": muscle_mass_kg,
                "weight_change_kg": weight_change
            }
        except Exception as e:
            db.session.rollback()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_progress_report(user_id: str, days: int = 30) -> dict:
        """
        Relatório completo de progresso
        
        Args:
            user_id: ID do usuário
            days: Período em dias (padrão: 30)
        """
        try:
            today = get_today_cuiaba()
            start_date = today - timedelta(days=days-1)
            
            # Métricas corporais
            latest_metric = BodyMetric.query.filter_by(
                user_id=user_id
            ).order_by(BodyMetric.recorded_at.desc()).first()
            
            oldest_metric = BodyMetric.query.filter(
                BodyMetric.user_id == user_id,
                func.date(BodyMetric.recorded_at) >= start_date
            ).order_by(BodyMetric.recorded_at.asc()).first()
            
            weight_change = None
            if latest_metric and oldest_metric:
                weight_change = round(latest_metric.weight_kg - oldest_metric.weight_kg, 1)
            
            # Treinos
            workouts = WorkoutSession.query.filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == 'completed',
                func.date(WorkoutSession.completed_at) >= start_date
            ).count()
            
            # Nutrição
            meals = Meal.query.filter(
                Meal.user_id == user_id,
                func.date(Meal.consumed_at) >= start_date
            ).all()
            
            avg_calories = sum(m.calories or 0 for m in meals) / days if days > 0 else 0
            
            return {
                "success": True,
                "period_days": days,
                "body_metrics": {
                    "current_weight_kg": latest_metric.weight_kg if latest_metric else None,
                    "weight_change_kg": weight_change,
                    "body_fat_percentage": latest_metric.body_fat_percentage if latest_metric else None
                },
                "workouts": {
                    "total_completed": workouts,
                    "weekly_average": round((workouts / days) * 7, 1) if days > 0 else 0
                },
                "nutrition": {
                    "average_calories_per_day": round(avg_calories, 1),
                    "total_meals_logged": len(meals)
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


import google.generativeai as genai

# ==================== FUNCTION DECLARATIONS FOR GEMINI ====================

COACH_FUNCTION_DECLARATIONS = [
    genai.protos.FunctionDeclaration(
        name="log_meal",
        description="Registra uma refeição com informações nutricionais. IMPORTANTE: Quando o usuário mencionar um alimento (ex: 'comi uma banana'), você deve ESTIMAR automaticamente as calorias, proteínas, carboidratos e gorduras baseado no conhecimento nutricional padrão desse alimento e quantidade mencionada. Não peça ao usuário para fornecer esses valores. Faça a estimativa você mesmo e registre.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "name": genai.protos.Schema(type=genai.protos.Type.STRING, description="Nome da refeição ou alimento mencionado pelo usuário"),
                "calories": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Calorias totais ESTIMADAS por você baseado no alimento e quantidade"),
                "protein": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Proteína em gramas ESTIMADA por você"),
                "carbs": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Carboidratos em gramas ESTIMADOS por você"),
                "fats": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Gorduras em gramas ESTIMADAS por você")
            },
            required=["name", "calories", "protein", "carbs", "fats"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_nutrition_summary",
        description="Retorna resumo nutricional de um período. Use quando usuário perguntar sobre calorias, macros ou resumo do dia/semana.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Número de dias (1=hoje, 7=semana)")
            }
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_calorie_breakdown",
        description="Análise detalhada de calorias por dia. Use para mostrar tendências de consumo.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Número de dias para análise")
            }
        )
    ),
    genai.protos.FunctionDeclaration(
        name="log_water",
        description="Registra consumo de água. IMPORTANTE: Quando o usuário mencionar que bebeu água, você deve ESTIMAR automaticamente a quantidade em mililitros. Estimativas comuns: copo americano = 190ml, garrafa 500ml, copo 200ml, garrafa 1L = 1000ml, etc. Não peça ao usuário a quantidade em ml, estime você mesmo.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "amount_ml": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Quantidade de água em mililitros ESTIMADA por você baseado no que o usuário mencionou")
            },
            required=["amount_ml"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_hydration_status",
        description="Retorna status de hidratação do dia atual.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={}
        )
    ),
    genai.protos.FunctionDeclaration(
        name="start_workout_session",
        description="Inicia uma nova sessão de treino. Use quando usuário disser que vai começar a treinar.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "workout_day_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="ID do dia de treino (opcional)")
            }
        )
    ),
    genai.protos.FunctionDeclaration(
        name="log_exercise_set",
        description="Registra uma série de exercício. Use quando usuário disser que fez X repetições de um exercício.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "exercise_name": genai.protos.Schema(type=genai.protos.Type.STRING, description="Nome do exercício"),
                "reps": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Número de repetições"),
                "weight_kg": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Carga em kg (opcional)")
            },
            required=["exercise_name", "reps"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_workout_progress",
        description="Estatísticas de treino (frequência, volume).",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Período em dias")
            }
        )
    ),
    genai.protos.FunctionDeclaration(
        name="log_body_metric",
        description="Registra medidas corporais (peso, gordura). Use quando usuário informar novo peso.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "weight_kg": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Peso em kg"),
                "body_fat_percentage": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="% de gordura (opcional)"),
                "muscle_mass_kg": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Massa muscular kg (opcional)")
            },
            required=["weight_kg"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_progress_report",
        description="Relatório geral de progresso (peso, treinos, dieta).",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Período em dias")
            }
        )
    )
]

