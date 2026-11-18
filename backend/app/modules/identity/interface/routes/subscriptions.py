import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import Subscription
from app.modules.identity.application.revenuecat import sync_user_access
from app.shared.subscription_access import access_payload
from datetime import datetime, timedelta
import uuid

subscriptions_bp = Blueprint('subscriptions', __name__)

@subscriptions_bp.route('/checkout', methods=['POST'])
@jwt_required()
def create_checkout_session():
    """
    Create Stripe checkout session
    ---
    tags:
      - Subscriptions
    responses:
      200:
        description: Checkout session created
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    # Mock checkout session creation
    session_id = f"cs_test_{uuid.uuid4()}"
    
    # In a real app, we would talk to Stripe here
    # For now, we return a mock success URL that the frontend would redirect to
    # Or just return the session ID for the frontend to confirm
    
    return jsonify({
        "session_id": session_id,
        "checkout_url": f"https://mock-payment-gateway.com/pay/{session_id}",
        "msg": "Checkout session created. Use the session_id to trigger the mock webhook."
    }), 200

@subscriptions_bp.route('/webhook', methods=['POST'])
# In real life, this would NOT use jwt_required, but would verify Stripe signature
# For this mock, we'll allow anyone to hit it if they know the simplified logic
def webhook_handler():
    """
    Stripe webhook handler
    ---
    tags:
      - Subscriptions
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            type:
              type: string
            user_email:
              type: string
    responses:
      200:
        description: Event processed
    """
    data = request.get_json()
    
    event_type = data.get('type')
    
    if event_type == 'payment.success':
        # Mock payload: {"type": "payment.success", "user_email": "user@example.com"}
        user_email = data.get('user_email')
        
        user = User.query.filter_by(email=user_email).first()
        if user:
            # Update user status
            user.subscription_status = 'active'
            # 1 month subscription
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Create/Update Subscription model provided mock data
            sub = Subscription.query.filter_by(user_id=user.id).first()
            if not sub:
                sub = Subscription(
                    user_id=user.id,
                    stripe_customer_id=f"cus_test_{uuid.uuid4()}",
                    stripe_subscription_id=f"sub_test_{uuid.uuid4()}"
                )
                db.session.add(sub)
            
            sub.status = 'active'
            sub.current_period_end = user.subscription_expires_at
            
            db.session.commit()
            return jsonify({"msg": f"Subscription activated for {user_email}"}), 200
            
    return jsonify({"msg": "Event ignored"}), 200

@subscriptions_bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """
    Get subscription status
    ---
    tags:
      - Subscriptions
    responses:
      200:
        description: Subscription status
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    return jsonify({
        "status": user.subscription_status,
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        "is_active": user.subscription_status == 'active',
        **access_payload(user)
    }), 200


@subscriptions_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_subscription():
    """Refresh access from RevenueCat right after a purchase/restore (the webhook may lag)."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"msg": "User not found"}), 404
    if not os.getenv('REVENUECAT_SECRET_API_KEY'):
        return jsonify({"msg": "Sync not configured", **access_payload(user)}), 503
    try:
        outcome = sync_user_access(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("RevenueCat sync failed for %s", user.email)
        return jsonify({"msg": "Could not reach RevenueCat", **access_payload(user)}), 502
    return jsonify({**outcome, **access_payload(user)}), 200
