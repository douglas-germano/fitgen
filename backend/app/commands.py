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
    {"code": "challenge_completed", "name": "Desafio Cumprido", "description": "Complete um desafio da comunidade", "category": "social", "icon": "trophy", "requirement_type": "challenge_count", "requirement_value": 1},
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


@click.command(name='community-nudge')
@with_appcontext
def community_nudge_command():
    """Remind group members who haven't trained in 3+ days while their group is active (run daily)."""
    from datetime import timedelta
    from app.shared.utils.timezone import now_cuiaba
    from app.modules.community.application import graph, metrics
    from app.modules.community.application.notify import notify
    from app.modules.community.domain.models import CommunityGroup

    cutoff = now_cuiaba() - timedelta(days=3)
    sent = 0
    for group in CommunityGroup.query.all():
        ids = [m.user_id for m in group.members if graph.settings_for(m.user_id).share_workouts]
        if len(ids) < 2:
            continue
        last = metrics.last_active(ids)
        active = [uid for uid in ids if last.get(uid) and last[uid] >= cutoff]
        if not active:
            continue
        for uid in ids:
            if uid in active:
                continue
            notify(uid, f'O {group.name} está treinando 🔥',
                   f'{len(active)} {"pessoa treinou" if len(active) == 1 else "pessoas treinaram"} nos últimos dias. Bora voltar?',
                   link_type='community_group', link_id=group.id)
            sent += 1
    print(f'{sent} lembretes enviados.')


OFFICIAL_CHALLENGES = [
    {"title": "12 treinos no mês", "description": "Treine 12 vezes até o fim do mês. Três por semana já resolve!", "metric": "workouts", "target": 12},
    {"title": "20 dias ativos", "description": "Registre treino, refeição ou água em 20 dias do mês.", "metric": "active_days", "target": 20},
    {"title": "Hidratação em dia", "description": "Bata sua meta de água em 15 dias do mês.", "metric": "hydration_days", "target": 15},
]


def seed_official_challenges():
    """This month's public FitGen challenges; returns how many were created (idempotent)."""
    import calendar
    from app.shared.utils.timezone import get_today_cuiaba
    from app.modules.community.domain.models import Challenge

    today = get_today_cuiaba()
    start = today.replace(day=1)
    end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    created = 0
    for data in OFFICIAL_CHALLENGES:
        if Challenge.query.filter_by(is_public=True, title=data['title'], start_date=start).first():
            continue
        db.session.add(Challenge(is_public=True, start_date=start, end_date=end, **data))
        created += 1
    db.session.commit()
    return created


@click.command(name='community-seed-challenges')
@with_appcontext
def community_seed_challenges_command():
    """Create this month's public FitGen challenges (run on the 1st)."""
    print(f'{seed_official_challenges()} desafios públicos criados.')
