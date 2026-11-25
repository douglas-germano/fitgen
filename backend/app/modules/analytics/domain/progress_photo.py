import uuid
from datetime import datetime
from app.shared.extensions import db


class ProgressPhoto(db.Model):
    """Private body progress photo. Only the storage key is kept; files are served via signed URLs."""
    __tablename__ = 'progress_photos'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Uuid, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    pose = db.Column(db.String(8), nullable=False)  # front | side | back
    taken_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    storage_key = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
