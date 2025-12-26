
# ========================================
# AUDIT LOGS ENDPOINTS
# ========================================

@admin_bp.route('/audit-logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs with filtering and pagination"""
    from app.modules.identity.domain.audit_log import AuditLog
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Filters
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    resource_type = request.args.get('resource_type')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    from datetime import datetime
    
    query = AuditLog.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    if action:
        query = query.filter_by(action=action)
    if resource_type:
        query = query.filter_by(resource_type=resource_type)
    if date_from:
        try:
            date_obj = datetime.fromisoformat(date_from)
            query = query.filter(AuditLog.created_at >= date_obj)
        except ValueError:
            pass
    if date_to:
        try:
            date_obj = datetime.fromisoformat(date_to)
            query = query.filter(AuditLog.created_at <= date_obj)
        except ValueError:
            pass
    
    pagination = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "logs": [{
            "id": log.id,
            "user_email": log.user_email,
            "user_role": log.user_role,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "description": log.description,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "ip_address": log.ip_address
        } for log in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })


# ========================================
# ANALYTICS ENDPOINTS
# ========================================

@admin_bp.route('/analytics/growth', methods=['GET'])
def get_growth_analytics():
    """Get user growth analytics over time"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    
    # Get days parameter (default 30)
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily user signups
    daily_signups = db.session.query(
        cast(User.created_at, Date).label('date'),
        func.count(User.id).label('count')
    ).filter(
        User.created_at >= start_date,
        User.deleted_at.is_(None)
    ).group_by(
        cast(User.created_at, Date)
    ).order_by('date').all()
    
    # Calculate cumulative
    cumulative = []
    total = User.query.filter(User.created_at < start_date, User.deleted_at.is_(None)).count()
    
    for date, count in daily_signups:
        total += count
        cumulative.append({
            "date": date.isoformat(),
            "new_users": count,
            "total_users": total
        })
    
    return jsonify({
        "period_days": days,
        "data": cumulative
    })


@admin_bp.route('/analytics/retention', methods=['GET'])
def get_retention_analytics():
    """Calculate user retention rate"""
    from datetime import datetime, timedelta
    
    # Users from 30 days ago
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    users_30d_ago = User.query.filter(
        User.created_at <= thirty_days_ago,
        User.deleted_at.is_(None)
    ).count()
    
    # Active users (logged in last 7 days)
    active_users = User.query.filter(
        User.created_at <= thirty_days_ago,
        User.last_login >= seven_days_ago,
        User.deleted_at.is_(None)
    ).count()
    
    retention_rate = (active_users / users_30d_ago * 100) if users_30d_ago > 0 else 0
    
    return jsonify({
        "users_30d_ago": users_30d_ago,
        "active_users": active_users,
        "retention_rate": round(retention_rate, 2),
        "period": "30_days"
    })


# ========================================
# ACHIEVEMENTS MANAGEMENT
# ========================================

@admin_bp.route('/achievements', methods=['GET'])
def list_achievements_admin():
    """List all achievements with unlock statistics"""
    from app.modules.gamification.domain.achievements import Achievement, UserAchievement
    from sqlalchemy import func
    
    achievements = Achievement.query.filter_by(is_active=True).all()
    
    result = []
    for ach in achievements:
        unlock_count = UserAchievement.query.filter_by(achievement_id=ach.id).count()
        
        result.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "tier": ach.tier,
            "icon": ach.icon,
            "points": ach.points,
            "unlock_count": unlock_count,
            "unlock_rate": round((unlock_count / User.query.filter(User.deleted_at.is_(None)).count() * 100), 2) if User.query.count() > 0 else 0
        })
    
    return jsonify({"achievements": result})


@admin_bp.route('/achievements', methods=['POST'])
def create_achievement_admin():
    """Create a new achievement"""
    from app.modules.gamification.domain.achievements import Achievement
    
    data = request.get_json()
    
    if not data.get('name') or not data.get('description'):
        return jsonify({"msg": "Name and description required"}), 400
    
    new_achievement = Achievement(
        name=data['name'],
        description=data['description'],
        tier=data.get('tier', 'bronze'),
        icon=data.get('icon', '🏆'),
        points=data.get('points', 10),
        criteria=data.get('criteria', {})
    )
    
    db.session.add(new_achievement)
    db.session.commit()
    
    return jsonify({
        "msg": "Achievement created",
        "id": new_achievement.id
    }), 201


@admin_bp.route('/achievements/<uuid:achievement_id>', methods=['PUT'])
def update_achievement_admin(achievement_id):
    """Update an achievement"""
    from app.modules.gamification.domain.achievements import Achievement
    
    achievement = Achievement.query.get_or_404(achievement_id)
    data = request.get_json()
    
    if 'name' in data:
        achievement.name = data['name']
    if 'description' in data:
        achievement.description = data['description']
    if 'tier' in data:
        achievement.tier = data['tier']
    if 'icon' in data:
        achievement.icon = data['icon']
    if 'points' in data:
        achievement.points = data['points']
    if 'criteria' in data:
        achievement.criteria = data['criteria']
    
    db.session.commit()
    
    return jsonify({"msg": "Achievement updated"}), 200


@admin_bp.route('/users/<uuid:user_id>/achievements/<uuid:achievement_id>', methods=['POST'])
def grant_achievement_to_user(user_id, achievement_id):
    """Manually grant an achievement to a user"""
    from app.modules.gamification.domain.achievements import Achievement, UserAchievement
    from app.modules.identity.domain.audit_log import AuditLog
    
    user = User.query.get_or_404(user_id)
    achievement = Achievement.query.get_or_404(achievement_id)
    
    # Check if already unlocked
    existing = UserAchievement.query.filter_by(
        user_id=user_id,
        achievement_id=achievement_id
    ).first()
    
    if existing:
        return jsonify({"msg": "Achievement already unlocked"}), 409
    
    # Grant achievement
    user_achievement = UserAchievement(
        user_id=user_id,
        achievement_id=achievement_id
    )
    
    db.session.add(user_achievement)
    
    # Log action
    current_admin = User.query.get(get_jwt_identity())
    AuditLog.log(
        user=current_admin,
        action='grant_achievement',
        resource_type='user_achievement',
        resource_id=user_id,
        description=f"Granted achievement '{achievement.name}' to {user.email}"
    )
    
    db.session.commit()
    
    return jsonify({"msg": "Achievement granted"}), 201
