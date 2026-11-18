import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import Subscription
from app.modules.identity.application.revenuecat import sync_user_access
from app.shared.subscription_access import access_payload, user_has_access
from app.modules.identity.application import stripe_billing
from datetime import datetime, timedelta
import uuid

subscriptions_bp = Blueprint('subscriptions', __name__)

@subscriptions_bp.route('/stripe/checkout', methods=['POST'])
@jwt_required()
def create_stripe_checkout():
    """Stripe Checkout (card + Pix) for the web subscription at fitgen.pro/assinar."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"msg": "User not found"}), 404
    if user_has_access(user) and user.subscription_status == 'active':
        return jsonify({"msg": "Você já tem uma assinatura ativa.", **access_payload(user)}), 409
    try:
        url = stripe_billing.create_checkout_session(user)
    except stripe_billing.StripeNotConfigured as exc:
        current_app.logger.error("Stripe checkout unavailable: %s", exc)
        return jsonify({"msg": "Pagamento pelo site indisponível no momento."}), 503
    except Exception:
        current_app.logger.exception("Stripe checkout failed")
        return jsonify({"msg": "Não foi possível iniciar o pagamento. Tente de novo."}), 502
    return jsonify({"checkout_url": url}), 200


@subscriptions_bp.route('/stripe/portal', methods=['POST'])
@jwt_required()
def create_stripe_portal():
    """Stripe customer portal (cancel, change card/Pix) for web subscribers."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"msg": "User not found"}), 404
    try:
        return jsonify({"portal_url": stripe_billing.create_portal_session(user)}), 200
    except LookupError:
        return jsonify({"msg": "Nenhuma assinatura feita pelo site."}), 404
    except stripe_billing.StripeNotConfigured:
        return jsonify({"msg": "Pagamento pelo site indisponível no momento."}), 503


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
