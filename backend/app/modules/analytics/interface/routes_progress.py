import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.shared import storage
from app.shared.extensions import db
from app.modules.analytics.domain.progress_photo import ProgressPhoto
from app.modules.identity.interface.routes.profile import _image_extension
from app.modules.analytics.domain.progress_snapshot import ProgressSnapshot

progress_bp = Blueprint('progress', __name__)
PHOTO_KIND = 'progress-photos'

@progress_bp.route('/snapshots', methods=['GET'])
@jwt_required()
def get_progress_snapshots():
    """
    Get progress snapshots
    ---
    tags:
      - Progress
    parameters:
      - in: query
        name: type
        type: string
        enum: [weekly, monthly]
    responses:
      200:
        description: List of progress snapshots
    """
    current_user_id = get_jwt_identity()
    snapshot_type = request.args.get('type') # 'weekly', 'monthly', etc.
    
    query = ProgressSnapshot.query.filter_by(user_id=current_user_id)
    
    if snapshot_type:
        query = query.filter_by(snapshot_type=snapshot_type)
        
    snapshots = query.order_by(ProgressSnapshot.snapshot_date.desc()).all()
    
    return jsonify([
        {
            "id": snapshot.id,
            "snapshot_date": snapshot.snapshot_date.isoformat(),
            "snapshot_type": snapshot.snapshot_type,
            "total_workouts": snapshot.total_workouts,
            "weight_change_kg": snapshot.weight_change_kg
        } for snapshot in snapshots
    ])


# --- Private progress photos (LGPD: never public URLs, signed on demand) ---
POSES = ('front', 'side', 'back')
MAX_PHOTO_BYTES = 10 * 1024 * 1024


def _photo_url(photo):
    payload = storage.image_payload(PHOTO_KIND, photo.storage_key)
    if not payload:
        return None
    return payload.get('url') or payload.get('data_uri')


def _serialize_photo(photo):
    return {
        "id": photo.id,
        "pose": photo.pose,
        "taken_at": photo.taken_at.isoformat(),
        "url": _photo_url(photo),
    }


@progress_bp.route('/photos', methods=['GET'])
@jwt_required()
def list_photos():
    """
    List progress photos (newest first, signed URLs)
    ---
    tags:
      - Progress
    responses:
      200:
        description: List of photos
    """
    user_id = uuid.UUID(get_jwt_identity())
    photos = ProgressPhoto.query.filter_by(user_id=user_id).order_by(
        ProgressPhoto.taken_at.desc(), ProgressPhoto.created_at.desc()).all()
    return jsonify([_serialize_photo(p) for p in photos]), 200


@progress_bp.route('/photos', methods=['POST'])
@jwt_required()
def upload_photo():
    """
    Upload a progress photo
    ---
    tags:
      - Progress
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: image
        type: file
        required: true
      - in: formData
        name: pose
        type: string
        enum: [front, side, back]
        required: true
      - in: formData
        name: taken_at
        type: string
    responses:
      201:
        description: Photo created
    """
    user_id = uuid.UUID(get_jwt_identity())
    pose = (request.form.get('pose') or '').strip().lower()
    if pose not in POSES:
        return jsonify({"msg": "Pose inválida. Use front, side ou back."}), 400

    taken_at = datetime.utcnow()
    raw_taken = (request.form.get('taken_at') or '').strip()
    if raw_taken:
        try:
            parsed = datetime.fromisoformat(raw_taken.replace('Z', '+00:00'))
            taken_at = parsed.astimezone(timezone.utc).replace(tzinfo=None) if parsed.tzinfo else parsed
        except ValueError:
            return jsonify({"msg": "Data inválida."}), 400

    file = request.files.get('image')
    if not file:
        return jsonify({"msg": "Nenhuma imagem enviada."}), 400
    data = file.read(MAX_PHOTO_BYTES + 1)
    if not data:
        return jsonify({"msg": "Nenhuma imagem enviada."}), 400
    if len(data) > MAX_PHOTO_BYTES:
        return jsonify({"msg": "A imagem é muito grande. Use uma de até 10 MB."}), 400
    ext = _image_extension(data)
    if not ext:
        return jsonify({"msg": "Formato não suportado. Envie uma foto JPG, PNG, GIF ou WEBP."}), 400

    photo_id = str(uuid.uuid4())
    try:
        stored = storage.save(PHOTO_KIND, f"{user_id}_{photo_id}.{ext}", data, ext)
    except storage.StorageError as exc:
        return jsonify({"msg": str(exc)}), 503

    photo = ProgressPhoto(id=photo_id, user_id=user_id, pose=pose, taken_at=taken_at, storage_key=stored)
    db.session.add(photo)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        storage.remove(PHOTO_KIND, stored)
        raise
    return jsonify(_serialize_photo(photo)), 201


@progress_bp.route('/photos/<photo_id>', methods=['DELETE'])
@jwt_required()
def delete_photo(photo_id):
    """
    Delete a progress photo (owner only)
    ---
    tags:
      - Progress
    responses:
      204:
        description: Deleted
      404:
        description: Not found
    """
    user_id = uuid.UUID(get_jwt_identity())
    photo = ProgressPhoto.query.filter_by(id=photo_id, user_id=user_id).first()
    if not photo:
        return jsonify({"msg": "Photo not found"}), 404
    key = photo.storage_key
    db.session.delete(photo)
    db.session.commit()
    storage.remove(PHOTO_KIND, key)
    return '', 204
