"""Private HealthKit imports, isolated by account and sample UUID."""
import uuid
from app.shared.extensions import db
from sqlalchemy.dialects.postgresql import UUID


class HealthImport(db.Model):
    __tablename__ = 'health_imports'
    __table_args__ = (db.UniqueConstraint('user_id', 'kind', 'sample_id'),)

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False, index=True)
    kind = db.Column(db.String(16), nullable=False)
    sample_id = db.Column(db.String(36), nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    metric_id = db.Column(UUID(as_uuid=True), db.ForeignKey('body_metrics.id'), nullable=True)
