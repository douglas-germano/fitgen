"""Challenge visibility, progress and completion."""
from app.shared.extensions import db
from app.shared.utils.timezone import get_today_cuiaba, now_cuiaba
from app.modules.community.application import metrics
from app.modules.community.application.graph import as_uuid, group_ids
from app.modules.community.application.notify import notify
from app.modules.community.domain.models import Challenge, ChallengeParticipant

CHALLENGE_XP = 100
CHALLENGE_ACHIEVEMENT = {
    'code': 'challenge_completed', 'name': 'Desafio Cumprido', 'description': 'Complete um desafio da comunidade',
    'category': 'social', 'icon': 'trophy', 'requirement_type': 'challenge_count', 'requirement_value': 1,
}


def status(challenge, today=None):
    today = today or get_today_cuiaba()
    if today < challenge.start_date:
        return 'upcoming'
    if today > challenge.end_date:
        return 'ended'
    return 'active'


def can_view(challenge, user_id):
    if challenge.group_id is None:
        return challenge.is_public
    return challenge.group_id in group_ids(user_id)


def participant(challenge, user_id):
    uid = as_uuid(user_id)
    return next((p for p in challenge.participants if p.user_id == uid), None)


def progress_by_user(challenge, only=None):
    ids = [p.user_id for p in challenge.participants] if only is None else [as_uuid(only)]
    end = min(challenge.end_date, get_today_cuiaba())
    if end < challenge.start_date:
        return {uid: 0 for uid in ids}
    return metrics.metric_values(challenge.metric, ids, challenge.start_date, end)


def _award(user_id, challenge):
    from app.modules.gamification.application.service import GamificationService
    from app.modules.gamification.domain.achievements import Achievement, UserAchievement
    GamificationService.award_xp(user_id, CHALLENGE_XP, f'Desafio: {challenge.title}', commit=False)
    achievement = Achievement.query.filter_by(code=CHALLENGE_ACHIEVEMENT['code']).first()
    if not achievement:
        achievement = Achievement(**CHALLENGE_ACHIEVEMENT)
        db.session.add(achievement)
        db.session.flush()
    if not UserAchievement.query.filter_by(user_id=user_id, achievement_id=achievement.id).first():
        db.session.add(UserAchievement(user_id=user_id, achievement_id=achievement.id, unlocked_at=now_cuiaba()))



def complete_if_reached(challenge, progress):
    """Mark finished participants once; returns how many were completed now."""
    from app.modules.community.application.publisher import publish
    done = 0
    for p in challenge.participants:
        if p.user_id not in progress or p.completed_at or progress[p.user_id] < challenge.target:
            continue
        if get_today_cuiaba() < challenge.start_date:
            continue
        claimed = ChallengeParticipant.query.filter_by(id=p.id, completed_at=None).update({'completed_at': now_cuiaba()}, synchronize_session='fetch')
        if not claimed:
            db.session.rollback()
            continue
        _award(p.user_id, challenge)
        db.session.commit()
        done += 1
        audience, group = ('group', challenge.group_id) if challenge.group_id else ('network', None)
        publish(p.user_id, 'challenge_completed', {'challenge_id': str(challenge.id), 'title': challenge.title},
                source_id=challenge.id, audience=audience, group_id=group)
        notify(p.user_id, 'Desafio concluído! 🏆', f'Você completou "{challenge.title}" e ganhou {CHALLENGE_XP} XP.',
               link_type='community_challenge', link_id=challenge.id)
    return done


def refresh_user(user_id):
    today = get_today_cuiaba()
    rows = Challenge.query.join(ChallengeParticipant).filter(
        ChallengeParticipant.user_id == as_uuid(user_id),
        ChallengeParticipant.completed_at.is_(None),
        Challenge.start_date <= today, Challenge.end_date >= today,
    ).all()
    for challenge in rows:
        complete_if_reached(challenge, progress_by_user(challenge, only=user_id))
