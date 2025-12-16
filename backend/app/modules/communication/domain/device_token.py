from app.shared.extensions import db
import uuid
from datetime import datetime

class DeviceToken(db.Model):
    __tablename__ = 'device_tokens'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    platform = db.Column(db.String(20), nullable=False)  # 'ios' or 'android' or 'web'
    device_name = db.Column(db.String(100))
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='device_tokens')
    
    def __repr__(self):
        return f'<DeviceToken {self.platform}: {self.token[:20]}...>'
