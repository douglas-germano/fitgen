from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.modules.communication.domain.feedback import Feedback

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_feedback():
    """
    Get all feedback submitted by the current user
    ---
    tags:
      - Feedback
    responses:
      200:
        description: List of feedback items
    """
    current_user_id = get_jwt_identity()
    feedback_items = Feedback.query.filter_by(user_id=current_user_id).order_by(Feedback.created_at.desc()).all()
    
    return jsonify([
        {
            "id": item.id,
            "title": item.title,
            "type": item.type,
            "category": item.category,
            "status": item.status,
            "created_at": item.created_at.isoformat()
        } for item in feedback_items
    ])

@feedback_bp.route('/<uuid:feedback_id>', methods=['GET'])
@jwt_required()
def get_feedback_by_id(feedback_id):
    """
    Get a specific feedback item by its ID
    ---
    tags:
      - Feedback
    parameters:
      - in: path
        name: feedback_id
        type: string
        required: true
    responses:
      200:
        description: Feedback details
      404:
        description: Feedback not found
    """
    current_user_id = get_jwt_identity()
    feedback_item = Feedback.query.filter_by(id=feedback_id, user_id=current_user_id).first_or_404()
    
    return jsonify({
        "id": feedback_item.id,
        "title": feedback_item.title,
        "description": feedback_item.description,
        "type": feedback_item.type,
        "category": feedback_item.category,
        "status": feedback_item.status,
        "created_at": feedback_item.created_at.isoformat(),
        "admin_response": feedback_item.admin_response
    })
