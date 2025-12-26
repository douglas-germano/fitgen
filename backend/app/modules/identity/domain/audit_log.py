from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.shared.extensions import db

class AuditLog(db.Model):
    """Audit log for tracking admin actions"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Who performed the action
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    user_email = db.Column(db.String(255), nullable=False)  # Store email in case user is deleted
    user_role = db.Column(db.String(50), nullable=False)
    
    # What action was performed
    action = db.Column(db.String(100), nullable=False, index=True)  # 'create', 'update', 'delete', 'suspend', etc.
    resource_type = db.Column(db.String(100), nullable=False, index=True)  # 'user', 'workout', 'exercise', etc.
    resource_id = db.Column(db.String(255), nullable=True)
    
    # Details
    description = db.Column(db.Text, nullable=True)
    changes = db.Column(JSON, nullable=True)  # Store before/after state
    ip_address = db.Column(db.String(45), nullable=True)  # Support IPv6
    user_agent = db.Column(db.String(500), nullable=True)
    
    # When
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<AuditLog {self.user_email} {self.action} {self.resource_type}>'
    
    @classmethod
    def log(cls, user, action, resource_type, resource_id=None, description=None, changes=None, request=None):
        """Helper method to create audit log entries"""
        from flask import request as flask_request
        req = request or flask_request
        
        log_entry = cls(
            user_id=user.id if user else None,
            user_email=user.email if user else 'system',
            user_role=user.role if user else 'system',
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            description=description,
            changes=changes,
            ip_address=req.remote_addr if req else None,
            user_agent=req.headers.get('User-Agent') if req else None
        )
        
        db.session.add(log_entry)
        return log_entry
