from datetime import datetime
from app.shared.extensions import db
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.identity.domain.models import UserProfile
from app.shared.utils.timezone import now_cuiaba

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
    def calculate_muscle_mass(weight_kg, height_cm, gender, body_fat_percentage=None):
        """
        Calculates estimated muscle mass in kg.
        
        Two approaches:
        1. If body fat % is known: Muscle ≈ Lean Mass × 0.5
           Lean Mass = Weight × (1 - Body Fat % / 100)
        
        2. If body fat % unknown: Use Boer formula for Lean Mass × 0.5
           Boer Formula for Fat-Free Mass (FFM):
           - Male: FFM = (0.407 × weight) + (0.267 × height_cm) - 19.2
           - Female: FFM = (0.252 × weight) + (0.473 × height_cm) - 48.3
        
        Muscle mass is approximately 50% of lean/fat-free mass.
        """
        if not weight_kg or not height_cm or not gender:
            return None
            
        try:
            is_male = str(gender).lower() == 'male'
            
            # Approach 1: If we have body fat percentage
            if body_fat_percentage is not None and body_fat_percentage > 0:
                lean_mass = weight_kg * (1 - body_fat_percentage / 100)
                muscle_mass = lean_mass * 0.5
                return round(muscle_mass, 1)
            
            # Approach 2: Use Boer formula for lean mass
            if is_male:
                ffm = (0.407 * weight_kg) + (0.267 * height_cm) - 19.2
            else:
                ffm = (0.252 * weight_kg) + (0.473 * height_cm) - 48.3
            
            muscle_mass = ffm * 0.5
            return round(max(muscle_mass, 0), 1)
            
        except Exception as e:
            print(f"Error calculating muscle mass: {e}")
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
                        fat = calculated_fat  # Use for muscle calculation
                
                # Auto-calculate Muscle Mass if not provided
                if not muscle and profile.height_cm:
                    calculated_muscle = MetricsService.calculate_muscle_mass(
                        weight,
                        profile.height_cm,
                        profile.gender,
                        body_fat_percentage=fat  # Use provided or calculated fat
                    )
                    if calculated_muscle is not None:
                        metric.muscle_mass_kg = calculated_muscle
        
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
