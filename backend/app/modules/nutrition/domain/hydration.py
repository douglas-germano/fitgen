from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.shared.extensions import db

class HydrationLog(db.Model):
    __tablename__ = 'hydration_logs'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    amount_ml = db.Column(db.Integer, nullable=False)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class HydrationGoal(db.Model):
    __tablename__ = 'hydration_goals'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    daily_goal_ml = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
