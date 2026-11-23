"""JSON shapes shared by the community routes. Batch queries keep the feed at O(1) queries per page."""
from sqlalchemy import func

from app.modules.community.application import official
from app.shared import storage
from app.shared.extensions import db
from app.modules.identity.domain.models import User, UserProfile
from app.modules.community.application import challenges as challenge_service
from app.modules.community.domain.models import CHALLENGE_METRICS, Comment, Reaction


def iso(value):
    return value.isoformat() if value else None


def users_by_id(ids):
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = db.session.query(User.id, User.name, User.profile_picture, UserProfile.level).outerjoin(
        UserProfile, UserProfile.user_id == User.id).filter(User.id.in_(ids)).all()
    return {r.id: {'id': str(r.id), 'name': r.name, 'profile_picture': storage.display_value(r.profile_picture), 'level': r.level or 1} for r in rows}


def unknown_user(uid):
    return {'id': str(uid), 'name': 'Usuário', 'profile_picture': None, 'level': 1}


def activities(items, viewer_id, groups_by_id=None):
    if not items:
        return []
    ids = [a.id for a in items]
    users = users_by_id(a.user_id for a in items)
    counts = {}
    for activity_id, kind, n in db.session.query(Reaction.activity_id, Reaction.kind, func.count(Reaction.id)).filter(
            Reaction.activity_id.in_(ids)).group_by(Reaction.activity_id, Reaction.kind).all():
        counts.setdefault(activity_id, {})[kind] = n
    mine = dict(db.session.query(Reaction.activity_id, Reaction.kind).filter(
        Reaction.activity_id.in_(ids), Reaction.user_id == viewer_id).all())
    comments = dict(db.session.query(Comment.activity_id, func.count(Comment.id)).filter(
        Comment.activity_id.in_(ids), Comment.status == 'visible').group_by(Comment.activity_id).all())
    groups_by_id = groups_by_id or {}
    result = []
    for a in items:
        reactions = counts.get(a.id, {})
        group = groups_by_id.get(a.group_id)
        result.append({
            'id': str(a.id),
            'type': a.type,
            'audience': a.audience,
            'group': {'id': str(a.group_id), 'name': group.name} if group else ({'id': str(a.group_id), 'name': None} if a.group_id else None),
            'user': users.get(a.user_id) or unknown_user(a.user_id),
            'payload': a.payload or {},
            'text': a.text,
            'image': a.image_path,
            'created_at': iso(a.created_at),
            'reactions': reactions,
            'reaction_total': sum(reactions.values()),
            'my_reaction': mine.get(a.id),
            'comment_count': comments.get(a.id, 0),
            'is_mine': a.user_id == viewer_id,
        })
    return result


def comments(items, viewer_id):
    users = users_by_id(c.user_id for c in items)
    return [{
        'id': str(c.id), 'text': c.text, 'created_at': iso(c.created_at),
        'user': users.get(c.user_id) or unknown_user(c.user_id), 'is_mine': c.user_id == viewer_id,
    } for c in items]


def group(g, viewer_id, extra=None):
    me = next((m for m in g.members if m.user_id == viewer_id), None)
    data = {
        'id': str(g.id), 'name': g.name, 'description': g.description,
        'profile_picture': g.profile_picture if me or g.is_public else None,
        'is_public': g.is_public,
        'member_count': len(g.members), 'my_role': me.role if me else None,
        'created_at': iso(g.created_at),
        'official': g.id in official.OFFICIAL_IDS,
        'premium_only': official.is_pro_club(g.id),
    }
    if me:
        data['invite_code'] = g.invite_code
    if extra:
        data.update(extra)
    return data


def challenge(c, viewer_id, progress=None, groups_by_id=None):
    me = challenge_service.participant(c, viewer_id)
    if progress is None:
        progress = challenge_service.progress_by_user(c, only=viewer_id) if me else {}
    group_obj = (groups_by_id or {}).get(c.group_id)
    return {
        'id': str(c.id), 'title': c.title, 'description': c.description, 'cover_image': c.cover_image,
        'metric': c.metric, 'metric_label': CHALLENGE_METRICS.get(c.metric, c.metric), 'target': c.target,
        'start_date': iso(c.start_date), 'end_date': iso(c.end_date), 'status': challenge_service.status(c),
        'is_public': c.is_public,
        'group': {'id': str(c.group_id), 'name': group_obj.name if group_obj else None} if c.group_id else None,
        'participant_count': len(c.participants),
        'joined': me is not None,
        'my_progress': progress.get(me.user_id, 0) if me else None,
        'completed': bool(me and me.completed_at),
        'completed_at': iso(me.completed_at) if me else None,
    }
