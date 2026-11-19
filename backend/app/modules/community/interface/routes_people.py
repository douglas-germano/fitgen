"""Privacy settings, friends, profiles, search, blocks and reports."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError

from app.shared.extensions import db, limiter
from app.shared.utils.timezone import get_today_cuiaba, now_cuiaba
from app.modules.identity.domain.models import User
from app.modules.community.application import graph, metrics, serializers
from app.modules.community.application.notify import notify
from app.modules.community.domain.models import (
    AUTO_HIDE_REPORTS, REPORT_TARGETS, Activity, Block, Comment, CommunityGroup, CommunitySettings, Friendship, GroupMember, Report,
)
from app.modules.community.interface.common import body, clean_text, fail, me

people_bp = Blueprint('community_people', __name__)

SETTING_FIELDS = ('share_workouts', 'share_achievements', 'share_streaks', 'share_challenges', 'share_hydration', 'discoverable')


def _settings_json(s):
    return {f: getattr(s, f) for f in SETTING_FIELDS}


def _friendship_state(viewer, target, friendship=None):
    """none | friends | sent | received | self."""
    if viewer == target:
        return 'self'
    friendship = friendship or graph.friendship_between(viewer, target)
    if not friendship:
        return 'none'
    if friendship.status == 'accepted':
        return 'friends'
    return 'sent' if friendship.requester_id == viewer else 'received'


def _outgoing_state(viewer, target):
    if viewer == target:
        return 'self'
    follow = Friendship.query.filter_by(requester_id=viewer, addressee_id=target).first()
    return follow.status if follow else 'none'


# ---------- Settings ----------

@people_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    settings = graph.settings_for(me())
    db.session.commit()
    return jsonify(_settings_json(settings)), 200


@people_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    settings = graph.settings_for(me())
    data = body()
    for field in SETTING_FIELDS:
        if field in data:
            if not isinstance(data[field], bool):
                return fail('Valor inválido.')
            setattr(settings, field, data[field])
    db.session.commit()
    return jsonify(_settings_json(settings)), 200


# ---------- Friends ----------

@people_bp.route('/friends', methods=['GET'])
@jwt_required()
def list_friends():
    """Friends plus pending requests in both directions."""
    uid = me()
    rows = Friendship.query.filter(or_(Friendship.requester_id == uid, Friendship.addressee_id == uid)).all()
    blocked = graph.blocked_ids(uid)
    rows = [f for f in rows if (f.addressee_id if f.requester_id == uid else f.requester_id) not in blocked]
    users = serializers.users_by_id((f.addressee_id if f.requester_id == uid else f.requester_id) for f in rows)

    def card(f):
        other = f.addressee_id if f.requester_id == uid else f.requester_id
        return {'id': str(f.id), 'user': users.get(other) or serializers.unknown_user(other), 'created_at': serializers.iso(f.created_at)}

    friends = [card(f) for f in rows if f.status == 'accepted' and f.requester_id == uid]
    friends.sort(key=lambda c: c['user']['name'].lower())
    return jsonify({
        'friends': friends,
        'received': [card(f) for f in rows if f.status == 'pending' and f.addressee_id == uid],
        'sent': [card(f) for f in rows if f.status == 'pending' and f.requester_id == uid],
    }), 200


@people_bp.route('/friends/requests', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def send_request():
    """Legacy URL, same approved follow flow. Codes are no longer accepted."""
    uid = me()
    target = graph.parse_uuid(body().get('user_id'))
    return _request_follow(uid, target)


def _request_follow(uid, target):
    user = db.session.get(User, target) if target else None
    if not user or target == uid or not user.is_active or user.deleted_at or graph.is_blocked(uid, target):
        return fail('Pessoa não encontrada.', 404)
    if not graph.can_see_profile(uid, target):
        return fail('Perfil não encontrado.', 404)
    existing = Friendship.query.filter_by(requester_id=uid, addressee_id=target).first()
    if existing:
        return jsonify({'state': 'accepted' if existing.status == 'accepted' else 'pending', 'request_id': str(existing.id)}), 200
    follow = Friendship(requester_id=uid, addressee_id=target)
    db.session.add(follow)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        existing = Friendship.query.filter_by(requester_id=uid, addressee_id=target).first()
        return jsonify({'state': existing.status, 'request_id': str(existing.id)}), 200
    name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
    notify(target, f'{name} quer seguir você', 'Aceite ou recuse a solicitação nas notificações.',
           link_type='community_follow_request', link_id=follow.id)
    return jsonify({'state': 'pending', 'request_id': str(follow.id)}), 201


def _read_request_notification(uid, request_id):
    from app.modules.communication.domain.notification import Notification
    Notification.query.filter_by(user_id=uid, link_type='community_follow_request', link_id=request_id).update({'is_read': True}, synchronize_session=False)


def _my_request(request_id, uid):
    rid = graph.parse_uuid(request_id)
    friendship = db.session.get(Friendship, rid) if rid else None
    if not friendship or uid not in (friendship.requester_id, friendship.addressee_id):
        return None
    return friendship


@people_bp.route('/friends/requests/<request_id>/accept', methods=['POST'])
@jwt_required()
def accept_request(request_id):
    uid = me()
    friendship = _my_request(request_id, uid)
    if not friendship or friendship.addressee_id != uid or friendship.status != 'pending':
        return fail('Pedido não encontrado.', 404)
    friendship.status, friendship.accepted_at = 'accepted', now_cuiaba()
    _read_request_notification(uid, friendship.id)
    db.session.commit()
    name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
    notify(friendship.requester_id, f'{name} aceitou sua solicitação', 'Agora você está seguindo essa pessoa.',
           link_type='community_user', link_id=uid)
    return jsonify({'msg': 'Pedido aceito.'}), 200


@people_bp.route('/friends/requests/<request_id>', methods=['DELETE'])
@jwt_required()
def delete_request(request_id):
    """Decline a received request, cancel a sent one, or undo a friendship."""
    uid = me()
    friendship = _my_request(request_id, uid)
    if not friendship:
        return fail('Pedido não encontrado.', 404)
    _read_request_notification(uid, friendship.id)
    db.session.delete(friendship)
    db.session.commit()
    return jsonify({'msg': 'Removido.'}), 200


@people_bp.route('/friends/<user_id>', methods=['DELETE'])
@jwt_required()
def unfriend(user_id):
    uid = me()
    target = graph.parse_uuid(user_id)
    friendship = graph.friendship_between(uid, target) if target else None
    if not friendship:
        return fail('Amizade não encontrada.', 404)
    db.session.delete(friendship)
    db.session.commit()
    return jsonify({'msg': 'Amizade desfeita.'}), 200


# ---------- People ----------

@people_bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Only people who chose to be discoverable (plus people I already know)."""
    uid = me()
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify([]), 200
    known = graph.friend_ids(uid) | graph.comember_ids(uid)
    pattern = f'%{q.replace("%", "").replace("_", "")}%'
    rows = db.session.query(User.id).outerjoin(CommunitySettings, CommunitySettings.user_id == User.id).filter(
        User.name.ilike(pattern), User.id != uid,
        or_(CommunitySettings.discoverable.is_(True), User.id.in_(known or [uid])),
    ).limit(20).all()
    blocked = graph.blocked_ids(uid)
    ids = [r[0] for r in rows if r[0] not in blocked]
    users = serializers.users_by_id(ids)
    return jsonify([{**users[i], 'friendship': _friendship_state(uid, i), 'follow_state': _outgoing_state(uid, i)} for i in ids if i in users]), 200


@people_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Community profile: identity, this month's numbers and shared groups."""
    uid = me()
    target = graph.parse_uuid(user_id)
    if not target or not db.session.get(User, target) or not graph.can_see_profile(uid, target):
        return fail('Perfil não encontrado.', 404)
    settings = graph.settings_for(target)
    user = serializers.users_by_id([target])[target]
    today = get_today_cuiaba()
    month_start = today.replace(day=1)
    stats = {}
    known = target in graph.network_ids(uid)
    if (known and settings.share_workouts) or target == uid:
        stats['month_workouts'] = metrics.metric_values('workouts', [target], month_start, today)[target]
        stats['month_minutes'] = metrics.metric_values('workout_minutes', [target], month_start, today)[target]
    if (known and settings.share_streaks) or target == uid:
        from app.modules.gamification.domain.user_streak import UserStreak
        streak = UserStreak.query.filter_by(user_id=target).first()
        alive = streak and streak.last_workout_date and streak.last_workout_date >= today - timedelta(days=1)
        stats['workout_streak'] = streak.current_workout_streak if alive else 0
    friendship = graph.friendship_between(uid, target)
    outgoing = Friendship.query.filter_by(requester_id=uid, addressee_id=target).first()
    incoming = Friendship.query.filter_by(requester_id=target, addressee_id=uid, status='pending').first()
    shared = db.session.query(GroupMember.group_id).filter(GroupMember.user_id == target, GroupMember.group_id.in_(graph.group_ids(uid) or [uid])).count()
    friends = len(graph.friend_ids(target))
    followers = Friendship.query.filter_by(addressee_id=target, status='accepted').count()
    follows_me = Friendship.query.filter_by(requester_id=target, addressee_id=uid, status='accepted').first() is not None
    shared_ids = graph.group_ids(target) & graph.group_ids(uid) if target != uid else set()
    shared_list = [{'id': str(g.id), 'name': g.name} for g in CommunityGroup.query.filter(CommunityGroup.id.in_(shared_ids)).order_by(CommunityGroup.name).limit(6).all()] if shared_ids else []
    db.session.commit()
    return jsonify({
        **user,
        'stats': stats,
        'friend_count': friends,
        'follower_count': followers,
        'follows_me': follows_me,
        'shared_group_list': shared_list,
        'following': bool(outgoing and outgoing.status == 'accepted'),
        'follow_state': 'self' if target == uid else outgoing.status if outgoing else 'none',
        'follow_request_id': str(outgoing.id) if outgoing else None,
        'incoming_request_id': str(incoming.id) if incoming else None,
        'shared_groups': shared,
        'friendship': _friendship_state(uid, target, friendship),
        'friendship_id': str(friendship.id) if friendship else None,
        'blocked_by_me': Block.query.filter_by(blocker_id=uid, blocked_id=target).first() is not None,
    }), 200


# ---------- Safety ----------

@people_bp.route('/blocks', methods=['GET'])
@jwt_required()
def list_blocks():
    uid = me()
    rows = Block.query.filter_by(blocker_id=uid).order_by(Block.created_at.desc()).all()
    users = serializers.users_by_id(b.blocked_id for b in rows)
    return jsonify([users.get(b.blocked_id) or serializers.unknown_user(b.blocked_id) for b in rows]), 200


@people_bp.route('/blocks', methods=['POST'])
@jwt_required()
def block_user():
    """Blocking also ends any friendship and hides both people from each other."""
    uid = me()
    target = graph.parse_uuid(body().get('user_id'))
    if not target or target == uid or not db.session.get(User, target):
        return fail('Pessoa não encontrada.', 404)
    if not Block.query.filter_by(blocker_id=uid, blocked_id=target).first():
        db.session.add(Block(blocker_id=uid, blocked_id=target))
    Friendship.query.filter(or_(and_(Friendship.requester_id == uid, Friendship.addressee_id == target), and_(Friendship.requester_id == target, Friendship.addressee_id == uid))).delete(synchronize_session=False)
    from app.modules.community.domain.models import Follow
    Follow.query.filter(or_(and_(Follow.follower_id == uid, Follow.followed_id == target), and_(Follow.follower_id == target, Follow.followed_id == uid))).delete(synchronize_session=False)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
    return jsonify({'msg': 'Pessoa bloqueada.'}), 200


@people_bp.route('/blocks/<user_id>', methods=['DELETE'])
@jwt_required()
def unblock_user(user_id):
    uid = me()
    target = graph.parse_uuid(user_id)
    Block.query.filter_by(blocker_id=uid, blocked_id=target).delete()
    db.session.commit()
    return jsonify({'msg': 'Desbloqueado.'}), 200


@people_bp.route('/reports', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def report():
    """Report content or a person. Content reported by AUTO_HIDE_REPORTS people is hidden until reviewed."""
    uid = me()
    data = body()
    target_type = data.get('target_type')
    target_id = graph.parse_uuid(data.get('target_id'))
    reason, error = clean_text(data.get('reason'), 280, 'Motivo', required=False)
    if error:
        return fail(error)
    if target_type not in REPORT_TARGETS or not target_id:
        return fail('Denúncia inválida.')
    if target_type == 'activity':
        from app.modules.community.interface.routes_feed import visible_activity
        target = visible_activity(target_id, uid)
    elif target_type == 'comment':
        target = db.session.get(Comment, target_id)
        if target:
            activity = db.session.get(Activity, target.activity_id)
            target = target if activity and graph.can_see_activity(uid, activity) else None
    else:
        target = db.session.get(User, target_id)
    if not target:
        return fail('Conteúdo não encontrado.', 404)
    if not Report.query.filter_by(reporter_id=uid, target_type=target_type, target_id=target_id).first():
        db.session.add(Report(reporter_id=uid, target_type=target_type, target_id=target_id, reason=reason))
        db.session.flush()
    if target_type in ('activity', 'comment'):
        reporters = db.session.query(func.count(func.distinct(Report.reporter_id))).filter(
            Report.target_type == target_type, Report.target_id == target_id).scalar()
        if reporters >= AUTO_HIDE_REPORTS:
            target.status = 'hidden'
    db.session.commit()
    return jsonify({'msg': 'Obrigado! Nossa equipe vai analisar.'}), 201


@people_bp.route('/users/<user_id>/follow', methods=['PUT', 'DELETE'])
@jwt_required()
@limiter.limit('60 per hour')
def follow_user(user_id):
    uid, target = me(), graph.parse_uuid(user_id)
    if request.method == 'PUT':
        return _request_follow(uid, target)
    if not target or target == uid:
        return fail('Pessoa não encontrada.', 404)
    outgoing = Friendship.query.filter_by(requester_id=uid, addressee_id=target).first()
    if outgoing:
        _read_request_notification(target, outgoing.id)
        db.session.delete(outgoing)
    # Remove any pre-approval public follow as well.
    from app.modules.community.domain.models import Follow
    Follow.query.filter_by(follower_id=uid, followed_id=target).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'state': 'none', 'following': False}), 200
