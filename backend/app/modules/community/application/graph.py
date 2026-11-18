"""Who is connected to whom, and who may see what."""
import uuid

from sqlalchemy import and_, or_

from app.shared.extensions import db
from app.modules.community.domain.models import (
    Activity, Block, CommunitySettings, Friendship, GroupMember,
)


def as_uuid(value):
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


def parse_uuid(value):
    """UUID from a request value, or None when it isn't one."""
    try:
        return as_uuid(value)
    except (TypeError, ValueError, AttributeError):
        return None


def settings_for(user_id):
    user_id = as_uuid(user_id)
    settings = db.session.get(CommunitySettings, user_id)
    if not settings:
        settings = CommunitySettings(user_id=user_id)
        db.session.add(settings)
        db.session.flush()
    return settings


def group_ids(user_id):
    rows = db.session.query(GroupMember.group_id).filter(GroupMember.user_id == as_uuid(user_id)).all()
    return {r[0] for r in rows}


def membership(group_id, user_id):
    return GroupMember.query.filter_by(group_id=as_uuid(group_id), user_id=as_uuid(user_id)).first()


def blocked_ids(user_id):
    """Users hidden from `user_id` in both directions."""
    uid = as_uuid(user_id)
    rows = db.session.query(Block.blocker_id, Block.blocked_id).filter(
        or_(Block.blocker_id == uid, Block.blocked_id == uid)).all()
    return {b if a == uid else a for a, b in rows}


def is_blocked(a, b):
    a, b = as_uuid(a), as_uuid(b)
    return db.session.query(Block.id).filter(or_(
        and_(Block.blocker_id == a, Block.blocked_id == b),
        and_(Block.blocker_id == b, Block.blocked_id == a),
    )).first() is not None


def friendship_between(a, b):
    a, b = as_uuid(a), as_uuid(b)
    return Friendship.query.filter(or_(
        and_(Friendship.requester_id == a, Friendship.addressee_id == b),
        and_(Friendship.requester_id == b, Friendship.addressee_id == a),
    )).first()


def friend_ids(user_id):
    uid = as_uuid(user_id)
    rows = db.session.query(Friendship.addressee_id).filter(
        Friendship.status == 'accepted', Friendship.requester_id == uid).all()
    return {r[0] for r in rows} - blocked_ids(uid)


def comember_ids(user_id):
    mine = group_ids(user_id)
    if not mine:
        return set()
    rows = db.session.query(GroupMember.user_id).filter(GroupMember.group_id.in_(mine)).distinct().all()
    return {r[0] for r in rows}


def network_ids(user_id):
    """Me, my friends and everyone in my groups, minus blocks."""
    uid = as_uuid(user_id)
    return ({uid} | friend_ids(uid) | comember_ids(uid)) - blocked_ids(uid)


def shares_group(a, b):
    return bool(group_ids(a) & group_ids(b))


def can_see_profile(viewer_id, target_id):
    viewer, target = as_uuid(viewer_id), as_uuid(target_id)
    from app.modules.identity.domain.models import User
    user = db.session.get(User, target)
    if not user or not user.is_active or user.deleted_at:
        return False
    if viewer == target:
        return True
    if is_blocked(viewer, target):
        return False
    if friendship_between(viewer, target) or shares_group(viewer, target):
        return True
    return settings_for(target).discoverable or Activity.query.filter_by(user_id=target, audience='public', status='visible').first() is not None


def visibility_filter(viewer_id):
    """SQL condition for activities the viewer may see (status is filtered separately)."""
    uid = as_uuid(viewer_id)
    network = network_ids(uid)
    groups = group_ids(uid)
    blocked = blocked_ids(uid)
    clauses = [and_(Activity.audience.in_(('network', 'public')), Activity.user_id.in_(network))]
    if groups:
        clauses.append(and_(Activity.audience == 'group', Activity.group_id.in_(groups)))
    clauses.append(Activity.audience == 'public')
    condition = or_(*clauses)
    if blocked:
        condition = and_(condition, Activity.user_id.notin_(blocked))
    return condition


def can_see_activity(viewer_id, activity):
    uid = as_uuid(viewer_id)
    if activity.user_id == uid:
        return True
    if activity.status != 'visible' or is_blocked(uid, activity.user_id):
        return False
    if activity.audience == 'public':
        return True
    if activity.audience == 'group':
        return activity.group_id in group_ids(uid)
    return activity.user_id in network_ids(uid)


def followed_ids(user_id):
    """Only approved outgoing requests grant access; legacy public follows do not."""
    return friend_ids(user_id)
