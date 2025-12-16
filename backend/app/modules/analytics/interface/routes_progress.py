from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.modules.analytics.domain.progress_snapshot import ProgressSnapshot

progress_bp = Blueprint('progress', __name__)

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
