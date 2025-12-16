from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.modules.identity.domain.models import User

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or user.role != 'admin':
                return jsonify({"msg": "Admin access required"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def tenant_required():
    """
    Decorator to ensure user context is valid and subscription is active.
    Blocks suspended users (those who stopped paying) but preserves their data.
    Active = Has access | Suspended = Access blocked but data preserved
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({"msg": "User not found"}), 404
            
            # Check if user subscription is suspended (stopped paying)
            if user.subscription_status == 'suspended':
                return jsonify({
                    "msg": "Acesso suspenso. Sua assinatura expirou.",
                    "status": "suspended"
                }), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper
