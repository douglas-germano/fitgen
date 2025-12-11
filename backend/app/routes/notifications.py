from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.notification import Notification
from app.extensions import db

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
            "created_at": notification.created_at.isoformat()
        } for notification in notifications
    ])

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
