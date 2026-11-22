"""The coach's weekly recap, using only the requesting member's visible ranking."""
import logging

from app.shared.extensions import db
from app.modules.community.application import metrics
from app.modules.community.application.serializers import users_by_id

log = logging.getLogger(__name__)

PROMPT = """Você é o coach do FitGen. Escreva um resumo curto (no máximo 3 frases, português do Brasil,
tom animado e acolhedor, 1 emoji no máximo) da semana do grupo "{name}".
Destaque quem puxou o grupo e incentive quem treinou pouco sem expor ninguém negativamente.
Não invente números além destes dados:
{lines}
Responda só com o texto do resumo."""


def fallback(name, ranking, users):
    total = sum(r['workouts'] for r in ranking)
    active = sum(1 for r in ranking if r['active_days'])
    if not total:
        return f'Semana começando no {name}! Bora fazer o primeiro treino e puxar o grupo? 💪'
    leader = users.get(ranking[0]['user_id'], {}).get('name', 'Alguém')
    first = leader.split()[0] if leader else 'Alguém'
    return (f'O {name} já soma {total} {"treino" if total == 1 else "treinos"} nesta semana, '
            f'com {active} {"pessoa ativa" if active == 1 else "pessoas ativas"}. '
            f'{first} está puxando o ranking — quem vem junto?')


def summary(group, viewer_id=None):
    from app.modules.community.application.graph import blocked_ids
    blocked = blocked_ids(viewer_id) if viewer_id else set()
    ranking = metrics.weekly_ranking([m.user_id for m in group.members if m.user_id not in blocked])
    users = users_by_id(r['user_id'] for r in ranking)
    text = None
    lines = '\n'.join(
        f"- {users.get(r['user_id'], {}).get('name', 'Membro')}: {r['workouts']} treinos, {r['minutes']} min, {r['active_days']} dias ativos"
        for r in ranking)
    try:
        from app.modules.coach.infrastructure.ai_service import AIService
        text = AIService().generate_text(PROMPT.format(name=group.name, lines=lines), feature="group_summary")
    except Exception as exc:
        log.info('group summary AI unavailable: %s', exc)
    text = (text or '').strip()
    if not text:
        # Not cached, so the numbers keep updating during the week.
        return fallback(group.name, ranking, users)
    return text
