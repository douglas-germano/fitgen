from typing import Optional
import datetime
import uuid
from sqlalchemy import (
    CheckConstraint, Date, DateTime, Double, Enum, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.extensions import db

class ProgressSnapshot(db.Model):
    __tablename__ = 'progress_snapshots'
    __table_args__ = (
        db.CheckConstraint('total_calories_burned >= 0::double precision', name='check_calories_burned_positive'),
        db.CheckConstraint('total_calories_consumed >= 0::double precision', name='check_calories_consumed_positive'),
        db.CheckConstraint('total_workouts >= 0', name='check_workouts_positive'),
        db.ForeignKeyConstraint(['user_id'], ['users.id'], name='progress_snapshots_user_id_fkey'),
        db.PrimaryKeyConstraint('id', name='progress_snapshots_pkey'),
        db.Index('ix_progress_user_date', 'user_id', 'snapshot_date'),
        db.Index('ix_progress_user_type', 'user_id', 'snapshot_type')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, db.ForeignKey('users.id'), nullable=False)
    snapshot_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    snapshot_type: Mapped[str] = mapped_column(Enum('weekly', 'monthly', 'quarterly', name='snapshot_types'), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    total_workouts: Mapped[Optional[int]] = mapped_column(Integer)
    total_calories_burned: Mapped[Optional[float]] = mapped_column(Double(53))
    total_calories_consumed: Mapped[Optional[float]] = mapped_column(Double(53))
    avg_session_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    weight_start_kg: Mapped[Optional[float]] = mapped_column(Double(53))
    weight_end_kg: Mapped[Optional[float]] = mapped_column(Double(53))
    weight_change_kg: Mapped[Optional[float]] = mapped_column(Double(53))
    body_fat_start: Mapped[Optional[float]] = mapped_column(Double(53))
    body_fat_end: Mapped[Optional[float]] = mapped_column(Double(53))
    body_fat_change: Mapped[Optional[float]] = mapped_column(Double(53))
    avg_daily_protein_g: Mapped[Optional[float]] = mapped_column(Double(53))
    avg_daily_carbs_g: Mapped[Optional[float]] = mapped_column(Double(53))
    avg_daily_fats_g: Mapped[Optional[float]] = mapped_column(Double(53))
    workout_streak: Mapped[Optional[int]] = mapped_column(Integer)
    nutrition_log_streak: Mapped[Optional[int]] = mapped_column(Integer)

    user: Mapped['User'] = relationship('User', back_populates='progress_snapshots')
