import logging
import time
from app.modules.coach.infrastructure.gemini_service import GeminiService
from app.modules.training.domain.models import WorkoutPlan, WorkoutDay, Exercise
from app.modules.training.domain.exercise_library import ExerciseLibrary
from app.shared.extensions import db
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WorkoutGeneratorService:
    def __init__(self):
        self.gemini = GeminiService()

    def generate_workout_plan(self, user, profile):
        prompt, exercise_map = self._build_prompt(profile)
        
        ai_response = None
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                ai_response = self.gemini.generate_json(prompt)
                if ai_response:
                    break
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                time.sleep(1) # Backoff
        
        if not ai_response:
            logger.error("Failed to generate workout plan from AI after retries")
            raise Exception("Failed to generate workout plan from AI")
            
        return self._save_plan_to_db(user, ai_response, exercise_map)

    def _build_prompt(self, profile):
        # Filter exercises based on profile (basic filtering for now, can be expanded)
        # For simplicity and context limit, we might want to prioritize exercises
        # But for now let's just use all active ones to ensure variety, but mapped by ID
        query = ExerciseLibrary.query.filter_by(is_active=True)
        
        # Example simple filter: if beginner, maybe exclude 'advanced' (optional)
        # if profile.experience_level and 'beginner' in profile.experience_level.lower():
        #     query = query.filter(ExerciseLibrary.difficulty_level != 'advanced')
            
        available_exercises = query.all()
        
        # Create a map of Index -> (ID, Name) to send to AI
        exercise_map = {}
        exercises_list_parts = []
        
        for idx, ex in enumerate(available_exercises):
            # Using 1-based index for AI friendliness
            map_idx = idx + 1
            exercise_map[map_idx] = {'id': ex.id, 'name': ex.name, 'obj': ex}
            exercises_list_parts.append(f"{map_idx}. {ex.name} (Nível: {ex.difficulty_level}, Categoria: {ex.category})")
            
        exercises_list_str = "\n".join(exercises_list_parts)

        return f"""
        Você é um personal trainer profissional certificado. Crie um plano de treino personalizado com base nos seguintes dados do aluno:

        DADOS DO ALUNO:
        - Idade: {profile.age} anos
        - Gênero: {profile.gender}
        - Altura: {profile.height_cm} cm
        - Peso atual: {profile.current_weight_kg} kg
        - Peso meta: {profile.target_weight_kg} kg
        - Nível de atividade: {profile.activity_level}
        - Objetivo: {profile.fitness_goal}
        - Dias disponíveis: {profile.available_days}
        - Duração por treino: {profile.workout_duration_minutes} minutos
        - Equipamentos disponíveis: {profile.equipment_available}
        - Nível de Experiência: {profile.experience_level or "Não informado (assuma Iniciante)"}
        - Lesões/Limitações: {profile.injuries_limitations or "Nenhuma"}

        INSTRUÇÕES:
        1. Crie um plano de treino semanal otimizado para o objetivo do aluno
        2. Distribua os grupos musculares de forma equilibrada nos dias disponíveis
        3. Para cada exercício, especifique: ID da lista, séries, repetições, tempo de descanso
        4. Considere as limitações físicas mencionadas
        5. Adapte ao equipamento disponível
        6. IMPORTANTE: Mantenha 'reps' com menos de 50 caracteres (ex: '10-12' ou '3x15').
        7. CRÍTICO: USE APENAS EXERCÍCIOS DA LISTA ABAIXO. Retorne o 'exercise_id' correspondente ao número na lista.

        LISTA DE EXERCÍCIOS DISPONÍVEIS (Use o número como ID):
        {exercises_list_str}

        FORMATO DE RESPOSTA (JSON):
        {{
          "plan_name": "Nome do Plano",
          "plan_description": "Descrição do foco do plano",
          "workout_days": [
            {{
              "day_of_week": "monday",
              "name": "Treino A - Peito e Tríceps",
              "muscle_groups": ["chest", "triceps"],
              "exercises": [
                {{
                  "exercise_id": 12, 
                  "name_observation": "Supino Reto (apenas para referência)",
                  "sets": 4,
                  "reps": "8-12",
                  "rest_seconds": 90,
                  "notes": "Dica de execução"
                }}
              ]
            }}
          ],
          "recommendations": "Dicas gerais"
        }}
        """, exercise_map

    def _save_plan_to_db(self, user, data, exercise_map):
        # Deactivate old plans
        old_plans = WorkoutPlan.query.filter_by(user_id=user.id, is_active=True).all()
        for p in old_plans:
            p.is_active = False
            
        # Create new plan
        new_plan = WorkoutPlan(
            user_id=user.id,
            name=data.get('plan_name', 'Meu Plano de Treino')[:100],
            description=data.get('plan_description', '') + f"\n\nRecomendações: {data.get('recommendations', '')}",
            generated_by_ai=True,
            is_active=True,
            start_date=datetime.utcnow().date(),
            end_date=datetime.utcnow().date() + timedelta(weeks=12) # 12 week plan default
        )
        db.session.add(new_plan)
        db.session.flush() # Get ID
        
        # Add days and exercises
        for day_idx, day_data in enumerate(data.get('workout_days', [])):
            workout_day = WorkoutDay(
                workout_plan_id=new_plan.id,
                user_id=user.id,
                day_of_week=day_data.get('day_of_week'),
                name=day_data.get('name'),
                muscle_groups=day_data.get('muscle_groups', []),
                order=day_idx + 1
            )
            db.session.add(workout_day)
            db.session.flush()
            
            for ex_idx, ex_data in enumerate(day_data.get('exercises', [])):
                # Resolve Exercise from Map using ID
                ex_id = ex_data.get('exercise_id')
                mapped_ex = exercise_map.get(ex_id)
                
                lib_exercise = None
                exercise_name = "Exercício Desconhecido"
                
                if mapped_ex:
                    lib_exercise = mapped_ex['obj']
                    exercise_name = lib_exercise.name
                else:
                    # Fallback if AI hallucinates an ID or uses old format
                    if ex_data.get('name'):
                         exercise_name = ex_data.get('name')[:100] # Increased limit
                
                exercise = Exercise(
                    workout_day_id=workout_day.id,
                    user_id=user.id,
                    name=exercise_name,
                    exercise_library_id=lib_exercise.id if lib_exercise else None,
                    description=lib_exercise.description if lib_exercise else ex_data.get('description', ''),
                    sets=ex_data.get('sets'),
                    reps=str(ex_data.get('reps'))[:50] if ex_data.get('reps') else '10',
                    rest_seconds=ex_data.get('rest_seconds'),
                    order=ex_idx + 1,
                    notes=ex_data.get('notes')
                )
                db.session.add(exercise)
                
        db.session.commit()
        return new_plan
