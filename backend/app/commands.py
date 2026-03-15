import click
from flask.cli import with_appcontext
from app.shared.extensions import db
from app.modules.gamification.domain.achievements import Achievement

ACHIEVEMENTS_DATA = [
    # Consistência
    {"code": "first_workout", "name": "Primeiro Passo", "description": "Complete seu primeiro treino", "category": "consistency", "icon": "footsteps", "requirement_type": "workout_count", "requirement_value": 1},
    {"code": "7_day_streak", "name": "Semana Perfeita", "description": "Treine 7 dias seguidos", "category": "consistency", "icon": "fire", "requirement_type": "streak_days", "requirement_value": 7},
    {"code": "30_day_streak", "name": "Mês de Ferro", "description": "Treine 30 dias seguidos", "category": "consistency", "icon": "calendar", "requirement_type": "streak_days", "requirement_value": 30},
    {"code": "100_workouts", "name": "Centenário", "description": "Complete 100 treinos", "category": "consistency", "icon": "medal", "requirement_type": "workout_count", "requirement_value": 100},
    
    # Nutrição
    {"code": "first_meal_logged", "name": "Diário Alimentar", "description": "Registre sua primeira refeição", "category": "nutrition", "icon": "apple", "requirement_type": "meal_count", "requirement_value": 1},
    {"code": "7_days_tracking", "name": "Nutricionista Amador", "description": "Registre refeições por 7 dias seguidos", "category": "nutrition", "icon": "notebook", "requirement_type": "nutrition_streak", "requirement_value": 7},
    {"code": "protein_goal_7_days", "name": "Proteína em Dia", "description": "Atinja a meta de proteína por 7 dias", "category": "nutrition", "icon": "muscle", "requirement_type": "protein_streak", "requirement_value": 7},
    
    # Hidratação
    {"code": "hydration_goal_met", "name": "Hidratado", "description": "Atinja a meta de água do dia", "category": "nutrition", "icon": "water_drop", "requirement_type": "hydration_streak", "requirement_value": 1},
    {"code": "hydration_7_days", "name": "Fonte de Água", "description": "Atinja a meta de hidratação por 7 dias", "category": "nutrition", "icon": "ocean", "requirement_type": "hydration_streak", "requirement_value": 7},
    
    # Evolução
    {"code": "first_kg_lost", "name": "Primeiro Kg", "description": "Perca seu primeiro quilograma", "category": "milestone", "icon": "scale", "requirement_type": "weight_loss_kg", "requirement_value": 1},
    {"code": "5kg_lost", "name": "Transformação", "description": "Perca 5kg", "category": "milestone", "icon": "butterfly", "requirement_type": "weight_loss_kg", "requirement_value": 5},
    {"code": "10kg_lost", "name": "Nova Pessoa", "description": "Perca 10kg", "category": "milestone", "icon": "star", "requirement_type": "weight_loss_kg", "requirement_value": 10},
    {"code": "first_pr", "name": "Recorde Pessoal", "description": "Quebre seu primeiro PR", "category": "workout", "icon": "trophy", "requirement_type": "pr_break", "requirement_value": 1},
]

@click.command(name='seed')
@with_appcontext
def seed_command():
    """Seeds the database with initial data."""
    print("Seeding achievements...")
    for data in ACHIEVEMENTS_DATA:
        achievement = Achievement.query.filter_by(code=data['code']).first()
        if not achievement:
            achievement = Achievement(**data)
            db.session.add(achievement)
            print(f"Created achievement: {data['name']}")
        else:
            print(f"Achievement exists: {data['name']}")
            
    db.session.commit()
    print("Seeding complete.")

@click.command('promote-user')
@click.argument('email')
@with_appcontext
def promote_user_command(email):
    """Promote a user to admin role"""
    from app.modules.identity.domain.models import User
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        click.echo(f'❌ User not found: {email}')
        return
    
    user.role = 'admin'
    db.session.commit()
    
    click.echo(f'✅ User promoted to admin successfully!')
    click.echo(f'   Email: {user.email}')
    click.echo(f'   Name: {user.name}')
    click.echo(f'   Role: {user.role}')
