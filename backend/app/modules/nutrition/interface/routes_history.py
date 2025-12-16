from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.nutrition.domain.models import Meal
from datetime import datetime, timedelta
import uuid

nutrition_history_bp = Blueprint('nutrition_history', __name__)

@nutrition_history_bp.route('/history', methods=['GET'])
@jwt_required()
def get_nutrition_history():
    """Get nutrition history with aggregation by period"""
    user_id = uuid.UUID(get_jwt_identity())
    
    period = request.args.get('period', 'semana')  # dia, semana, mes, ano
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Default date ranges
    today = datetime.utcnow().date()
    if period == 'dia':
        start_date = today - timedelta(days=30)
        end_date = today
    elif period == 'semana':
        start_date = today - timedelta(weeks=12)
        end_date = today
    elif period == 'mes':
        start_date = today - timedelta(days=365)
        end_date = today
    else:  # ano
        start_date = today - timedelta(days=365*2)
        end_date = today
    
    # Override with custom dates if provided
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str).date()
        except ValueError:
            pass
    
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str).date()
        except ValueError:
            pass
    
    # Query meals
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.consumed_at >= start_datetime,
        Meal.consumed_at <= end_datetime
    ).order_by(Meal.consumed_at).all()
    
    # Aggregate by period
    aggregated_data = {}
    
    for meal in meals:
        meal_date = meal.consumed_at.date()
        
        # Determine grouping key
        if period == 'dia':
            key = meal_date.isoformat()
        elif period == 'semana':
            # Start of week (Monday)
            week_start = meal_date - timedelta(days=meal_date.weekday())
            key = week_start.isoformat()
        elif period == 'mes':
            key = f"{meal_date.year}-{meal_date.month:02d}-01"
        else:  # ano
            key = f"{meal_date.year}-01-01"
        
        if key not in aggregated_data:
            aggregated_data[key] = {
                'date': key,
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fats': 0,
                'meals_count': 0
            }
        
        aggregated_data[key]['calories'] += meal.calories or 0
        aggregated_data[key]['protein'] += meal.protein_g or 0
        aggregated_data[key]['carbs'] += meal.carbs_g or 0
        aggregated_data[key]['fats'] += meal.fat_g or 0
        aggregated_data[key]['meals_count'] += 1
    
    # Convert to list and sort
    data_list = sorted(aggregated_data.values(), key=lambda x: x['date'])
    
    # Calculate summary
    total_calories = sum(d['calories'] for d in data_list)
    avg_calories = total_calories / len(data_list) if data_list else 0
    max_calories = max((d['calories'] for d in data_list), default=0)
    min_calories = min((d['calories'] for d in data_list), default=0)
    
    return jsonify({
        'period': period,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'data': data_list,
        'summary': {
            'total_calories': int(total_calories),
            'avg_calories': int(avg_calories),
            'max_calories': int(max_calories),
            'min_calories': int(min_calories),
            'total_days': len(data_list)
        }
    }), 200
