from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.shared.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), default='user')  # 'user' or 'admin'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    subscription_status = db.Column(db.String(50), default='active')  # 'active', 'suspended', 'canceled', 'past_due'
    subscription_expires_at = db.Column(db.DateTime, nullable=True)  # Data de expiração da assinatura
    onboarding_completed = db.Column(db.Boolean, default=False, nullable=False)
    profile_picture = db.Column(db.String(500), nullable=True) # URL or Path
    phone = db.Column(db.String(20), unique=True, nullable=True) # WhatsApp number
    
    # Password Reset
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Soft delete support
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False, lazy=True)
    workouts = db.relationship('WorkoutPlan', backref='user', lazy='dynamic')
    meals = db.relationship('Meal', backref='user', lazy='dynamic')
    goals = db.relationship('Goal', backref='user', lazy='dynamic')
    body_metrics = db.relationship('BodyMetric', backref='user', lazy='dynamic')
    hydration_logs = db.relationship('HydrationLog', backref='user', lazy='dynamic')
    subscription = db.relationship('Subscription', backref='user', uselist=False)
    feedback = db.relationship('Feedback', foreign_keys='Feedback.user_id', lazy='dynamic')
    notifications = db.relationship('Notification', back_populates='user', lazy='dynamic')
    progress_snapshots = db.relationship('ProgressSnapshot', back_populates='user', lazy='dynamic')
    user_streaks = db.relationship('UserStreak', back_populates='user', uselist=False, lazy=True)

    @property
    def is_deleted(self):
        """Check if user is soft deleted"""
        return self.deleted_at is not None
    
    def soft_delete(self):
        """Soft delete user"""
        self.deleted_at = datetime.utcnow()
        self.is_active = False

    def __repr__(self):
        return f'<User {self.email}>'

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False, unique=True)
    
    age = db.Column(db.Integer)
    gender = db.Column(db.String(50))  # 'male', 'female', 'other'
    height_cm = db.Column(db.Float)
    current_weight_kg = db.Column(db.Float)
    target_weight_kg = db.Column(db.Float)
    activity_level = db.Column(db.String(50))  # 'sedentary', 'light', 'moderate', 'active', 'very_active'
    fitness_goal = db.Column(db.String(50))  # 'lose_weight', 'gain_muscle', 'maintain', 'gain_strength', 'improve_health'
    experience_level = db.Column(db.String(50)) # 'beginner', 'intermediate', 'advanced'
    
    available_days = db.Column(JSON)  # ['monday', 'wednesday', 'friday']
    workout_duration_minutes = db.Column(db.Integer)
    equipment_available = db.Column(JSON)  # ['dumbbells', 'barbell', 'machines', 'bodyweight']
    
    injuries_limitations = db.Column(db.Text)
    dietary_restrictions = db.Column(db.Text)
    
    # Onboarding status
    onboarding_completed = db.Column(db.Boolean, default=False, nullable=False)
    
    bmr = db.Column(db.Float) # Taxa Metabólica Basal
    tdee = db.Column(db.Float) # Gasto Energético Total
    
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<UserProfile user_id={self.user_id}>'
