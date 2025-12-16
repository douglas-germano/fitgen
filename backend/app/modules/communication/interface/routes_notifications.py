from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.modules.communication.domain.notification import Notification
from app.modules.communication.domain.device_token import DeviceToken
from app.shared.extensions import db
from app.shared.utils.timezone import now_cuiaba

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_notifications():
    """
    Get all notifications for the current user
    ---
    tags:
      - Notifications
    responses:
      200:
        description: List of notifications
    """
    current_user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=current_user_id).order_by(Notification.created_at.desc()).all()
    
    return jsonify([
        {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat(),
            "link_type": notification.link_type,
            "link_id": str(notification.link_id) if notification.link_id else None
        } for notification in notifications
    ])

@notifications_bp.route('/unread', methods=['GET'])
@jwt_required()
def get_unread_notifications():
    """
    Get unread notifications for real-time pop-ups
    ---
    tags:
      - Notifications
    responses:
      200:
        description: List of unread notifications
    """
    current_user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()
    
    return jsonify([
        {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "created_at": notification.created_at.isoformat(),
            "link_type": notification.link_type,
            "link_id": str(notification.link_id) if notification.link_id else None
        } for notification in notifications
    ])

@notifications_bp.route('/register-device', methods=['POST'])
@jwt_required()
def register_device_token():
    """
    Register FCM device token
    ---
    tags:
      - Notifications
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - token
            - platform
          properties:
            token:
              type: string
            platform:
              type: string
            device_name:
              type: string
    responses:
      200:
        description: Device registered
    """
    
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    token_str = data.get('token')
    platform = data.get('platform')
    device_name = data.get('device_name')
    subscription = data.get('subscription')  # NEW: for web push
    
    if not platform:
        return jsonify({"msg": "platform is required"}), 400
    
    if platform == 'web':
        # Web Push: requires subscription object
        if not subscription or not subscription.get('endpoint'):
            return jsonify({"msg": "subscription is required for web platform"}), 400
        
        # Find by user + platform (web users may have multiple browsers)
        existing = DeviceToken.query.filter_by(
            user_id=current_user_id,
            subscription_endpoint=subscription['endpoint']
        ).first()
        
        if existing:
            # Update existing subscription
            existing.is_active = True
            existing.subscription_p256dh = subscription['keys']['p256dh']
            existing.subscription_auth = subscription['keys']['auth']
            existing.updated_at = now_cuiaba()
        else:
            # Create new web subscription
            new_token = DeviceToken(
                user_id=current_user_id,
                platform='web',
                subscription_endpoint=subscription['endpoint'],
                subscription_p256dh=subscription['keys']['p256dh'],
                subscription_auth=subscription['keys']['auth'],
                device_name=device_name or 'Web Browser'
            )
            db.session.add(new_token)
    
    else:
        # Mobile: FCM token (existing logic)
        if not token_str:
            return jsonify({"msg": "token is required for mobile platforms"}), 400
        
        existing = DeviceToken.query.filter_by(token=token_str).first()
        
        if existing:
            # Update existing token
            existing.user_id = current_user_id
            existing.platform = platform
            existing.device_name = device_name
            existing.is_active = True
            existing.updated_at = now_cuiaba()
        else:
            # Create new token
            new_token = DeviceToken(
                user_id=current_user_id,
                token=token_str,
                platform=platform,
                device_name=device_name
            )
            db.session.add(new_token)
    
    db.session.commit()
    
    return jsonify({"msg": "Device registered successfully"}), 200

@notifications_bp.route('/<uuid:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_as_read(notification_id):
    """
    Mark a specific notification as read
    ---
    tags:
      - Notifications
    parameters:
      - in: path
        name: notification_id
        type: string
        required: true
    responses:
      200:
        description: Notification marked as read
      404:
        description: Notification not found
    """
    current_user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=notification_id, user_id=current_user_id).first_or_404()
    
    if not notification.is_read:
        notification.is_read = True
        db.session.commit()
        
    return jsonify({"message": "Notification marked as read."})

@notifications_bp.route('/<uuid:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """
    Delete a notification
    """
    current_user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=notification_id, user_id=current_user_id).first_or_404()
    
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({"message": "Notification deleted"}), 200
