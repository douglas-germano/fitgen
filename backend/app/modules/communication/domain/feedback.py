from typing import Optional
import datetime
import uuid
from sqlalchemy import (
    DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, Text, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.extensions import db

class Feedback(db.Model):
    __tablename__ = 'feedback'
    __table_args__ = (
        db.ForeignKeyConstraint(['admin_user_id'], ['users.id'], name='feedback_admin_user_id_fkey'),
        db.ForeignKeyConstraint(['user_id'], ['users.id'], name='feedback_user_id_fkey'),
        db.PrimaryKeyConstraint('id', name='feedback_pkey'),
        db.Index('ix_feedback_status', 'status'),
        db.Index('ix_feedback_type', 'type'),
        db.Index('ix_feedback_user_status', 'user_id', 'status')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, db.ForeignKey('users.id'), nullable=False)
    type: Mapped[str] = mapped_column(Enum('bug', 'feature', 'improvement', 'question', 'other', name='feedback_types'), nullable=False)
    category: Mapped[str] = mapped_column(Enum('workout', 'nutrition', 'ui', 'performance', 'other', name='feedback_categories'), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Enum('pending', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected', name='feedback_statuses'), nullable=False, default='pending')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    screenshot_url: Mapped[Optional[str]] = mapped_column(String(512))
    priority: Mapped[Optional[str]] = mapped_column(Enum('low', 'medium', 'high', 'critical', name='priority_levels'))
    admin_response: Mapped[Optional[str]] = mapped_column(Text)
    admin_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, db.ForeignKey('users.id'))
    responded_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, onupdate=datetime.datetime.utcnow)

    admin_user: Mapped[Optional['User']] = relationship('User', foreign_keys=[admin_user_id])
    user: Mapped['User'] = relationship('User', foreign_keys=[user_id])
