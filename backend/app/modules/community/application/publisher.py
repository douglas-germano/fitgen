"""Turns things users already do (workouts, streaks, achievements…) into feed items.

Every entry point is best-effort: the community must never break a workout or a meal log.
"""
import functools
import logging

from app.shared.extensions import db
from app.modules.community.application.graph import as_uuid, settings_for
from app.modules.community.domain.models import Activity

log = logging.getLogger(__name__)

SETTING_FOR_TYPE = {
    'workout_completed': 'share_workouts',
    'streak': 'share_streaks',
    'achievement': 'share_achievements',
    'hydration_goal': 'share_hydration',
    'challenge_completed': 'share_challenges',
}

STREAK_MILESTONES = (3, 7, 14, 30, 60, 90, 180, 365)


def best_effort(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            log.warning('community %s failed: %s', fn.__name__, exc)
            db.session.rollback()
            return None
    return wrapper


def publish(user_id, type_, payload, source_id=None, audience='network', group_id=None):
    """Create the activity unless the user opted out of this type or it already exists."""
    user_id = as_uuid(user_id)
    setting = SETTING_FOR_TYPE.get(type_)
    if setting and not getattr(settings_for(user_id), setting):
        db.session.commit()
        return None
    if source_id is not None:
        existing = Activity.query.filter_by(user_id=user_id, type=type_, source_id=str(source_id)).first()
        if existing:
            return existing
    activity = Activity(user_id=user_id, type=type_, payload=payload, source_id=None if source_id is None else str(source_id),
                        audience=audience, group_id=group_id)
    db.session.add(activity)
    db.session.commit()
    return activity


@best_effort
def on_workout_finished(user_id, session):
    from app.modules.training.domain.models import WorkoutDay
    day = db.session.get(WorkoutDay, session.workout_day_id) if session.workout_day_id else None
    publish(user_id, 'workout_completed', {
        'workout_name': (day.name if day and day.name else 'Treino'),
        'duration_seconds': int(session.total_duration_seconds or 0),
        'calories': round(float(session.calories_burned or 0)),
    }, source_id=session.id)


@best_effort
def on_streak(user_id, category, days, today):
    if days not in STREAK_MILESTONES:
        return
    # Water habits are health data: also need the hydration opt-in.
    if category == 'hydration' and not settings_for(user_id).share_hydration:
        return
    publish(user_id, 'streak', {'category': category, 'days': days}, source_id=f'{category}:{days}:{today.isoformat()}')


@best_effort
def on_achievement(user_id, achievement):
    publish(user_id, 'achievement', {
        'name': achievement.name, 'description': achievement.description, 'icon': achievement.icon,
    }, source_id=achievement.id)


@best_effort
def on_hydration_goal(user_id, total_ml, goal_ml, today):
    publish(user_id, 'hydration_goal', {'amount_ml': int(total_ml), 'goal_ml': int(goal_ml)}, source_id=today.isoformat())


@best_effort
def after_activity(user_id):
    """Any logged activity may complete a challenge."""
    from app.modules.community.application.challenges import refresh_user
    refresh_user(user_id)
