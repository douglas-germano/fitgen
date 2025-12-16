from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.nutrition.domain.hydration import HydrationLog, HydrationGoal
from datetime import datetime, timedelta
from sqlalchemy import func
from app.shared.utils.timezone import now_cuiaba, get_today_cuiaba, to_cuiaba
from collections import defaultdict

hydration_bp = Blueprint('hydration', __name__)

@hydration_bp.route('/goal', methods=['POST'])
@jwt_required()
def set_goal():
    """
    Set daily hydration goal
    ---
    tags:
      - Hydration
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - goal_amount_ml
          properties:
            goal_amount_ml:
              type: integer
    responses:
      200:
        description: Hydration goal updated
      400:
        description: Goal amount required
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    amount = data.get('goal_amount_ml')
    if not amount:
        return jsonify({"msg": "goal_amount_ml is required"}), 400
        
    goal = HydrationGoal.query.filter_by(user_id=user_id).first()
    if not goal:
        goal = HydrationGoal(user_id=user_id, daily_goal_ml=amount)
        db.session.add(goal)
    else:
        goal.daily_goal_ml = amount
        goal.updated_at = now_cuiaba()
        
    db.session.commit()
    return jsonify({"msg": "Hydration goal updated", "goal_ml": goal.daily_goal_ml}), 200

@hydration_bp.route('/log', methods=['POST'])
@jwt_required()
def log_intake():
    """
    Log water intake
    ---
    tags:
      - Hydration
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - amount_ml
          properties:
            amount_ml:
              type: integer
    responses:
      201:
        description: Intake logged
      400:
        description: Amount required
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    amount = data.get('amount_ml')
    if not amount:
        return jsonify({"msg": "amount_ml is required"}), 400
        
    log = HydrationLog(
        user_id=user_id,
        amount_ml=amount,
        logged_at=now_cuiaba()
    )
    
    db.session.add(log)
    db.session.commit()
    
    # Check for Goal Achievement
    try:
        from app.modules.communication.application.notification_service import NotificationService
        
        today = get_today_cuiaba()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        # Recalculate total including new log
        daily_logs = HydrationLog.query.filter(
            HydrationLog.user_id == user_id,
            HydrationLog.logged_at >= start_of_day,
            HydrationLog.logged_at <= end_of_day
        ).all()
        
        total = sum(l.amount_ml for l in daily_logs)
        
        # Get goal
        goal_obj = HydrationGoal.query.filter_by(user_id=user_id).first()
        target = goal_obj.daily_goal_ml if goal_obj else 2500
        
        if total >= target:
            NotificationService.trigger_notification(
                user_id=user_id,
                type='goal',
                title='Meta de Hidratação Atingida! 💧',
                message=f'Parabéns! Você atingiu sua meta de {target}ml de água hoje.',
                link_type='hydration'
            )
    except Exception as e:
        print(f"Notification error: {e}")

    # Gamification
    try:
        from app.modules.gamification.application.service import GamificationService
        
        # Calculate if goal is met (Simplified logic, reusing total from above)
        is_goal_met = False
        
        # Re-calc total for today (robustness)
        today = get_today_cuiaba()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        daily_logs = HydrationLog.query.filter(
            HydrationLog.user_id == user_id,
            HydrationLog.logged_at >= start_of_day,
            HydrationLog.logged_at <= end_of_day
        ).all()
        total = sum(l.amount_ml for l in daily_logs)
        
        goal_obj = HydrationGoal.query.filter_by(user_id=user_id).first()
        target = goal_obj.daily_goal_ml if goal_obj else 2500
        
        if total >= target:
            is_goal_met = True
            
        GamificationService.handle_activity(user_id, 'hydration_log', is_goal_met=is_goal_met)
            
    except Exception as e:
        print(f"Gamification error: {e}")
    
    return jsonify({"msg": "Intake logged", "amount_ml": amount}), 201

@hydration_bp.route('/daily', methods=['GET'])
@jwt_required()
def get_daily_hydration():
    """
    Get daily hydration stats
    ---
    tags:
      - Hydration
    parameters:
      - in: query
        name: date
        type: string
        description: Date in YYYY-MM-DD format
    responses:
      200:
        description: Daily hydration stats
    """
    user_id = get_jwt_identity()
    date_str = request.args.get('date', get_today_cuiaba().isoformat())
    
    try:
        query_date = datetime.fromisoformat(date_str).date() if 'T' in date_str else datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        try:
             # Fallback for when fromisoformat fails on simple date string on some python versions or if frontend sends diff format
            query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
             return jsonify({"msg": "Invalid date format"}), 400
        
    # Get Goal
    goal = HydrationGoal.query.filter_by(user_id=user_id).first()
    target = goal.daily_goal_ml if goal else 2500 # Default 2.5L
    
    # Get Logs
    start_of_day = datetime.combine(query_date, datetime.min.time())
    end_of_day = datetime.combine(query_date, datetime.max.time())
    
    logs = HydrationLog.query.filter(
        HydrationLog.user_id == user_id,
        HydrationLog.logged_at >= start_of_day,
        HydrationLog.logged_at <= end_of_day
    ).all()
    
    total_intake = sum(l.amount_ml for l in logs)
    
    return jsonify({
        "date": date_str,
        "total_intake_ml": total_intake,
        "daily_goal_ml": target,
        "percentage": round((total_intake / target) * 100, 1) if target > 0 else 0
    }), 200

@hydration_bp.route('/history', methods=['GET'])
@jwt_required()
def get_hydration_history():
    """
    Get hydration history (last 30 days)
    ---
    tags:
      - Hydration
    responses:
      200:
        description: List of daily hydration totals
    """
    user_id = get_jwt_identity()
    today = get_today_cuiaba()
    thirty_days_ago = today - timedelta(days=30)
    
    # Get all logs from last 30 days
    logs = HydrationLog.query.filter(
        HydrationLog.user_id == user_id,
        HydrationLog.logged_at >= thirty_days_ago
    ).order_by(HydrationLog.logged_at.asc()).all()
    
    # Group by date in Cuiabá timezone
    daily_totals = defaultdict(int)
    
    for log in logs:
        # Convert to Cuiabá timezone to get correct date
        cuiaba_dt = to_cuiaba(log.logged_at) if log.logged_at.tzinfo else log.logged_at
        date_key = cuiaba_dt.date().isoformat()
        daily_totals[date_key] += log.amount_ml
    
    # Convert to sorted list
    data = [
        {"date": date, "value": int(total)}
        for date, total in sorted(daily_totals.items())
    ]
    
    return jsonify(data), 200
