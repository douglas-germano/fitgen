from typing import Optional
import datetime
import uuid
from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKeyConstraint, Integer, PrimaryKeyConstraint, UniqueConstraint, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..extensions import db

class UserStreak(db.Model):
    __tablename__ = 'user_streaks'
    __table_args__ = (
        db.CheckConstraint('current_nutrition_streak >= 0', name='check_nutrition_streak_positive'),
        db.CheckConstraint('current_workout_streak >= 0', name='check_workout_streak_positive'),
        db.CheckConstraint('longest_nutrition_streak >= 0', name='check_longest_nutrition_positive'),
        db.CheckConstraint('longest_workout_streak >= 0', name='check_longest_workout_positive'),
        db.ForeignKeyConstraint(['user_id'], ['users.id'], name='user_streaks_user_id_fkey'),
        db.PrimaryKeyConstraint('id', name='user_streaks_pkey'),
        db.UniqueConstraint('user_id', name='user_streaks_user_id_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, db.ForeignKey('users.id'), nullable=False)
    current_workout_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_workout_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_nutrition_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_nutrition_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_hydration_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_hydration_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_workout_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    last_nutrition_log_date: Mapped[Optional[datetime.date]] = mapped_column(Date)
    last_hydration_date: Mapped[Optional[datetime.date]] = mapped_column(Date)

    user: Mapped['User'] = relationship('User', back_populates='user_streaks')
