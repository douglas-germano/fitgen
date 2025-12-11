def calculate_bmr(weight_kg, height_cm, age, gender):
    """
    Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
    """
    # Base calculation
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    
    if gender.lower() == 'male':
        bmr += 5
    else:
        bmr -= 161
        
    return round(bmr, 2)

def calculate_tdee(bmr, activity_level):
    """
    Calculate Total Daily Energy Expenditure.
    """
    multipliers = {
        'sedentary': 1.2,      # Pouco ou nenhum exercício
        'light': 1.375,        # Exercício leve 1-3 dias/semana
        'moderate': 1.55,      # Exercício moderado 3-5 dias/semana
        'active': 1.725,       # Exercício pesado 6-7 dias/semana
        'very_active': 1.9     # Exercício muito pesado + trabalho físico
    }
    
    multiplier = multipliers.get(activity_level, 1.2)
    return round(bmr * multiplier, 2)
