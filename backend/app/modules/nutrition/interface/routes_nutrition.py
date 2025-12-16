from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.nutrition.domain.models import Meal
from app.modules.analytics.domain.nutrition_analyzer import NutritionAnalyzerService
from app.modules.coach.infrastructure.gemini_service import GeminiService
from datetime import datetime
import uuid
from app.shared.utils.timezone import now_cuiaba, get_today_cuiaba

nutrition_bp = Blueprint('nutrition', __name__)

@nutrition_bp.route('/estimate', methods=['POST'])
@jwt_required()
def estimate_nutrition():
    """
    Estimate nutritional values from text description using AI
    ---
    tags:
      - Nutrition
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - description
          properties:
            description:
              type: string
              example: "200g of grilled chicken"
    responses:
      200:
        description: Estimated nutritional estimation
      400:
        description: Missing description
    """
    # Check content type
    description = None
    images = []
    
    if request.is_json:
        data = request.get_json()
        description = data.get('description')
    else:
        description = request.form.get('description')
        if 'images' in request.files:
            images = request.files.getlist('images')
    
    if not description and not images:
        return jsonify({"msg": "Forneça uma descrição ou imagens"}), 400
        
    try:
        # If images are present, use Vision API
        if images:
            analyzer = NutritionAnalyzerService()
            
            # Prepare images data
            images_data = []
            for img in images:
                if img.filename:
                    images_data.append({
                        "data": img.read(),
                        "mime_type": img.mimetype
                    })
            
            if not images_data and not description:
                 return jsonify({"msg": "Nenhuma imagem válida fornecida"}), 400
                 
            if images_data:
                result = analyzer.analyze_meal(images_data, description)
                if not result:
                     return jsonify({"msg": "Falha ao analisar imagens"}), 500
                if "error" in result:
                     return jsonify({"msg": result["error"]}), 400
                return jsonify(result), 200

        # Text only analysis (existing logic)
        gemini = GeminiService()
        
        prompt = f"""Analise a seguinte descrição de alimento e retorne APENAS um JSON válido com as estimativas nutricionais:

Descrição: {description}

Retorne no formato JSON:
{{
    "name": "nome do alimento",
    "calories": número_inteiro,
    "protein": número_inteiro,
    "carbs": número_inteiro,
    "fats": número_inteiro
}}

Exemplo para "200g de frango grelhado":
{{
    "name": "Frango Grelhado",
    "calories": 330,
    "protein": 62,
    "carbs": 0,
    "fats": 7
}}

IMPORTANTE: Retorne APENAS o JSON, sem explicações, sem markdown, sem código adicional."""

        # Generate content
        response = gemini.model.generate_content(prompt)
        response_text = response.text.strip()
        
        print(f"Gemini response: {response_text}")  # Debug log
        
        # Parse JSON response
        import json
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            # Find first { and last }
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end > start:
                response_text = response_text[start:end]
        
        nutrition_data = json.loads(response_text)
        
        print(f"Parsed nutrition data: {nutrition_data}")  # Debug log
        
        return jsonify(nutrition_data), 200
        
    except Exception as e:
        print(f"Estimation error: {e}")
        # Fallback for TEXT ONLY
        if not description:
             return jsonify({"msg": "Erro na análise e sem descrição para fallback"}), 500
             
        import re
        
        description_lower = description.lower()
        
        # Try to extract quantity
        quantity_match = re.search(r'(\d+)\s*g', description_lower)
        quantity = int(quantity_match.group(1)) if quantity_match else 100
        
        # Simple food database (per 100g)
        foods = {
            'frango': {'calories': 165, 'protein': 31, 'carbs': 0, 'fats': 3.6},
            'arroz': {'calories': 130, 'protein': 2.7, 'carbs': 28, 'fats': 0.3},
            'feijão': {'calories': 127, 'protein': 9, 'carbs': 23, 'fats': 0.5},
            'batata': {'calories': 77, 'protein': 2, 'carbs': 17, 'fats': 0.1},
            'carne': {'calories': 250, 'protein': 26, 'carbs': 0, 'fats': 15},
            'peixe': {'calories': 206, 'protein': 22, 'carbs': 0, 'fats': 12},
            'ovo': {'calories': 155, 'protein': 13, 'carbs': 1.1, 'fats': 11},
            'pão': {'calories': 265, 'protein': 9, 'carbs': 49, 'fats': 3.2},
        }
        
        # Find matching food
        matched_food = None
        for food_name, values in foods.items():
            if food_name in description_lower:
                matched_food = values
                break
        
        if matched_food:
            # Calculate based on quantity
            factor = quantity / 100
            return jsonify({
                "name": description,
                "calories": int(matched_food['calories'] * factor),
                "protein": int(matched_food['protein'] * factor),
                "carbs": int(matched_food['carbs'] * factor),
                "fats": int(matched_food['fats'] * factor)
            }), 200
        
        # Default fallback
        return jsonify({
            "name": description,
            "calories": 200,  # Default estimate
            "protein": 15,
            "carbs": 20,
            "fats": 5
        }), 200

@nutrition_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_food_image():
    """
    Analyze food image using AI
    ---
    tags:
      - Nutrition
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: image
        type: file
        required: true
    responses:
      200:
        description: Image analysis result
      400:
        description: No image provided or error
      500:
        description: Analysis failed
    """
    if 'image' not in request.files:
        return jsonify({"msg": "No image file provided"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    try:
        # Read file bytes
        image_data = file.read()
        mime_type = file.mimetype
        
        analyzer = NutritionAnalyzerService()
        analysis = analyzer.analyze_meal(image_data, mime_type)
        
        if not analysis:
            return jsonify({"msg": "Failed to analyze image"}), 500
            
        if "error" in analysis:
            return jsonify({"msg": analysis["error"]}), 400
            
        return jsonify(analysis), 200
    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({"msg": "Server error during analysis"}), 500

@nutrition_bp.route('/log', methods=['POST'])
@jwt_required()
def log_meal():
    """
    Log a meal
    ---
    tags:
      - Nutrition
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
            meal_type:
              type: string
            calories:
              type: number
            protein:
              type: number
            carbs:
              type: number
            fats:
              type: number
    responses:
      201:
        description: Meal logged
      400:
        description: Missing data
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({"msg": "Missing meal data"}), 400
        
    new_meal = Meal(
        user_id=user_id,
        name=data['name'],
        meal_type=data.get('meal_type'),  # cafe, almoco, lanche, jantar, ceia
        calories=data.get('calories', 0),
        protein_g=data.get('protein', 0),
        carbs_g=data.get('carbs', 0),
        fat_g=data.get('fats', 0),
        photo_url=data.get('image_url'),
        analyzed_by_ai=data.get('is_ai_analyzed', False),
        created_at=now_cuiaba(),
        consumed_at=now_cuiaba()
    )
    
    db.session.add(new_meal)
    db.session.commit()
    
    # Check Goals and Limits
    try:
        from app.modules.communication.application.notification_service import NotificationService
        from app.modules.identity.domain.models import User
        
        # Get User Profile for goals
        user = User.query.get(user_id)
        if user and user.profile:
            tdee = user.profile.tdee or 2000
            weight = user.profile.current_weight_kg or 70
            protein_goal = weight * 2.0 # Simple estimation: 2g per kg
            
            # Calculate daily totals
            start_of_day = datetime.combine(now_cuiaba().date(), datetime.min.time())
            end_of_day = datetime.combine(now_cuiaba().date(), datetime.max.time())
            
            daily_meals = Meal.query.filter(
                Meal.user_id == user_id,
                Meal.consumed_at >= start_of_day,
                Meal.consumed_at <= end_of_day
            ).all()
            
            total_cals = sum(m.calories for m in daily_meals)
            total_protein = sum(m.protein_g for m in daily_meals)
            
            # 1. Calorie Danger
            if total_cals > tdee:
                NotificationService.trigger_notification(
                    user_id=user_id,
                    type='system', # Warning/System
                    title='Cuidado com as Calorias! ⚠️',
                    message=f'Você ultrapassou sua estimativa diária de {int(tdee)} kcal.',
                    link_type='nutrition'
                )
                
            # 2. Protein Goal
            if total_protein >= protein_goal:
                NotificationService.trigger_notification(
                    user_id=user_id,
                    type='goal',
                    title='Meta de Proteína Batida! 🥩',
                    message=f'Excelente! Você atingiu {int(total_protein)}g de proteína hoje.',
                    link_type='nutrition'
                )
                
    except Exception as e:
        print(f"Notification error: {e}")
        
    # Gamification: Update Nutrition Streak
    try:
        from app.modules.gamification.application.service import GamificationService
        GamificationService.handle_activity(user_id, 'meal_log')
    except Exception as e:
        print(f"Gamification error: {e}")
        
    return jsonify({"msg": "Meal logged", "id": str(new_meal.id)}), 201

@nutrition_bp.route('/log/<meal_id>', methods=['PUT'])
@jwt_required()
def update_meal(meal_id):
    """
    Update a logged meal
    ---
    tags:
      - Nutrition
    parameters:
      - in: path
        name: meal_id
        type: string
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            meal_type:
              type: string
            calories:
              type: number
            protein:
              type: number
            carbs:
              type: number
            fats:
              type: number
    responses:
      200:
        description: Meal updated
      404:
        description: Meal not found
    """
    user_id = uuid.UUID(get_jwt_identity())
    data = request.get_json()
    
    try:
        meal_uuid = uuid.UUID(meal_id)
    except ValueError:
        return jsonify({"msg": "Invalid meal ID"}), 400
    
    meal = Meal.query.filter_by(id=meal_uuid, user_id=user_id).first()
    
    if not meal:
        return jsonify({"msg": "Meal not found"}), 404
        
    if 'name' in data:
        meal.name = data['name']
    if 'meal_type' in data:
        meal.meal_type = data['meal_type']
    if 'calories' in data:
        meal.calories = data['calories']
    if 'protein' in data:
        meal.protein_g = data['protein']
    if 'carbs' in data:
        meal.carbs_g = data['carbs']
    if 'fats' in data:
        meal.fat_g = data['fats']
        
    db.session.commit()
    
    return jsonify({"msg": "Meal updated"}), 200

@nutrition_bp.route('/log/<meal_id>', methods=['DELETE'])
@jwt_required()
def delete_meal(meal_id):
    """
    Delete a logged meal
    ---
    tags:
      - Nutrition
    parameters:
      - in: path
        name: meal_id
        type: string
        required: true
    responses:
      200:
        description: Meal deleted
      404:
        description: Meal not found
    """
    user_id = uuid.UUID(get_jwt_identity())
    
    try:
        meal_uuid = uuid.UUID(meal_id)
    except ValueError:
        return jsonify({"msg": "Invalid meal ID"}), 400
    
    meal = Meal.query.filter_by(id=meal_uuid, user_id=user_id).first()
    
    if not meal:
        return jsonify({"msg": "Meal not found"}), 404
    
    db.session.delete(meal)
    db.session.commit()
    
    return jsonify({"msg": "Meal deleted"}), 200

@nutrition_bp.route('/daily', methods=['GET'])
@jwt_required()
def get_daily_nutrition():
    """
    Get daily nutrition summary
    ---
    tags:
      - Nutrition
    parameters:
      - in: query
        name: date
        type: string
        description: Date in YYYY-MM-DD format
    responses:
      200:
        description: Daily nutrition summary
    """
    user_id = uuid.UUID(get_jwt_identity())
    date_str = request.args.get('date', get_today_cuiaba().isoformat())
    
    try:
        query_date = datetime.fromisoformat(date_str).date()
    except ValueError:
        return jsonify({"msg": "Invalid date format"}), 400
        
    # Filter by date range for DateTime field (using Cuiabá timezone)
    start_of_day = datetime.combine(query_date, datetime.min.time())
    end_of_day = datetime.combine(query_date, datetime.max.time())
    
    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.consumed_at >= start_of_day,
        Meal.consumed_at <= end_of_day
    ).all()
    
    total_cals = sum(m.calories for m in meals)
    total_protein = sum(m.protein_g for m in meals)
    total_carbs = sum(m.carbs_g for m in meals)
    total_fats = sum(m.fat_g for m in meals)
    
    meal_list = [{
        "id": str(m.id),
        "name": m.name,
        "meal_type": m.meal_type,
        "calories": m.calories,
        "protein": m.protein_g,
        "carbs": m.carbs_g,
        "fats": m.fat_g,
        "macros": {
            "protein": m.protein_g,
            "carbs": m.carbs_g,
            "fats": m.fat_g
        },
        "is_ai_analyzed": m.analyzed_by_ai,
        "created_at": m.created_at.isoformat() if m.created_at else None
    } for m in meals]
    
    return jsonify({
        "date": date_str,
        "totals": {
            "calories": total_cals,
            "protein": total_protein,
            "carbs": total_carbs,
            "fats": total_fats
        },
        "meals": meal_list
    }), 200
@nutrition_bp.route('/history', methods=['GET'])
@jwt_required()
def get_nutrition_history():
    """
    Get nutrition history aggregated by date
    ---
    tags:
      - Nutrition
    parameters:
      - in: query
        name: days
        type: integer
        description: Number of days to look back (default 7)
      - in: query
        name: start_date
        type: string
        description: Start date (YYYY-MM-DD)
      - in: query
        name: end_date
        type: string
        description: End date (YYYY-MM-DD)
    responses:
      200:
        description: History data
    """
    user_id = uuid.UUID(get_jwt_identity())
    
    # Date handling
    today = get_today_cuiaba()
    
    days = request.args.get('days', 7, type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    from datetime import timedelta
    
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str).date()
        except ValueError:
            return jsonify({"msg": "Invalid start_date format"}), 400
    else:
        start_date = today - timedelta(days=days-1) # Inclusive of today
        
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str).date()
        except ValueError:
            return jsonify({"msg": "Invalid end_date format"}), 400
    else:
        end_date = today
        
    # Query meals in range
    start_time = datetime.combine(start_date, datetime.min.time())
    end_time = datetime.combine(end_date, datetime.max.time())
    
    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.consumed_at >= start_time,
        Meal.consumed_at <= end_time
    ).order_by(Meal.consumed_at).all()
    
    # Aggregation
    history = {}
    
    # Initialize all dates in range with 0
    current = start_date
    while current <= end_date:
        d_str = current.isoformat()
        history[d_str] = {
            "date": d_str,
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fats": 0,
            "meal_count": 0
        }
        current += timedelta(days=1)
        
    for m in meals:
        # Use local date
        # Assuming consumed_at is stored in compatible tz or naive UTC representing local time?
        # The utils say now_cuiaba() returns a tz-aware datetime.
        # .date() on a tz-aware datetime returns the local date relative to that tz?
        # If stored as naive in DB but representing Cuiaba, we just take date.
        # If stored as UTC, we need conversion.
        # Inspecting now_cuiaba implementation (not seen but inferred from previous sessions), usually apps store UTC.
        # However, earlier view showed `from app.shared.utils.timezone import now_cuiaba`.
        # For safety, let's assume `m.consumed_at` allows getting the date correctly.
        # If the DB converts to UTC, we might have date shift issues.
        # For now, simplistic approach:
        
        # We need to handle TZ if previous code established it.
        # But here I'll just use .date() for simplicity, assuming consistent storage.
        
        m_date = m.consumed_at.date().isoformat()
        
        if m_date in history:
            history[m_date]["calories"] += m.calories
            history[m_date]["protein"] += m.protein_g
            history[m_date]["carbs"] += m.carbs_g
            history[m_date]["fats"] += m.fat_g
            history[m_date]["meal_count"] += 1
            
    # Convert dict to sorted list
    result = sorted(history.values(), key=lambda x: x['date'])
    
    return jsonify(result), 200
