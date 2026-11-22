from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from marshmallow import ValidationError
from app.shared.extensions import db, limiter
from app.modules.identity.domain.models import User
from app.modules.identity.interface.schemas import RegisterSchema, LoginSchema
from app.shared.utils.password import validate_password_strength
from app.modules.identity.application.social_auth import SocialAuthError, verify_id_token
from datetime import datetime, timedelta
import secrets

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per minute")
def register():
    """
    Register new user with validation
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
            - password
            - name
          properties:
            email:
              type: string
            password:
              type: string
            name:
              type: string
    responses:
      201:
        description: User registered successfully
      400:
        description: Validation error
      409:
        description: Email already exists
    """
    
    data = request.get_json()
    
    # Validate request data
    schema = RegisterSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        current_app.logger.warning(f'Registration validation failed: {err.messages}')
        return jsonify({"msg": "Validation error", "errors": err.messages}), 400
    
    # Check password strength
    valid, msg = validate_password_strength(validated_data['password'])
    if not valid:
        current_app.logger.warning(f'Weak password attempt for {validated_data["email"]}')
        return jsonify({"msg": msg}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=validated_data['email']).first():
        current_app.logger.warning(f'Registration attempt with existing email: {validated_data["email"]}')
        return jsonify({"msg": "Email já cadastrado"}), 409
    
    # Sanitize and validate phone
    phone = validated_data.get('phone')
    if phone:
        # Remove non-digits
        import re
        phone = re.sub(r'\D', '', phone)
        # Check if phone already exists
        if User.query.filter_by(phone=phone).first():
            current_app.logger.warning(f'Registration attempt with existing phone: {phone}')
            return jsonify({"msg": "WhatsApp já cadastrado"}), 409

    # Hash password
    hashed_password = generate_password_hash(validated_data['password'])
    
    # Create new user
    new_user = User(
        email=validated_data['email'],
        password_hash=hashed_password,
        name=validated_data['name'],
        phone=phone,
        subscription_status='free'  # no access until a subscription / trial starts
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    current_app.logger.info(f'New user registered: {new_user.email}')
    
    return jsonify({
        "msg": "Usuário registrado com sucesso",
        "user_id": str(new_user.id)
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login with rate limiting
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
            password:
              type: string
    responses:
      200:
        description: Login successful
      401:
        description: Invalid credentials
      403:
        description: Account suspended or inactive
    """
    # Rate limit: 5 login attempts per minute per IP
    limiter = current_app.limiter
    limiter.limit("5 per minute")(lambda: None)()
    
    data = request.get_json()
    
    # Validate request data
    schema = LoginSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        current_app.logger.warning(f'Login validation failed: {err.messages}')
        return jsonify({"msg": "Validation error", "errors": err.messages}), 400
    
    user = User.query.filter_by(email=validated_data['email']).first()
    
    if not user or not user.password_hash or not check_password_hash(user.password_hash, validated_data['password']):
        current_app.logger.warning(f'Failed login attempt for: {validated_data["email"]}')
        return jsonify({"msg": "Credenciais inválidas"}), 401

    blocked = _blocked_response(user)
    if blocked:
        current_app.logger.warning(f'Blocked login attempt for: {validated_data["email"]}')
        return blocked

    current_app.logger.info(f'User logged in: {user.email}')
    return jsonify(_session_payload(user)), 200


def _blocked_response(user):
    """403 response when the account can't sign in, else None."""
    if not user.is_active:
        return jsonify({"msg": "Conta desativada"}), 403
    if user.subscription_status == 'suspended':
        return jsonify({
            "msg": "Acesso suspenso. Sua assinatura expirou.",
            "status": "suspended"
        }), 403
    return None


def _session_payload(user, **extra):
    """Issue tokens and build the login response (also stamps last_login)."""
    user.last_login = datetime.utcnow()
    db.session.commit()

    onboarding_done = user.onboarding_completed
    if user.profile and hasattr(user.profile, 'onboarding_completed'):
        onboarding_done = onboarding_done or user.profile.onboarding_completed

    return {
        "access_token": create_access_token(identity=str(user.id)),
        "refresh_token": create_refresh_token(identity=str(user.id)),
        "onboarding_completed": onboarding_done,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        **extra,
    }


@auth_bp.route('/social', methods=['POST'])
@limiter.limit("10 per minute")
def social_login():
    """
    Sign in (or sign up) with a Google or Apple id_token
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - provider
            - id_token
          properties:
            provider:
              type: string
              enum: [google, apple]
            id_token:
              type: string
            name:
              type: string
              description: Apple only sends the name on the first sign-in; the app forwards it
    responses:
      200:
        description: Login successful (created=true when the account is new)
      401:
        description: Invalid token
      403:
        description: Account suspended or inactive
    """
    data = request.get_json(silent=True) or {}
    provider = data.get('provider')
    token = data.get('id_token')
    if provider not in ('google', 'apple') or not token:
        return jsonify({"msg": "provider e id_token são obrigatórios"}), 400

    try:
        identity = verify_id_token(provider, token)
    except SocialAuthError as err:
        current_app.logger.warning(f'Social login rejected ({provider}): {err}')
        return jsonify({"msg": str(err)}), 401

    sub_column = User.google_sub if provider == 'google' else User.apple_sub
    sub_attr = 'google_sub' if provider == 'google' else 'apple_sub'
    user = User.query.filter(sub_column == identity['sub']).first()
    created = False

    if not user:
        email = identity['email']
        if not email:
            return jsonify({"msg": "Não recebemos seu email. Tente outro método de login."}), 400
        user = User.query.filter_by(email=email).first()
        if user:
            # Only link to an existing account when the provider vouches for the email.
            if not identity['email_verified']:
                return jsonify({"msg": "Email não verificado pelo provedor"}), 409
            setattr(user, sub_attr, identity['sub'])
        else:
            name = (data.get('name') or identity['name'] or '').strip() or email.split('@')[0]
            user = User(
                email=email,
                password_hash=None,
                name=name[:100],
                subscription_status='free',
            )
            setattr(user, sub_attr, identity['sub'])
            db.session.add(user)
            created = True
        db.session.commit()

    blocked = _blocked_response(user)
    if blocked:
        return blocked

    current_app.logger.info(f'User logged in via {provider}: {user.email} (created={created})')
    return jsonify(_session_payload(user, created=created)), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Token refreshed
        schema:
          type: object
          properties:
            access_token:
              type: string
    """
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    
    current_app.logger.info(f'Token refreshed for user: {current_user_id}')
    
    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    Get current user info
    ---
    tags:
      - Auth
    responses:
      200:
        description: User info
      404:
        description: User not found
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        current_app.logger.error(f'User not found: {current_user_id}')
        return jsonify({"msg": "User not found"}), 404
    
    return jsonify({
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "subscription_status": user.subscription_status,
        "onboarding_completed": user.onboarding_completed,
        "has_password": bool(user.password_hash)
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Request password reset
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - email
          properties:
            email:
              type: string
    responses:
      200:
        description: Password reset email sent (simulated)
      400:
        description: Validation error
    """
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"msg": "Email é obrigatório"}), 400
        
    user = User.query.filter_by(email=email).first()
    
    # Even if user not found, return 200 to prevent email enumeration
    if not user:
        # Simulate processing time
        return jsonify({"msg": "Se o email existir, as instruções foram enviadas."}), 200
        
    # Generate reset token
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    
    db.session.commit()
    
    # Send email via Brevo
    from app.modules.communication.application.email_service import EmailService
    import os
    email_service = EmailService()
    
    # The web reset page lives on the admin site (frontend `reset-password`, admin.fitgen.pro).
    frontend_url = os.getenv('FRONTEND_URL', 'https://admin.fitgen.pro').rstrip('/')
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    # Try to send email, log result
    email_sent = email_service.send_password_reset_email(email, reset_link)
    
    if email_sent:
        current_app.logger.info(f"Password reset email sent to {email}")
    else:
        current_app.logger.error(f"Failed to send password reset email to {email}")
    
    # Return 200 regardless of email success to avoid leaking info, 
    # but in dev/debug we might want to know.
    
    return jsonify({
        "msg": "Se o email existir, as instruções foram enviadas.",
        "debug_link": reset_link if current_app.debug else None
    }), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset password with token
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - token
            - new_password
          properties:
            token:
              type: string
            new_password:
              type: string
    responses:
      200:
        description: Password reset successfully
      400:
        description: Invalid or expired token
    """
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({"msg": "Token e nova senha são obrigatórios"}), 400
        
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        return jsonify({"msg": "Token inválido ou expirado"}), 400
        
    # Validate new password
    valid, msg = validate_password_strength(new_password)
    if not valid:
        return jsonify({"msg": msg}), 400
        
    # Update password
    user.password_hash = generate_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    
    db.session.commit()
    
    return jsonify({"msg": "Senha redefinida com sucesso"}), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change password for logged-in user
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - old_password
            - new_password
          properties:
            old_password:
              type: string
            new_password:
              type: string
    responses:
      200:
        description: Password changed successfully
      400:
        description: Validation error
      401:
        description: Incorrect old password
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    user = User.query.get(current_user_id)

    # Google/Apple-only accounts have no password yet: let them set one.
    if not new_password or (user.password_hash and not old_password):
        return jsonify({"msg": "Senha atual e nova senha são obrigatórias"}), 400

    if user.password_hash and not check_password_hash(user.password_hash, old_password):
        return jsonify({"msg": "Senha atual incorreta"}), 401
    
    # Validate new password
    valid, msg = validate_password_strength(new_password)
    if not valid:
        return jsonify({"msg": msg}), 400
        
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({"msg": "Senha alterada com sucesso"}), 200


