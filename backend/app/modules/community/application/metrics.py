"""Per-user activity totals in a date window, computed from the existing logs."""
from collections import defaultdict
from datetime import datetime, time, timedelta

from sqlalchemy import func

from app.shared.extensions import db
from app.shared.utils.timezone import get_today_cuiaba
from app.modules.nutrition.domain.hydration import HydrationGoal, HydrationLog
from app.modules.nutrition.domain.models import Meal
from app.modules.training.domain.models import WorkoutSession

DEFAULT_WATER_GOAL_ML = 2000


def window(start_date, end_date):
    """[start 00:00, day after end 00:00)."""
    return datetime.combine(start_date, time.min), datetime.combine(end_date + timedelta(days=1), time.min)


def week_bounds(today=None):
    today = today or get_today_cuiaba()
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=6)


def _workouts(user_ids, start, end):
    rows = db.session.query(WorkoutSession.user_id, func.count(WorkoutSession.id), func.coalesce(func.sum(WorkoutSession.total_duration_seconds), 0)).filter(
        WorkoutSession.user_id.in_(user_ids), WorkoutSession.status == 'completed',
        WorkoutSession.completed_at >= start, WorkoutSession.completed_at < end,
    ).group_by(WorkoutSession.user_id).all()
    return {uid: (count, int(seconds or 0)) for uid, count, seconds in rows}


def _days(model, column, user_ids, start, end):
    """{user_id: {date, …}} for rows of `model` in the window."""
    rows = db.session.query(model.user_id, func.date(column)).filter(
        model.user_id.in_(user_ids), column >= start, column < end).distinct().all()
    days = defaultdict(set)
    for uid, day in rows:
        days[uid].add(str(day))
    return days


def active_days(user_ids, start, end):
    days = defaultdict(set)
    for source in (
        _days(WorkoutSession, WorkoutSession.completed_at, user_ids, start, end),
        _days(Meal, Meal.consumed_at, user_ids, start, end),
        _days(HydrationLog, HydrationLog.logged_at, user_ids, start, end),
    ):
        for uid, values in source.items():
            days[uid] |= values
    return days


def hydration_goal_days(user_ids, start, end):
    goals = dict(db.session.query(HydrationGoal.user_id, HydrationGoal.daily_goal_ml).filter(
        HydrationGoal.user_id.in_(user_ids), HydrationGoal.is_active.is_(True)).all())
    rows = db.session.query(HydrationLog.user_id, func.date(HydrationLog.logged_at), func.sum(HydrationLog.amount_ml)).filter(
        HydrationLog.user_id.in_(user_ids), HydrationLog.logged_at >= start, HydrationLog.logged_at < end,
    ).group_by(HydrationLog.user_id, func.date(HydrationLog.logged_at)).all()
    counts = defaultdict(int)
    for uid, _day, total in rows:
        if (total or 0) >= (goals.get(uid) or DEFAULT_WATER_GOAL_ML):
            counts[uid] += 1
    return counts


def metric_values(metric, user_ids, start_date, end_date):
    """{user_id: value} for a challenge metric. Users without data get 0."""
    user_ids = list(user_ids)
    if not user_ids:
        return {}
    start, end = window(start_date, end_date)
    if metric in ('workouts', 'workout_minutes'):
        data = _workouts(user_ids, start, end)
        index = 0 if metric == 'workouts' else 1
        values = {uid: (v[index] if index == 0 else v[index] // 60) for uid, v in data.items()}
    elif metric == 'active_days':
        values = {uid: len(days) for uid, days in active_days(user_ids, start, end).items()}
    elif metric == 'hydration_days':
        values = dict(hydration_goal_days(user_ids, start, end))
    elif metric == 'meals':
        values = dict(db.session.query(Meal.user_id, func.count(Meal.id)).filter(
            Meal.user_id.in_(user_ids), Meal.consumed_at >= start, Meal.consumed_at < end,
        ).group_by(Meal.user_id).all())
    else:
        raise ValueError(f'unknown metric {metric}')
    return {uid: int(values.get(uid, 0)) for uid in user_ids}


def weekly_ranking(user_ids, today=None):
    """[{user_id, workouts, minutes, active_days}] sorted best first."""
    user_ids = list(user_ids)
    if not user_ids:
        return []
    start_date, end_date = week_bounds(today)
    start, end = window(start_date, end_date)
    workouts = _workouts(user_ids, start, end)
    days = active_days(user_ids, start, end)
    rows = [{
        'user_id': uid,
        'workouts': workouts.get(uid, (0, 0))[0],
        'minutes': workouts.get(uid, (0, 0))[1] // 60,
        'active_days': len(days.get(uid, ())),
    } for uid in user_ids]
    from app.modules.community.application.graph import settings_for
    for row in rows:
        settings = settings_for(row['user_id'])
        if not settings.share_workouts:
            row['workouts'] = row['minutes'] = 0
        if not settings.share_streaks:
            row['active_days'] = 0
    rows.sort(key=lambda r: (-r['workouts'], -r['active_days'], -r['minutes']))
    return rows


def last_active(user_ids):
    """{user_id: datetime of the last completed workout}."""
    rows = db.session.query(WorkoutSession.user_id, func.max(WorkoutSession.completed_at)).filter(
        WorkoutSession.user_id.in_(list(user_ids)), WorkoutSession.status == 'completed',
    ).group_by(WorkoutSession.user_id).all()
    return dict(rows)
