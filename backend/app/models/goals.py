from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    type = db.Column(db.String(50)) # 'weight', 'workout_frequency', 'streak', 'strength', 'custom'
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    target_value = db.Column(db.Float)
    current_value = db.Column(db.Float)
    unit = db.Column(db.String(50)) # "kg", "dias", "reps"
    
    deadline = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), default='active') # 'active', 'completed', 'failed', 'cancelled'
    
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
