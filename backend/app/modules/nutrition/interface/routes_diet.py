from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db, cache
from app.modules.nutrition.domain.diet import DietPreference, DietPlan
from app.modules.coach.infrastructure.gemini_service import GeminiService
from datetime import datetime
import uuid
import json


def make_cache_key(*args, **kwargs):
    """Create a unique cache key based on user ID"""
    user_id = get_jwt_identity()
    return f"diet_plan:{user_id}"

diet_bp = Blueprint('diet', __name__)

@diet_bp.route('/onboarding', methods=['POST'])
@jwt_required()
def save_diet_preferences():
    """
    Save user's diet onboarding preferences
    ---
    tags:
      - Diet
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
             goal:
               type: string
             restrictions:
               type: array
               items:
                 type: string
             allergies:
               type: string
             budget:
               type: string
             meals_per_day:
               type: integer
             calorie_goal:
               type: integer
    responses:
      201:
        description: Preferences saved
      400:
        description: Missing data
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "Missing data"}), 400
    
    # Check if preferences already exist
    existing = DietPreference.query.filter_by(user_id=user_id).first()
    
    if existing:
        # Update existing
        existing.goal = data.get('goal')
        existing.restrictions = data.get('restrictions', [])
        existing.allergies = data.get('allergies', '')
        existing.budget = data.get('budget')
        existing.ingredient_access = data.get('ingredient_access')
        existing.meals_per_day = data.get('meals_per_day')
        existing.cooks_at_home = data.get('cooks_at_home')
        existing.prep_time = data.get('prep_time')
        existing.dislikes = data.get('dislikes', '')
        existing.calorie_goal = data.get('calorie_goal')
        existing.updated_at = datetime.utcnow()
        
        pref = existing
    else:
        # Create new
        pref = DietPreference(
            user_id=user_id,
            goal=data.get('goal'),
            restrictions=data.get('restrictions', []),
            allergies=data.get('allergies', ''),
            budget=data.get('budget'),
            ingredient_access=data.get('ingredient_access'),
            meals_per_day=data.get('meals_per_day'),
            cooks_at_home=data.get('cooks_at_home'),
            prep_time=data.get('prep_time'),
            dislikes=data.get('dislikes', ''),
            calorie_goal=data.get('calorie_goal')
        )
        db.session.add(pref)
    
    try:
        db.session.commit()
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving diet preferences: {str(e)}")
        return jsonify({"msg": "Database error", "details": str(e)}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error saving diet preferences: {str(e)}")
        return jsonify({"msg": "An unexpected error occurred"}), 500
    
    return jsonify({
        "msg": "Preferences saved",
        "id": str(pref.id)
    }), 201


@diet_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_diet_plan():
    """
    Generate personalized diet plan using Gemini AI
    ---
    tags:
      - Diet
    responses:
      201:
        description: Diet plan generated successfully
      400:
        description: Complete diet onboarding first
      500:
        description: Generation failed
    """
    user_id = uuid.UUID(get_jwt_identity())
    
    # Get user preferences
    pref = DietPreference.query.filter_by(user_id=user_id).first()
    
    if not pref:
        return jsonify({"msg": "Complete diet onboarding first"}), 400
    
    try:
        gemini = GeminiService()
        
        # Build context-aware prompt
        goal_map = {
            'emagrecimento': 'perder peso de forma saudável',
            'ganho_massa': 'ganhar massa muscular',
            'manutencao': 'manter o peso atual',
            'saude': 'melhorar a saúde geral'
        }
        
        budget_map = {
            'ate_300': 'até R$ 300/mês (muito econômico)',
            '300_500': 'R$ 300-500/mês (econômico)',
            '500_800': 'R$ 500-800/mês (moderado)',
            'acima_800': 'acima de R$ 800/mês'
        }
        
        ingredient_map = {
            'basicos': 'APENAS ingredientes básicos e muito baratos: arroz, feijão, frango, ovos, batata, cenoura, tomate, banana, laranja',
            'intermediarios': 'ingredientes intermediários incluindo carnes variadas e grãos especiais',
            'sofisticados': 'ingredientes sofisticados como importados, orgânicos e especiarias raras'
        }
        
        prep_time_map = {
            'menos_15': 'menos de 15 minutos',
            '15_30': '15-30 minutos',
            '30_60': '30-60 minutos',
            'mais_60': 'mais de 1 hora'
        }
        
        prompt = f"""Você é um nutricionista especializado em dietas acessíveis para brasileiros.

Crie um plano alimentar SEMANAL (7 dias) para uma pessoa com as seguintes características:

**OBJETIVO:** {goal_map.get(pref.goal, pref.goal)}
**ORÇAMENTO:** {budget_map.get(pref.budget, pref.budget)}
**INGREDIENTES DISPONÍVEIS:** {ingredient_map.get(pref.ingredient_access, pref.ingredient_access)}
**RESTRIÇÕES:** {', '.join(pref.restrictions) if pref.restrictions else 'Nenhuma'}
**ALERGIAS:** {pref.allergies if pref.allergies else 'Nenhuma'}
**ALIMENTOS QUE NÃO GOSTA:** {pref.dislikes if pref.dislikes else 'Nenhum'}
**REFEIÇÕES POR DIA:** {pref.meals_per_day}
**TEMPO DE PREPARO:** {prep_time_map.get(pref.prep_time, pref.prep_time)}
**META DE CALORIAS:** {pref.calorie_goal} kcal/dia

REGRAS IMPORTANTES:
1. Use APENAS ingredientes típicos brasileiros
2. Se orçamento for baixo, priorize: arroz, feijão, frango, ovos, batata, banana
3. Receitas devem ser MUITO SIMPLES de fazer
4. Inclua preços aproximados (em R$)
5. Seja realista com o orçamento

Retorne APENAS um JSON válido com esta estrutura:
{{
  "weekly_plan": {{
    "segunda": {{
      "cafe": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}},
      "almoco": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}},
      "jantar": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}}
    }},
    ... (todos os 7 dias)
  }},
  "shopping_list": [
    {{"item": "Arroz", "quantidade": "5kg", "preco_aprox": 25}}
  ],
  "macro_targets": {{
    "protein": 150,
    "carbs": 200,
    "fats": 50
  }},
  "total_cost_week": 150
}}"""

        response = gemini.model.generate_content(prompt)
        response_text = response.text.strip()
        
        print(f"Diet plan response: {response_text[:500]}")  # Debug
        
        # Robust JSON extraction
        try:
            # Find the first '{' and the last '}'
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx+1]
                plan_data = json.loads(json_str)
            else:
                # Fallback if no braces found (unlikely but possible)
                plan_data = json.loads(response_text)
                
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Raw Text: {response_text}")
            return jsonify({"msg": "Failed to parse AI response"}), 500

        # Normalize keys in weekly_plan to ensure frontend compatibility
        if 'weekly_plan' in plan_data:
            normalized_weekly = {}
            normalization_map = {
                'segunda': ['segunda', 'mon', 'monday', 'seg'],
                'terca': ['terca', 'terça', 'tue', 'tuesday', 'ter'],
                'quarta': ['quarta', 'wed', 'wednesday', 'qua'],
                'quinta': ['quinta', 'thu', 'thursday', 'qui'],
                'sexta': ['sexta', 'fri', 'friday', 'sex'],
                'sabado': ['sabado', 'sábado', 'sat', 'saturday', 'sab'],
                'domingo': ['domingo', 'sun', 'sunday', 'dom']
            }
            
            for key, value in plan_data['weekly_plan'].items():
                k_norm = key.lower().strip()
                # Remove accents from key if present
                import unicodedata
                k_no_accents = ''.join(c for c in unicodedata.normalize('NFD', k_norm) if unicodedata.category(c) != 'Mn')
                
                # Setup specific mapping
                matched_day = k_no_accents # default to itself
                
                # Check explicit map
                for std_day, variants in normalization_map.items():
                    if k_no_accents in variants:
                        matched_day = std_day
                        break
                
                normalized_weekly[matched_day] = value
            
            plan_data['weekly_plan'] = normalized_weekly
        
        # Deactivate old plans
        DietPlan.query.filter_by(user_id=user_id, is_active=True).update({'is_active': False})
        
        # Invalidate cache
        cache.delete(f"diet_plan:{user_id}")
        
        # Save new plan
        new_plan = DietPlan(
            user_id=user_id,
            weekly_plan=plan_data.get('weekly_plan'),
            shopping_list=plan_data.get('shopping_list'),
            macro_targets=plan_data.get('macro_targets'),
            generated_by_ai=True,
            is_active=True
        )
        
        db.session.add(new_plan)
        db.session.commit()
        
        return jsonify({
            "msg": "Diet plan generated successfully",
            "plan_id": str(new_plan.id),
            "plan": plan_data
        }), 201
        
    except Exception as e:
        print(f"Error generating diet plan: {e}")
        return jsonify({"msg": f"Error generating plan: {str(e)}"}), 500


@diet_bp.route('/plan', methods=['GET'])
@jwt_required()
# @cache.cached(timeout=3600, key_prefix=make_cache_key) # Disabled to fix potential CORS issues with cached responses
def get_current_diet_plan():
    """
    Get user's active diet plan
    ---
    tags:
      - Diet
    responses:
      200:
        description: Active diet plan
      404:
        description: No active diet plan
    """
    user_id = uuid.UUID(get_jwt_identity())
    
    plan = DietPlan.query.filter_by(user_id=user_id, is_active=True).first()
    
    if not plan:
        return jsonify({"msg": "No active diet plan"}), 404
    
    return jsonify({
        "id": str(plan.id),
        "weekly_plan": plan.weekly_plan,
        "shopping_list": plan.shopping_list,
        "macro_targets": plan.macro_targets,
        "created_at": plan.created_at.isoformat()
    }), 200


@diet_bp.route('/regenerate-day', methods=['POST'])
@jwt_required()
def regenerate_day_plan():
    """
    Regenerate diet plan for a specific day
    ---
    tags:
      - Diet
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - day
          properties:
            day:
              type: string
              example: "segunda"
    responses:
      200:
        description: Day regenerated
      400:
        description: Day required or onboarding not complete
      404:
        description: No active diet plan
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    day = data.get('day')
    
    if not day:
        return jsonify({"msg": "Day is required"}), 400
        
    # Get user preferences
    pref = DietPreference.query.filter_by(user_id=user_id).first()
    if not pref:
        return jsonify({"msg": "Complete diet onboarding first"}), 400
        
    # Get active plan
    plan = DietPlan.query.filter_by(user_id=user_id, is_active=True).first()
    if not plan:
        return jsonify({"msg": "No active diet plan"}), 404
        
    try:
        gemini = GeminiService()
        
        # Build context-aware prompt (Reuse maps for consistency)
        goal_map = {
            'emagrecimento': 'perder peso de forma saudável',
            'ganho_massa': 'ganhar massa muscular',
            'manutencao': 'manter o peso atual',
            'saude': 'melhorar a saúde geral'
        }
        
        budget_map = {
            'ate_300': 'até R$ 300/mês (muito econômico)',
            '300_500': 'R$ 300-500/mês (econômico)',
            '500_800': 'R$ 500-800/mês (moderado)',
            'acima_800': 'acima de R$ 800/mês'
        }
        
        ingredient_map = {
            'basicos': 'APENAS ingredientes básicos e muito baratos: arroz, feijão, frango, ovos, batata, cenoura, tomate, banana, laranja',
            'intermediarios': 'ingredientes intermediários incluindo carnes variadas e grãos especiais',
            'sofisticados': 'ingredientes sofisticados como importados, orgânicos e especiarias raras'
        }
        
        prep_time_map = {
            'menos_15': 'menos de 15 minutos',
            '15_30': '15-30 minutos',
            '30_60': '30-60 minutos',
            'mais_60': 'mais de 1 hora'
        }
        
        prompt = f"""Você é um nutricionista especializado em dietas acessíveis para brasileiros.
        Recrie o plano alimentar de UM DIA ({day}) respeitando RIGOROSAMENTE as preferências do usuário:
        
        **OBJETIVO:** {goal_map.get(pref.goal, pref.goal)}
        **ORÇAMENTO:** {budget_map.get(pref.budget, pref.budget)}
        **INGREDIENTES DISPONÍVEIS:** {ingredient_map.get(pref.ingredient_access, pref.ingredient_access)}
        **RESTRIÇÕES:** {', '.join(pref.restrictions) if pref.restrictions else 'Nenhuma'}
        **ALERGIAS:** {pref.allergies if pref.allergies else 'Nenhuma'}
        **ALIMENTOS QUE NÃO GOSTA:** {pref.dislikes if pref.dislikes else 'Nenhum'}
        **TEMPO DE PREPARO:** {prep_time_map.get(pref.prep_time, pref.prep_time)}
        **META DE CALORIAS:** {pref.calorie_goal} kcal/dia
        
        REGRAS IMPORTANTES:
        1. Use APENAS ingredientes típicos brasileiros
        2. Respeite o orçamento e ingredientes disponíveis
        3. Receitas compatíveis com o tempo de preparo: {prep_time_map.get(pref.prep_time, pref.prep_time)}

        Retorne APENAS um JSON válido com esta estrutura:
        {{
          "cafe": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}},
          "almoco": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}},
          "jantar": {{"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."}}
        }}"""
        
        # Add 'lanche' if meals > 3
        if pref.meals_per_day and pref.meals_per_day > 3:
             prompt = prompt.replace('}}', ', "lanche": {"nome": "...", "calorias": 0, "ingredientes": ["..."], "preparo":"..."} }}')

        new_day_plan = gemini.generate_json(prompt)
        
        if new_day_plan:
            # Update plan
            # Note: SQLAlchemy requires assigning a new dictionary to JSON fields to track mutation
            current_weekly = dict(plan.weekly_plan)
            current_weekly[day] = new_day_plan
            plan.weekly_plan = current_weekly
            
            # Invalidate cache
            cache.delete(f"diet_plan:{user_id}")
            
            # db.session.add(plan) # Not strictly needed if object is attached, but safe
            db.session.commit()
            
            return jsonify({
                "msg": "Day regenerated",
                "day_plan": new_day_plan
            }), 200
        else:
             return jsonify({"msg": "Failed to generate content"}), 500
             
    except Exception as e:
        db.session.rollback()
        print(f"Error regenerating day: {e}")
        return jsonify({"msg": f"Error: {str(e)}"}), 500


@diet_bp.route('/shopping-list', methods=['PUT'])
@jwt_required()
def update_shopping_list():
    """
    Update shopping list items (prices, checks)
    ---
    tags:
      - Diet
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - shopping_list
          properties:
            shopping_list:
              type: array
              items:
                type: object
    responses:
      200:
        description: Shopping list updated
      404:
        description: No active diet plan
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    shopping_list = data.get('shopping_list')

    if shopping_list is None:
        return jsonify({"msg": "Shopping list is required"}), 400

    plan = DietPlan.query.filter_by(user_id=user_id, is_active=True).first()
    
    if not plan:
        return jsonify({"msg": "No active diet plan"}), 404

    # Update shopping list
    plan.shopping_list = shopping_list
    
    # Invalidate cache
    cache.delete(f"diet_plan:{user_id}")
    
    db.session.commit()

    return jsonify({"msg": "Shopping list updated"}), 200
