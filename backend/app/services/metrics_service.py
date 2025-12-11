from datetime import datetime
from app.extensions import db
from app.models.body_metrics import BodyMetric
from app.models.user import UserProfile
from app.utils.timezone import now_cuiaba

class MetricsService:
    @staticmethod
    def calculate_bmi(weight_kg, height_cm):
        if not weight_kg or not height_cm:
            return None
        height_m = height_cm / 100
        return weight_kg / (height_m ** 2)

    @staticmethod
    def calculate_body_fat(weight_kg, height_cm, age, gender):
        """
        Calculates Body Fat Percentage using Deurenberg formula:
        Adult body fat % = (1.20 × BMI) + (0.23 × age) - (10.8 × sex) - 5.4
        Sex: 1 for male, 0 for female
        """
        if not weight_kg or not height_cm or not age or not gender:
            return None
            
        try:
            bmi = MetricsService.calculate_bmi(weight_kg, height_cm)
            if not bmi:
                return None
                
            # Sex: 1 for male, 0 for female
            # Case-insensitive check for male
            gender_factor = 1 if str(gender).lower() == 'male' else 0
            
            body_fat = (1.20 * bmi) + (0.23 * age) - (10.8 * gender_factor) - 5.4
            return round(max(body_fat, 0), 1)
        except Exception as e:
            print(f"Error calculating body fat: {e}")
            return None

    @staticmethod
    def log_metric(user_id, data):
        """
        Logs a new body metric record.
        Auto-calculates body fat if not provided.
        Updates UserProfile current weight.
        """
        weight = data.get('weight_kg')
        fat = data.get('body_fat_percentage')
        muscle = data.get('muscle_mass_kg')
        
        # Create metric record
        metric = BodyMetric(
            user_id=user_id,
            weight_kg=weight if weight else 0,
            body_fat_percentage=fat,
            muscle_mass_kg=muscle,
            waist_cm=data.get('waist_cm'),
            chest_cm=data.get('chest_cm'),
            arm_cm=data.get('arm_cm'),
            thigh_cm=data.get('thigh_cm'),
            notes=data.get('notes'),
            recorded_at=now_cuiaba()
        )
        
        db.session.add(metric)
        
        # Update current weight in profile if provided
        if weight:
            profile = UserProfile.query.filter_by(user_id=user_id).first()
            if profile:
                profile.current_weight_kg = weight
                
                # Auto-calculate Body Fat if not provided
                if not fat and profile.height_cm and profile.age:
                    calculated_fat = MetricsService.calculate_body_fat(
                        weight, 
                        profile.height_cm, 
                        profile.age, 
                        profile.gender
                    )
                    if calculated_fat is not None:
                        metric.body_fat_percentage = calculated_fat
        
        db.session.commit()
        return metric

    @staticmethod
    def get_history(user_id, metric_type='weight', limit=30):
        """
        Retrieves historical data for a specific metric type.
        Optimized to filter at database level if possible, 
        but BodyMetric structure stores all in one row.
        We select only relevant columns to optimize.
        """
        query = BodyMetric.query.filter_by(user_id=user_id).order_by(BodyMetric.recorded_at.asc())
        
        # We could optimize by selecting only specific columns using with_entities
        # query = query.with_entities(BodyMetric.recorded_at, getattr(BodyMetric, field_name))
        
        metrics = query.all()
        data = []
        
        for m in metrics:
            val = None
            if metric_type == 'weight':
                val = m.weight_kg
            elif metric_type == 'fat':
                val = m.body_fat_percentage
            elif metric_type == 'muscle':
                val = m.muscle_mass_kg
            # Add other types as needed
                
            if val is not None:
                 data.append({
                     "date": m.recorded_at.isoformat(),
                     "value": val
                 })
        
        # Limit result size after potentially filtering empty values
        # (Though with SQL limit we might miss recent non-nulls if we limit query)
        # Better to return last N valid entries.
        return data[-limit:] if limit else data
