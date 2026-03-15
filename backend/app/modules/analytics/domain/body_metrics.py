from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.shared.extensions import db

class BodyMetric(db.Model):
    __tablename__ = 'body_metrics'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    weight_kg = db.Column(db.Float, nullable=False)
    body_fat_percentage = db.Column(db.Float, nullable=True)
    muscle_mass_kg = db.Column(db.Float, nullable=True)
    
    waist_cm = db.Column(db.Float, nullable=True)
    chest_cm = db.Column(db.Float, nullable=True)
    arm_cm = db.Column(db.Float, nullable=True)
    thigh_cm = db.Column(db.Float, nullable=True)
    
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
