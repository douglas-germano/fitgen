from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.shared.extensions import db

class Subscription(db.Model):
    """Subscription model for managing user subscriptions and payments"""
    __tablename__ = 'subscriptions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Legacy Stripe fields (kept for backwards compatibility)
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True)
    
    # Plan details
    plan_type = db.Column(db.String(50), nullable=False, default='free')  # 'free', 'premium', 'pro'
    plan = db.Column(db.String(50), nullable=True) # 'monthly', 'quarterly', 'yearly' (legacy)
    status = db.Column(db.String(50), default='active') # 'active', 'cancelled', 'past_due', 'expired'
    
    # Dates
    start_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    next_billing_date = db.Column(db.DateTime, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    
    # Payment
    payment_method = db.Column(db.String(100), nullable=True)  # 'credit_card', 'pix', 'boleto'
    price_monthly = db.Column(db.Numeric(10, 2), default=0.00)  # Monthly price
    currency = db.Column(db.String(3), default='BRL')
    
    # External IDs (for payment gateway integration - generic)
    external_subscription_id = db.Column(db.String(255), nullable=True, index=True)
    external_customer_id = db.Column(db.String(255), nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payment_history = db.relationship('PaymentHistory', back_populates='subscription', lazy='dynamic', cascade='all, delete-orphan')
    
    @property
    def is_active(self):
        """Check if subscription is currently active"""
        if self.status != 'active':
            return False
        if self.current_period_end and self.current_period_end < datetime.utcnow():
            return False
        return True
    
    @property
    def days_until_renewal(self):
        """Days until next billing"""
        if not self.next_billing_date:
            return None
        delta = self.next_billing_date - datetime.utcnow()
        return delta.days if delta.days > 0 else 0
    
    def cancel(self):
        """Cancel subscription"""
        self.status = 'cancelled'
        self.cancelled_at = datetime.utcnow()
        db.session.commit()
    
    def reactivate(self, end_date=None):
        """Reactivate cancelled subscription"""
        self.status = 'active'
        self.cancelled_at = None
        if end_date:
            self.current_period_end = end_date
        db.session.commit()


class PaymentHistory(db.Model):
    """Payment history for subscriptions"""
    __tablename__ = 'payment_history'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = db.Column(UUID(as_uuid=True), db.ForeignKey('subscriptions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Payment details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='BRL')
    status = db.Column(db.String(50), nullable=False)  # 'pending', 'completed', 'failed', 'refunded'
    payment_method = db.Column(db.String(100), nullable=True)
    
    # External references
    external_payment_id = db.Column(db.String(255), nullable=True, index=True)
    invoice_url = db.Column(db.String(500), nullable=True)
    
    # Dates
    payment_date = db.Column(db.DateTime, nullable=True)  # When payment was completed
    due_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Metadata
    notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    subscription = db.relationship('Subscription', back_populates='payment_history')
    
    @property
    def is_paid(self):
        """Check if payment is completed"""
        return self.status == 'completed'
