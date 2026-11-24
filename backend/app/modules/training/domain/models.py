from datetime import datetime
import uuid
from sqlalchemy import and_
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.shared.extensions import db

class WorkoutPlan(db.Model):
    __tablename__ = 'workout_plans'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    generated_by_ai = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    days = db.relationship('WorkoutDay', backref='workout_plan', cascade='all, delete-orphan', order_by='WorkoutDay.order')

    @classmethod
    def draft_filter(cls):
        # Generated previews receive their plan dates only upon first activation.
        return and_(cls.generated_by_ai.is_(True), cls.is_active.is_(False),
                    cls.start_date.is_(None), cls.end_date.is_(None))

class WorkoutDay(db.Model):
    __tablename__ = 'workout_days'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_plan_id = db.Column(UUID(as_uuid=True), db.ForeignKey('workout_plans.id'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    day_of_week = db.Column(db.String(20)) # 'monday', 'tuesday', etc.
    name = db.Column(db.String(255)) # "Treino A - Peito e Tríceps"
    muscle_groups = db.Column(JSON)
    order = db.Column(db.Integer)

    # Relationships
    exercises = db.relationship('Exercise', backref='workout_day', cascade='all, delete-orphan', order_by='Exercise.order')

class Exercise(db.Model):
    __tablename__ = 'exercises'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_day_id = db.Column(UUID(as_uuid=True), db.ForeignKey('workout_days.id'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    name = db.Column(db.String(255), nullable=False)
    exercise_library_id = db.Column(UUID(as_uuid=True), db.ForeignKey('exercise_library.id'), nullable=True)
    description = db.Column(db.Text)
    sets = db.Column(db.Integer)
    reps = db.Column(db.String(50)) # "8-12" or "to failure"
    rest_seconds = db.Column(db.Integer)
    weight_kg = db.Column(db.Float, nullable=True)
    order = db.Column(db.Integer)
    notes = db.Column(db.Text)
    # Relationships
    exercise_library = db.relationship('ExerciseLibrary', back_populates='exercises')

class WorkoutSession(db.Model):
    __tablename__ = 'workout_sessions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    workout_day_id = db.Column(UUID(as_uuid=True), db.ForeignKey('workout_days.id'), nullable=False)
    
    status = db.Column(db.String(50), default='in_progress') # 'in_progress', 'paused', 'completed', 'cancelled'
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    paused_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    total_duration_seconds = db.Column(db.Integer, default=0)
    calories_burned = db.Column(db.Float)
    notes = db.Column(db.Text)

    # Relationships
    logs = db.relationship('ExerciseLog', backref='workout_session', cascade='all, delete-orphan')

class ExerciseLog(db.Model):
    __tablename__ = 'exercise_logs'
    # Exercise history lookups (per user, per library exercise)
    __table_args__ = (db.Index('ix_exercise_logs_user_library', 'user_id', 'exercise_library_id'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('workout_sessions.id'), nullable=False)
    exercise_id = db.Column(UUID(as_uuid=True), db.ForeignKey('exercises.id'), nullable=False)
    exercise_library_id = db.Column(UUID(as_uuid=True), nullable=True)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    set_number = db.Column(db.Integer)
    reps_done = db.Column(db.Integer)
    weight_used_kg = db.Column(db.Float)
    completed = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class OutdoorSession(db.Model):
    __tablename__ = 'outdoor_sessions'
    __table_args__ = (db.Index('ix_outdoor_sessions_user_started', 'user_id', 'started_at'),)

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    id = db.Column(UUID(as_uuid=True), primary_key=True)
    activity_type = db.Column(db.String(4), nullable=False)
    started_at = db.Column(db.DateTime, nullable=False)  # UTC
    completed_at = db.Column(db.DateTime, nullable=False)  # UTC
    duration_seconds = db.Column(db.Integer, nullable=False)
    distance_meters = db.Column(db.Float, nullable=False)
    calories = db.Column(db.Integer)
    route = db.Column(JSON, nullable=False)
