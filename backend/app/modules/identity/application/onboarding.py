"""Validated chat answers. No writes occur until the entire conversation is valid."""
from datetime import date, datetime
import math

CHOICES = {
    'goal': ['lose_weight', 'gain_muscle', 'maintain', 'gain_strength', 'improve_health'],
    'gender': ['male', 'female', 'other'],
    'experience': ['beginner', 'intermediate', 'advanced'],
    'focus': ['hypertrophy', 'strength', 'conditioning', 'health'],
    'duration': ['30', '45', '60', '90'], 'location': ['gym', 'home', 'bodyweight'],
    'activity': ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    'diet_style': ['classic', 'vegetarian', 'vegan', 'pescatarian', 'low_carb'],
    'budget': ['ate_300', '300_500', '500_800', 'acima_800'],
    'ingredients': ['basicos', 'intermediarios', 'sofisticados'],
    'cooks': ['sim_todas', 'as_vezes', 'raramente', 'nao'],
    'prep_time': ['menos_15', '15_30', '30_60', 'mais_60'],
}
MULTI = {
    'muscles': (0, 3, ['chest', 'back', 'shoulders', 'arms', 'abs', 'glutes', 'legs']),
    'days': (1, 7, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    'meals': (2, 8, ['breakfast', 'morning_snack', 'pre_workout', 'lunch', 'afternoon_snack', 'post_workout', 'dinner', 'supper']),
    'excluded_foods': (0, 10, ['red_meat', 'pork', 'chicken', 'fish', 'seafood', 'eggs', 'dairy', 'gluten', 'soy', 'nuts']),
    'supplements': (0, 4, ['whey', 'albumin', 'creatine', 'mass_gainer']),
}
TEXT = {'name': 100, 'injuries': 600, 'allergies': 600, 'liked_foods': 600, 'disliked_foods': 600}
FOODS = dict(zip(MULTI['excluded_foods'][2], ['carne vermelha', 'carne suína', 'frango', 'peixe', 'frutos do mar', 'ovos', 'leite e derivados', 'glúten', 'soja', 'castanhas e amendoim']))
STYLES = {'vegetarian': 'vegetariano', 'vegan': 'vegano', 'pescatarian': 'pescetariano', 'low_carb': 'low carb'}


def validate_answers(data, today=None):
    if not isinstance(data, dict):
        raise ValueError('Envie as respostas do onboarding.')
    answers = {}
    for key, choices in CHOICES.items():
        if not isinstance(data.get(key), str) or data[key] not in choices:
            raise ValueError(f'Revise a resposta: {key}.')
        answers[key] = data[key]
    for key, (minimum, maximum, choices) in MULTI.items():
        values = data.get(key, [])
        if (not isinstance(values, list) or not minimum <= len(values) <= maximum
                or any(not isinstance(v, str) or v not in choices for v in values)
                or len(set(values)) != len(values)):
            raise ValueError(f'Revise as opções: {key}.')
        answers[key] = values
    for key, limit in TEXT.items():
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > limit or (key == 'name' and not value.strip()):
            raise ValueError(f'Revise o campo: {key}.')
        answers[key] = value.strip()
    numbers = {}
    for key, minimum, maximum in [('height', 100, 250), ('weight', 20, 350), ('target_weight', 20, 350), ('calories', 500, 10000)]:
        value = data.get(key, '')
        if key == 'calories' and value == '':
            answers[key] = ''
            numbers[key] = None
            continue
        try:
            # Booleans, exponent notation and partially parsed input are not answers.
            import re
            if not isinstance(value, str) or not re.fullmatch(r'\d+(?:[.,]\d+)?', value):
                raise ValueError()
            number = float(value.replace(',', '.'))
            if not math.isfinite(number) or not minimum <= number <= maximum:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError(f'Revise o valor: {key}.') from None
        answers[key] = value
        numbers[key] = number
    try:
        birth = datetime.strptime(data.get('birth_date', ''), '%d/%m/%Y').date()
        today = today or date.today()
        age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        if not 10 <= age <= 100:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError('Informe uma data de nascimento válida, entre 10 e 100 anos.') from None
    answers['birth_date'] = birth.strftime('%d/%m/%Y')
    import re
    time = data.get('training_time', '')
    if not isinstance(time, str) or (time and not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', time)):
        raise ValueError('Informe o horário no formato HH:MM.')
    answers['training_time'] = time
    profile = {
        'age': age, 'gender': answers['gender'], 'height_cm': numbers['height'],
        'current_weight_kg': numbers['weight'], 'target_weight_kg': numbers['target_weight'],
        'fitness_goal': answers['goal'], 'activity_level': answers['activity'],
        'experience_level': answers['experience'], 'available_days': answers['days'],
        'workout_duration_minutes': int(answers['duration']),
        'equipment_available': {'gym': ['dumbbells', 'barbell', 'machines', 'bodyweight'], 'home': ['dumbbells', 'bodyweight'], 'bodyweight': ['bodyweight']}[answers['location']],
        'injuries_limitations': answers['injuries'],
        'dietary_restrictions': ', '.join(([STYLES[answers['diet_style']]] if answers['diet_style'] in STYLES else []) + [FOODS[x] for x in answers['excluded_foods']]),
    }
    nutrition = {
        'goal': {'lose_weight': 'emagrecimento', 'gain_muscle': 'ganho_massa', 'maintain': 'manutencao', 'gain_strength': 'ganho_massa', 'improve_health': 'saude'}[answers['goal']],
        'restrictions': ([STYLES[answers['diet_style']]] if answers['diet_style'] in STYLES else []) + [f'Sem {FOODS[x]}' for x in answers['excluded_foods']],
        'allergies': answers['allergies'], 'dislikes': answers['disliked_foods'],
        'meals_per_day': len(answers['meals']), 'budget': answers['budget'],
        'ingredient_access': answers['ingredients'], 'cooks_at_home': answers['cooks'],
        'prep_time': answers['prep_time'], 'calorie_goal': round(numbers['calories']) if numbers['calories'] else None,
    }
    return answers, profile, nutrition
