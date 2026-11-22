"""Groups ("squads"): create, invite by code, members, weekly ranking, coach recap, nudges."""
import uuid
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from app.shared import storage
from app.shared.extensions import db, limiter
from app.shared.utils.timezone import now_cuiaba
from app.modules.community.application import graph, metrics, moderation, official, serializers
from app.modules.community.application.group_summary import summary as group_summary
from app.modules.community.application.notify import notify
from app.modules.community.application.publisher import publish
from app.modules.community.domain.models import Challenge, CommunityGroup, GroupMember, new_code
from app.modules.community.interface.common import body, clean_text, fail, me
from app.modules.identity.domain.models import User
from app.shared.subscription_access import is_premium

groups_bp = Blueprint('community_groups', __name__)

MAX_GROUPS_PER_USER = 10
INACTIVE_DAYS = 3


def _photo_data():
    from app.modules.community.interface.routes_feed import _save_image
    upload = request.files.get('file')
    if not upload:
        return None, None, 'Escolha uma foto.'
    data, ext, error = _save_image(upload)
    if error:
        return None, None, error
    ok, reason = moderation.check_image(data, f'image/{"jpeg" if ext == "jpg" else ext}')
    return (data, ext, None) if ok else (None, None, reason)


def _write_photo(group_id, data, ext):
    return storage.save('groups', f'{group_id}_{uuid.uuid4().hex}.{ext}', data, ext)


def _remove_photo(path):
    storage.remove('groups', path)


def _public_group(group_id, uid):
    gid = graph.parse_uuid(group_id)
    group = db.session.get(CommunityGroup, gid) if gid else None
    if not group or not group.is_public:
        return None
    blocked = graph.blocked_ids(uid)
    if any(m.user_id in blocked for m in group.members if m.role == 'admin'):
        return None
    return group


def _my_group(group_id, uid, admin=False):
    gid = graph.parse_uuid(group_id)
    group = db.session.get(CommunityGroup, gid) if gid else None
    member = next((m for m in group.members if m.user_id == uid), None) if group else None
    if not member:
        return None, fail('Grupo não encontrado.', 404)
    if admin and member.role != 'admin':
        return None, fail('Só administradores do grupo podem fazer isso.', 403)
    return group, None


def _validated(data, partial=False):
    out = {}
    if 'name' in data or not partial:
        name, error = clean_text(data.get('name'), 60, 'Nome')
        if error:
            return None, error
        if len(name) < 2:
            return None, 'O nome precisa ter pelo menos 2 caracteres.'
        out['name'] = name
    if 'description' in data:
        description, error = clean_text(data.get('description'), 280, 'Descrição', required=False)
        if error:
            return None, error
        out['description'] = description
    if 'is_public' in data:
        value = data['is_public']
        if request.mimetype == 'multipart/form-data' and value in ('true', 'false'):
            value = value == 'true'
        if not isinstance(value, bool):
            return None, 'Escolha clube público ou privado.'
        out['is_public'] = value
    for value in out.values():
        if isinstance(value, str) and value:
            ok, reason = moderation.check_text(value)
            if not ok:
                return None, reason
    return out, None


@groups_bp.route('/groups', methods=['GET'])
@jwt_required()
def list_groups():
    """My groups with my position in this week's ranking."""
    uid = me()
    scope = request.args.get('scope', 'mine')
    if scope == 'public':
        blocked = graph.blocked_ids(uid)
        excluded = db.session.query(GroupMember.group_id).filter(GroupMember.role == 'admin', GroupMember.user_id.in_(blocked))
        groups = CommunityGroup.query.filter(CommunityGroup.is_public.is_(True), CommunityGroup.id.notin_(excluded)).order_by(CommunityGroup.created_at.desc()).limit(100).all()
        # The PRO club is private but listed for discovery; the app joins it only with Premium.
        pro = db.session.get(CommunityGroup, official.PRO_CLUB_ID)
        if pro:
            groups.insert(0, pro)
        # How many people I follow are in each club: drives the app's "Para você" suggestions.
        followed = graph.followed_ids(uid)
        return jsonify([serializers.group(g, uid, {
            'followed_members': sum(1 for m in g.members if m.user_id in followed),
        }) for g in groups]), 200
    if scope != 'mine':
        return fail('Escopo inválido.')
    groups = CommunityGroup.query.join(GroupMember).filter(GroupMember.user_id == uid).order_by(CommunityGroup.created_at.desc()).all()
    result = []
    for g in groups:
        ranking = metrics.weekly_ranking([m.user_id for m in g.members if m.user_id not in graph.blocked_ids(uid)])
        position = next((i + 1 for i, r in enumerate(ranking) if r['user_id'] == uid), None)
        result.append(serializers.group(g, uid, {
            'my_rank': position,
            'week_workouts': sum(r['workouts'] for r in ranking),
        }))
    return jsonify(result), 200


@groups_bp.route('/groups', methods=['POST'])
@jwt_required()
@limiter.limit('10 per hour')
def create_group():
    uid = me()
    fields, error = _validated(request.form if request.form or request.files else body())
    if error:
        return fail(error)
    if GroupMember.query.filter_by(user_id=uid).count() >= MAX_GROUPS_PER_USER:
        return fail(f'Você pode participar de até {MAX_GROUPS_PER_USER} grupos.')
    image = None
    if request.files.get('file'):
        data, ext, error = _photo_data()
        if error:
            return fail(error)
        image = (data, ext)
    group = CommunityGroup(owner_id=uid, **fields)
    group.members.append(GroupMember(user_id=uid, role='admin'))
    db.session.add(group)
    path = None
    try:
        db.session.flush()
        if image:
            path = _write_photo(group.id, *image)
            group.profile_picture = path
        db.session.commit()
    except storage.StorageError as exc:
        db.session.rollback()
        return fail(str(exc), 503)
    except Exception:
        db.session.rollback()
        _remove_photo(path)
        raise
    return jsonify(serializers.group(group, uid)), 201


@groups_bp.route('/groups/preview/<code>', methods=['GET'])
@jwt_required()
def preview_group(code):
    """Name and size of a group before joining (invite links)."""
    uid = me()
    group = CommunityGroup.query.filter_by(invite_code=(code or '').strip().upper()).first()
    if not group:
        return fail('Código de convite inválido.', 404)
    data = serializers.group(group, uid)
    data.pop('invite_code', None)
    data['is_member'] = any(m.user_id == uid for m in group.members)
    data['is_full'] = False  # no member cap; kept for older app builds
    return jsonify(data), 200


@groups_bp.route('/groups/join', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def join_group():
    uid = me()
    code = str(body().get('code') or '').strip().upper()
    if code:
        group = CommunityGroup.query.filter_by(invite_code=code).with_for_update().first()
    else:
        gid = graph.parse_uuid(body().get('group_id'))
        query = CommunityGroup.query.filter_by(id=gid)
        if not official.is_pro_club(gid):
            query = query.filter_by(is_public=True)
        group = query.with_for_update().first() if gid else None
    if not group:
        return fail('Código de convite inválido.', 404)
    if any(m.user_id == uid for m in group.members):
        return jsonify(serializers.group(group, uid)), 200
    if official.is_pro_club(group.id) and not is_premium(db.session.get(User, uid)):
        return jsonify({'msg': 'O clube FitGen PRO é exclusivo para assinantes.', 'code': 'premium_required', 'feature': 'pro_club'}), 402
    if GroupMember.query.filter_by(user_id=uid).count() >= MAX_GROUPS_PER_USER:
        return fail(f'Você pode participar de até {MAX_GROUPS_PER_USER} grupos.')
    if any(graph.is_blocked(uid, m.user_id) for m in group.members if m.role == 'admin'):
        return fail('Não foi possível entrar neste grupo.', 403)
    group.members.append(GroupMember(user_id=uid))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(serializers.group(group, uid)), 200
    publish(uid, 'group_joined', {'group_name': group.name}, source_id=group.id, audience='group', group_id=group.id)
    name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
    for admin in [m for m in group.members if m.role == 'admin' and m.user_id != uid]:
        notify(admin.user_id, f'{name} entrou no {group.name}', 'Dê as boas-vindas no feed do grupo.',
               link_type='community_group', link_id=group.id)
    return jsonify(serializers.group(group, uid)), 200


@groups_bp.route('/groups/<group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Group page: members with this week's numbers, ranking and active challenges."""
    uid = me()
    group, error = _my_group(group_id, uid)
    if error:
        group = _public_group(group_id, uid)
        if not group:
            return error
        return jsonify(serializers.group(group, uid, {'members': [], 'challenges': [], 'week': None})), 200
    member_ids = [m.user_id for m in group.members if m.user_id not in graph.blocked_ids(uid)]
    ranking = metrics.weekly_ranking(member_ids)
    users = serializers.users_by_id(member_ids)
    last = metrics.last_active([i for i in member_ids if graph.settings_for(i).share_workouts])
    roles = {m.user_id: m.role for m in group.members}
    blocked = graph.blocked_ids(uid)
    cutoff = now_cuiaba() - timedelta(days=INACTIVE_DAYS)
    members = []
    for position, row in enumerate(ranking, start=1):
        member_id = row['user_id']
        members.append({
            'user': users.get(member_id) or serializers.unknown_user(member_id),
            'role': roles.get(member_id),
            'rank': position,
            'workouts': row['workouts'],
            'minutes': row['minutes'],
            'active_days': row['active_days'],
            'last_workout_at': serializers.iso(last.get(member_id)),
            'inactive': graph.settings_for(member_id).share_workouts and (not last.get(member_id) or last[member_id] < cutoff),
            'is_me': member_id == uid,
            'blocked': member_id in blocked,
        })
    week_start, week_end = metrics.week_bounds()
    challenges = Challenge.query.filter(Challenge.group_id == group.id, Challenge.end_date >= week_start - timedelta(days=7)).order_by(Challenge.start_date.desc()).all()
    return jsonify(serializers.group(group, uid, {
        'members': members,
        'week': {'start': week_start.isoformat(), 'end': week_end.isoformat()},
        'challenges': [serializers.challenge(c, uid, groups_by_id={group.id: group}) for c in challenges],
    })), 200


@groups_bp.route('/groups/<group_id>/summary', methods=['GET'])
@jwt_required()
@limiter.limit('6 per hour')
def get_summary(group_id):
    uid = me()
    group, error = _my_group(group_id, uid)
    if error:
        return error
    return jsonify({'text': group_summary(group, uid)}), 200


@groups_bp.route('/groups/<group_id>', methods=['PUT'])
@jwt_required()
def update_group(group_id):
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    fields, message = _validated(body(), partial=True)
    if message:
        return fail(message)
    for key, value in fields.items():
        setattr(group, key, value)
    db.session.commit()
    return jsonify(serializers.group(group, uid)), 200


@groups_bp.route('/groups/<group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    old_photo = group.profile_picture
    db.session.delete(group)
    db.session.commit()
    _remove_photo(old_photo)
    return jsonify({'msg': 'Grupo excluído.'}), 200


@groups_bp.route('/groups/<group_id>/invite-code', methods=['POST'])
@jwt_required()
def rotate_code(group_id):
    """New invite code; the old one stops working."""
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    group.invite_code = new_code()
    db.session.commit()
    return jsonify({'invite_code': group.invite_code}), 200


@groups_bp.route('/groups/<group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """Leaving as the last admin promotes the longest-standing member; the last one out deletes the group."""
    uid = me()
    group, error = _my_group(group_id, uid)
    if error:
        return error
    mine = next(m for m in group.members if m.user_id == uid)
    others = sorted((m for m in group.members if m.user_id != uid), key=lambda m: m.joined_at)
    old_photo = group.profile_picture if not others else None
    if not others:
        db.session.delete(group)
    else:
        if mine.role == 'admin' and not any(m.role == 'admin' for m in others):
            others[0].role = 'admin'
            group.owner_id = others[0].user_id
        group.members.remove(mine)
    db.session.commit()
    _remove_photo(old_photo)
    return jsonify({'msg': 'Você saiu do grupo.'}), 200


@groups_bp.route('/groups/<group_id>/members/<user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(group_id, user_id):
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    target = graph.parse_uuid(user_id)
    member = next((m for m in group.members if m.user_id == target), None)
    if not member or target == uid:
        return fail('Membro não encontrado.', 404)
    group.members.remove(member)
    db.session.commit()
    return jsonify({'msg': 'Membro removido.'}), 200


@groups_bp.route('/groups/<group_id>/members/<user_id>/role', methods=['PUT'])
@jwt_required()
def set_role(group_id, user_id):
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    role = body().get('role')
    target = graph.parse_uuid(user_id)
    member = next((m for m in group.members if m.user_id == target), None)
    if role not in ('admin', 'member') or not member:
        return fail('Dados inválidos.')
    if role == 'member' and not any(m.role == 'admin' for m in group.members if m.user_id != target):
        return fail('O grupo precisa de pelo menos um administrador.')
    member.role = role
    db.session.commit()
    return jsonify({'msg': 'Função atualizada.'}), 200


@groups_bp.route('/groups/<group_id>/members/<user_id>/nudge', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def nudge(group_id, user_id):
    """"Bora treinar!" push to another member (once a day per sender)."""
    uid = me()
    group, error = _my_group(group_id, uid)
    if error:
        return error
    target = graph.parse_uuid(user_id)
    if not target or target == uid or not any(m.user_id == target for m in group.members):
        return fail('Membro não encontrado.', 404)
    if graph.is_blocked(uid, target):
        return fail('Não foi possível chamar este membro.', 403)
    name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
    notify(target, f'{name.split()[0]} te chamou pra treinar 💪', f'O pessoal do {group.name} está esperando você hoje.',
           link_type='community_group', link_id=group.id)
    return jsonify({'msg': 'Chamado enviado!'}), 200


@groups_bp.route('/groups/<group_id>/image', methods=['POST', 'DELETE'])
@jwt_required()
@limiter.limit('20 per hour')
def update_group_image(group_id):
    uid = me()
    group, error = _my_group(group_id, uid, admin=True)
    if error:
        return error
    data = ext = None
    if request.method == 'POST':
        data, ext, error = _photo_data()
        if error:
            return fail(error)
    old = group.profile_picture
    path = None
    try:
        path = _write_photo(group.id, data, ext) if data else None
        group.profile_picture = path
        db.session.commit()
    except storage.StorageError as exc:
        db.session.rollback()
        return fail(str(exc), 503)
    except Exception:
        db.session.rollback()
        _remove_photo(path)
        raise
    _remove_photo(old)
    return jsonify(serializers.group(group, uid)), 200


@groups_bp.route('/groups/<group_id>/image', methods=['GET'])
@jwt_required()
def get_group_image(group_id):
    uid = me()
    group, error = _my_group(group_id, uid)
    if error:
        group = _public_group(group_id, uid)
        if not group:
            return error
    if not group.profile_picture:
        return fail('Este clube ainda não tem foto.', 404)
    payload = storage.image_payload('groups', group.profile_picture)
    if payload is None:
        return fail('Foto não encontrada.', 404)
    response = jsonify(payload)
    response.headers['Cache-Control'] = 'no-store'
    return response
