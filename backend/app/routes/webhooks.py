from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.user import User, UserProfile
from app.models.subscription import Subscription
from app.services.email_service import EmailService
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import secrets
import uuid

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/kiwify', methods=['POST'])
def kiwify_webhook():
    """
    Webhook handler for Kiwify payments
    Expected payload structure (simplified based on typical Kiwify payloads):
    {
        "order_status": "paid",
        "customer": {
            "email": "customer@email.com",
            "full_name": "Customer Name",
            "mobile": "+55..."
        },
        "subscription_id": "..." (optional)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No payload received"}), 400

        # Log payload for debugging (be careful with PII in production logs)
        current_app.logger.info(f"Kiwify Webhook received: {data}")

        # Verify event type
        event_type = data.get('webhook_event_type')
        order_status = data.get('order_status')
        
        current_app.logger.info(f"Processing Kiwify event: {event_type} | Order Status: {order_status}")

        customer = data.get('Customer', data.get('customer', {}))
        email = customer.get('email')
        name = customer.get('full_name', customer.get('name', 'Usuário FitGen'))
        
        if not email:
            current_app.logger.error("No email in Kiwify payload")
            return jsonify({"msg": "Invalid payload"}), 400

        # Find or Create User
        user = User.query.filter_by(email=email).first()
        is_new_user = False
        generated_password = None

        if not user:
            # Only create user on approved/paid events
            if event_type not in ['order_approved', 'subscription_renewed'] and order_status != 'paid':
                current_app.logger.info(f"Ignoring non-creation event for unknown user: {email}")
                return jsonify({"msg": "Ignored"}), 200

            is_new_user = True
            generated_password = secrets.token_urlsafe(8)
            
            user = User(
                email=email,
                name=name,
                password_hash=generate_password_hash(generated_password),
                role='user',
                subscription_status='active',
                onboarding_completed=False 
            )
            db.session.add(user)
            db.session.flush()
            
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
            
            current_app.logger.info(f"Created new user via Kiwify: {email}")
        
        # Handle Events
        if event_type in ['order_approved', 'subscription_renewed'] or order_status == 'paid':
            user.subscription_status = 'active'
            # Default to +30 days if expiration not mapped
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Send welcome email only for new users
            if is_new_user:
                email_service = EmailService()
                email_service.send_welcome_email(email, name, generated_password)
                
            current_app.logger.info(f"Access granted/renewed for: {email}")

        elif event_type == 'subscription_canceled':
            # Mark as canceled but don't revoke access immediately (unless refund)
            # Usually we let them finish the period.
            # But let's set status to 'canceled' to indicate no future renewal.
            user.subscription_status = 'canceled'
            current_app.logger.info(f"Subscription canceled for: {email}")

        elif event_type in ['order_refunded', 'chargeback']:
            # Revoke access immediately
            user.subscription_status = 'suspended'
            user.subscription_expires_at = datetime.utcnow()
            current_app.logger.info(f"Access revoked (refund/chargeback) for: {email}")
        
        elif event_type == 'subscription_late':
             # Notify or suspend? Let's keep active but maybe mark status
             user.subscription_status = 'past_due'
             current_app.logger.info(f"Subscription past due for: {email}")

        db.session.commit()
        return jsonify({"msg": "Webhook processed successfully"}), 200

    except Exception as e:
        current_app.logger.error(f"Error processing Kiwify webhook: {e}")
        db.session.rollback()
        return jsonify({"msg": "Error processing webhook"}), 500
