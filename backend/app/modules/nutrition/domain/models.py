from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.shared.extensions import db

class Meal(db.Model):
    __tablename__ = 'meals'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    name = db.Column(db.String(255)) # Descrição do alimento
    meal_type = db.Column(db.String(50), nullable=True) # cafe, almoco, lanche, jantar, ceia
    photo_url = db.Column(db.String(1024), nullable=True)
    description = db.Column(db.Text)
    
    analyzed_by_ai = db.Column(db.Boolean, default=False)
    
    calories = db.Column(db.Float, default=0)
    protein_g = db.Column(db.Float, default=0)
    carbs_g = db.Column(db.Float, default=0)
    fat_g = db.Column(db.Float, default=0)
    fiber_g = db.Column(db.Float, default=0)
    
    consumed_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
