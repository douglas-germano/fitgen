from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSON
from datetime import datetime
import uuid

class DietPreference(db.Model):
    __tablename__ = 'diet_preferences'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Onboarding answers
    goal = db.Column(db.String(50))  # emagrecimento, ganho_massa, manutencao, saude
    restrictions = db.Column(JSON)  # ["vegetariano", "sem_lactose", etc]
    allergies = db.Column(db.Text)
    budget = db.Column(db.String(20))  # ate_300, 300_500, 500_800, acima_800
    ingredient_access = db.Column(db.String(20))  # basicos, intermediarios, sofisticados
    meals_per_day = db.Column(db.Integer)
    cooks_at_home = db.Column(db.String(20))  # sim_todas, as_vezes, raramente, nao
    prep_time = db.Column(db.String(20))  # menos_15, 15_30, 30_60, mais_60
    dislikes = db.Column(db.Text)
    calorie_goal = db.Column(db.Integer)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DietPlan(db.Model):
    __tablename__ = 'diet_plans'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    weekly_plan = db.Column(JSON)  # 7 days of meals
    shopping_list = db.Column(JSON)  # List of ingredients
    macro_targets = db.Column(JSON)  # {protein: X, carbs: Y, fats: Z}
    
    generated_by_ai = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
