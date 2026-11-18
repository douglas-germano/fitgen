from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared import storage
from app.shared.extensions import db
from app.shared.subscription_access import access_payload
from app.modules.identity.domain.models import User, UserProfile

profile_bp = Blueprint('profile', __name__)

PROFILE_PICS_DIR = 'uploads/profile_pics'
MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024


def _image_extension(data: bytes):
    """Image format from magic bytes; None for anything we don't store."""
    if data.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if data[:6] in (b'GIF87a', b'GIF89a'):
        return 'gif'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    return None

@profile_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get user profile
    ---
    tags:
      - Profile
    responses:
      200:
        description: User profile data
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    profile = user.profile
    
    # basic user info
    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        **access_payload(user),
        "onboarding_completed": user.onboarding_completed,
        "profile_picture": storage.display_value(user.profile_picture)
    }
    
    # profile details
    profile_data = {}
    if profile:
        profile_data = {
            "onboarding_answers": profile.onboarding_answers or {},
            "experience_level": profile.experience_level,
            "age": profile.age,
            "gender": profile.gender,
            "height_cm": profile.height_cm,
            "current_weight_kg": profile.current_weight_kg,
            "target_weight_kg": profile.target_weight_kg,
            "activity_level": profile.activity_level,
            "fitness_goal": profile.fitness_goal,
            "available_days": profile.available_days,
            "workout_duration_minutes": profile.workout_duration_minutes,
            "equipment_available": profile.equipment_available,
            "injuries_limitations": profile.injuries_limitations,
            "dietary_restrictions": profile.dietary_restrictions,
            "bmr": profile.bmr,
            "tdee": profile.tdee,
            "xp": profile.xp or 0,
            "level": profile.level or 1
        }
        
    return jsonify({**user_data, **profile_data}), 200

@profile_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Update user profile
    ---
    tags:
      - Profile
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            current_weight_kg:
              type: number
            target_weight_kg:
              type: number
            activity_level:
              type: string
            fitness_goal:
              type: string
    responses:
      200:
        description: Profile updated
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    data = request.get_json()
    profile = user.profile
    
    if not profile:
        # Should usually exist if onboarding is done, but safe to create if missing
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
    
    # Update allowed fields
    editable_fields = [
        'age', 'gender', 'height_cm', 'current_weight_kg', 'target_weight_kg',
        'activity_level', 'fitness_goal', 'available_days', 'workout_duration_minutes',
        'equipment_available', 'injuries_limitations', 'dietary_restrictions'
    ]
    
    for field in editable_fields:
        if field in data:
            setattr(profile, field, data[field])
            
    # Update user base fields if provided
    if 'name' in data:
        user.name = data['name']
        
    db.session.commit()
    
    return jsonify({"msg": "Profile updated successfully"}), 200

@profile_bp.route('/image', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """
    Upload profile picture
    ---
    tags:
      - Profile
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Image file (jpg, jpeg, png)
    responses:
      200:
        description: Image uploaded successfully
      400:
        description: Invalid file or format
    """
    import uuid
    from flask import url_for

    file = request.files.get('file')
    if not file:
        return jsonify({"msg": "Nenhuma imagem enviada."}), 400

    # Phones send names like "IMG_0001.HEIC" (or none) even for JPEG data,
    # so the format comes from the file's bytes, not its name.
    data = file.read(MAX_PROFILE_IMAGE_BYTES + 1)
    if not data:
        return jsonify({"msg": "Nenhuma imagem enviada."}), 400
    if len(data) > MAX_PROFILE_IMAGE_BYTES:
        return jsonify({"msg": "A imagem é muito grande. Use uma de até 10 MB."}), 400
    ext = _image_extension(data)
    if not ext:
        return jsonify({"msg": "Formato não suportado. Envie uma foto JPG, PNG, GIF ou WEBP."}), 400

    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # A new name on every upload, so clients never show a cached old photo.
    try:
        stored = storage.save('avatars', f"user_{user.id}_{uuid.uuid4().hex}.{ext}", data, ext)
    except storage.StorageError as exc:
        return jsonify({"msg": str(exc)}), 503

    previous = user.profile_picture
    user.profile_picture = stored
    db.session.commit()

    # Remove the replaced file (never external URLs such as social login photos).
    if previous and (storage.is_r2(previous) or previous.startswith(f"{PROFILE_PICS_DIR}/user_{user.id}_")):
        storage.remove('avatars', previous)

    shown = storage.display_value(stored)
    try:
        full_url = shown if shown.startswith('http') else url_for('static', filename=shown, _external=True)
    except Exception:
        full_url = shown

    return jsonify({
        "msg": "Profile picture uploaded successfully",
        "profile_picture": shown,
        "url": full_url
    }), 200
