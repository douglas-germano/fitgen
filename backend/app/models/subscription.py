from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    stripe_customer_id = db.Column(db.String(255))
    stripe_subscription_id = db.Column(db.String(255))
    plan = db.Column(db.String(50)) # 'monthly', 'quarterly', 'yearly'
    status = db.Column(db.String(50), default='active') # 'active', 'cancelled', 'past_due', 'expired'
    
    current_period_start = db.Column(db.DateTime)
    current_period_end = db.Column(db.DateTime)
    
    cancelled_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
