from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.shared.extensions import db

class Achievement(db.Model):
    __tablename__ = 'achievements'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = db.Column(db.String(100), unique=True, nullable=False) # "first_workout", "7_day_streak"
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(255)) # Icon name or URL
    category = db.Column(db.String(50)) # 'workout', 'nutrition', 'consistency', 'milestone'
    
    requirement_type = db.Column(db.String(50))
    requirement_value = db.Column(db.Float)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('achievements.id'), nullable=False)
    
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)
