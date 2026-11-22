"""Official FitGen clubs, created on deploy (idempotent) and owned by a non-login team account.

Clubs keep fixed ids (uuid5 of their slug) so a re-run never duplicates them and the app can
recognise the PRO club. Admin edits (name, photo, description) are never overwritten.

The PRO club is private: it does not take invite codes from free users and is joined from the
app's Clubes tab only while the person has Premium (`is_premium`).
"""
import uuid

from app.shared.extensions import db

NAMESPACE = uuid.UUID('6f1d3c2a-9b4e-4d1a-8c7f-2e5a0b9d4c11')
OWNER_EMAIL = 'clubes-oficiais@fitgen.pro'
OWNER_NAME = 'Equipe FitGen'


def club_id(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f'club:{slug}')


PRO_CLUB_ID = club_id('pro')

OFFICIAL_CLUBS = [
    {'slug': 'pro', 'name': 'FitGen PRO · Assinantes', 'is_public': False,
     'description': 'Clube exclusivo de quem assina o FitGen PRO: desafios, novidades em primeira mão e troca com quem leva o treino a sério.'},
    {'slug': 'corrida', 'name': 'Corrida e Caminhada', 'is_public': True,
     'description': 'Para quem corre, caminha ou está começando. Compartilhe seus quilômetros e incentive a turma.'},
    {'slug': 'treino-em-casa', 'name': 'Treino em Casa', 'is_public': True,
     'description': 'Sem academia, sem desculpa. Treinos com o peso do corpo e pouco equipamento.'},
    {'slug': 'hipertrofia', 'name': 'Hipertrofia', 'is_public': True,
     'description': 'Ganho de massa muscular: treino de força, progressão de carga e muita proteína.'},
    {'slug': 'emagrecimento', 'name': 'Emagrecimento Saudável', 'is_public': True,
     'description': 'Perder peso com constância: treino, alimentação equilibrada e água em dia.'},
]
OFFICIAL_IDS = {club_id(c['slug']) for c in OFFICIAL_CLUBS}


def is_pro_club(group_id) -> bool:
    return group_id == PRO_CLUB_ID


def official_owner():
    """The team account that owns the official clubs; it cannot sign in (no password, no social login)."""
    from app.modules.identity.domain.models import User
    owner = User.query.filter_by(email=OWNER_EMAIL).first()
    if not owner:
        owner = User(email=OWNER_EMAIL, name=OWNER_NAME, password_hash=None, role='user', onboarding_completed=True)
        db.session.add(owner)
        db.session.flush()
    return owner


def seed_official_clubs() -> int:
    """Create the official clubs that are missing; returns how many were created."""
    from app.modules.community.domain.models import CommunityGroup, GroupMember
    owner = official_owner()
    created = 0
    for club in OFFICIAL_CLUBS:
        gid = club_id(club['slug'])
        if db.session.get(CommunityGroup, gid):
            continue
        group = CommunityGroup(id=gid, name=club['name'], description=club['description'],
                               is_public=club['is_public'], owner_id=owner.id)
        group.members.append(GroupMember(user_id=owner.id, role='admin'))
        db.session.add(group)
        created += 1
    db.session.commit()
    return created
