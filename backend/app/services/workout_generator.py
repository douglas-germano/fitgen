from app.services.gemini_service import GeminiService
from app.models.workout import WorkoutPlan, WorkoutDay, Exercise
from app.models.exercise_library import ExerciseLibrary
from app.extensions import db
from datetime import datetime, timedelta

class WorkoutGeneratorService:
    def __init__(self):
        self.gemini = GeminiService()

    def generate_workout_plan(self, user, profile):
        prompt = self._build_prompt(profile)
        
        ai_response = self.gemini.generate_json(prompt)
        
        if not ai_response:
            raise Exception("Failed to generate workout plan from AI")
            
        return self._save_plan_to_db(user, ai_response)

    def _build_prompt(self, profile):
        # Fetch available exercises
        available_exercises = [ex.name for ex in ExerciseLibrary.query.filter_by(is_active=True).all()]
        exercises_list_str = "\n".join([f"- {name}" for name in available_exercises])

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
        3. Para cada exercício, especifique: nome, séries, repetições, tempo de descanso
        4. Considere as limitações físicas mencionadas
        5. Adapte ao equipamento disponível
        6. IMPORTANTE: Mantenha o 'name' do exercício com menos de 50 caracteres.
        7. IMPORTANTE: Mantenha 'reps' com menos de 50 caracteres (ex: '10-12' ou '3x15').
        8. CRÍTICO: USE APENAS EXERCÍCIOS DA LISTA ABAIXO. NÃO INVENTE NOMES. SE O EXERCÍCIO NÃO ESTIVER NA LISTA, ESCOLHA UM SIMILAR DA LISTA.
        
        LISTA DE EXERCÍCIOS PERMITIDOS:
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
                  "name": "Supino Reto com Barra",
                  "description": "Deite no banco...",
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
        """

    def _save_plan_to_db(self, user, data):
        # Deactivate old plans
        old_plans = WorkoutPlan.query.filter_by(user_id=user.id, is_active=True).all()
        for p in old_plans:
            p.is_active = False
            
        # Create new plan
        new_plan = WorkoutPlan(
            user_id=user.id,
            name=data.get('plan_name', 'Meu Plano de Treino'),
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
                # Find library ID if exists
                lib_exercise = ExerciseLibrary.query.filter(ExerciseLibrary.name.ilike(ex_data.get('name'))).first()
                
                exercise = Exercise(
                    workout_day_id=workout_day.id,
                    user_id=user.id,
                    name=lib_exercise.name if lib_exercise else (ex_data.get('name')[:50] if ex_data.get('name') else 'Exercise'),
                    exercise_library_id=lib_exercise.id if lib_exercise else None,
                    description=lib_exercise.description if lib_exercise else ex_data.get('description'),
                    sets=ex_data.get('sets'),
                    reps=str(ex_data.get('reps'))[:50] if ex_data.get('reps') else '10',
                    rest_seconds=ex_data.get('rest_seconds'),
                    order=ex_idx + 1,
                    notes=ex_data.get('notes')
                )
                db.session.add(exercise)
                
        db.session.commit()
        return new_plan
