from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared.extensions import db
from app.modules.identity.domain.models import User, UserProfile

profile_bp = Blueprint('profile', __name__)

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
        "subscription_status": user.subscription_status,
        "subscription_status": user.subscription_status,
        "onboarding_completed": user.onboarding_completed,
        "profile_picture": user.profile_picture
    }
    
    # profile details
    profile_data = {}
    if profile:
        profile_data = {
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
    import os
    from werkzeug.utils import secure_filename
    from flask import current_app, url_for

    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400
        
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    def allowed_file(filename):
        return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    if file and allowed_file(file.filename):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"msg": "User not found"}), 404

        filename = secure_filename(f"user_{user_id}_{file.filename}")
        
        # Ensure directory exists
        upload_folder = os.path.join(current_app.root_path, 'static/uploads/profile_pics')
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Save relative path
        relative_path = f"uploads/profile_pics/{filename}"
        user.profile_picture = relative_path
        db.session.commit()
        
        # Construct full URL
        try:
            full_url = url_for('static', filename=relative_path, _external=True)
        except:
            full_url = relative_path

        return jsonify({
            "msg": "Profile picture uploaded successfully", 
            "profile_picture": relative_path,
            "url": full_url
        }), 200
        
    return jsonify({"msg": "File type not allowed"}), 400
