from typing import Optional
import datetime
import uuid
from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKeyConstraint, Index, PrimaryKeyConstraint, String, Text, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.extensions import db

class Notification(db.Model):
    __tablename__ = 'notifications'
    __table_args__ = (
        db.ForeignKeyConstraint(['user_id'], ['users.id'], name='notifications_user_id_fkey'),
        db.PrimaryKeyConstraint('id', name='notifications_pkey'),
        db.Index('ix_notifications_is_read', 'is_read'),
        db.Index('ix_notifications_type', 'type'),
        db.Index('ix_notifications_user_created', 'user_id', 'created_at'),
        db.Index('ix_notifications_user_unread', 'user_id', 'is_read')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, db.ForeignKey('users.id'), nullable=False)
    type: Mapped[str] = mapped_column(Enum('achievement', 'goal', 'reminder', 'social', 'system', name='notification_types'), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    message: Mapped[Optional[str]] = mapped_column(Text)
    read_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    link_type: Mapped[Optional[str]] = mapped_column(String(50))
    link_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    user: Mapped['User'] = relationship('User', back_populates='notifications')
