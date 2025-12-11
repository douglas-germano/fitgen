from typing import Optional
import datetime
import uuid
from sqlalchemy import (
    Boolean, DateTime, Double, Enum, Index, JSON, PrimaryKeyConstraint, String, Text, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..extensions import db

class ExerciseLibrary(db.Model):
    __tablename__ = 'exercise_library'
    __table_args__ = (
        db.PrimaryKeyConstraint('id', name='exercise_library_pkey'),
        db.Index('ix_exercise_library_category', 'category'),
        db.Index('ix_exercise_library_difficulty_level', 'difficulty_level'),
        db.Index('ix_exercise_library_is_active', 'is_active'),
        db.Index('ix_exercise_library_name', 'name', unique=True)
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(Enum('strength', 'cardio', 'flexibility', 'balance', 'plyometric', name='exercise_categories'), nullable=False)
    difficulty_level: Mapped[str] = mapped_column(Enum('beginner', 'intermediate', 'advanced', name='difficulty_levels'), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    description: Mapped[Optional[str]] = mapped_column(Text)
    muscle_groups: Mapped[Optional[dict]] = mapped_column(JSON)
    equipment_needed: Mapped[Optional[dict]] = mapped_column(JSON)
    video_url: Mapped[Optional[str]] = mapped_column(String(512))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512))
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    tips: Mapped[Optional[str]] = mapped_column(Text)
    common_mistakes: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, onupdate=datetime.datetime.utcnow)

    exercises: Mapped[list['Exercise']] = relationship('Exercise', back_populates='exercise_library')
