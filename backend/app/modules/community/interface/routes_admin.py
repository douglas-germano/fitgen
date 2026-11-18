"""Admin panel: manage community clubs (list, edit, members, posts, delete). Mounted at /api/admin/clubs."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, or_

from app.modules.community.application import graph
from app.modules.community.domain.models import Activity, CommunityGroup, GroupMember, Report, new_code
from app.modules.community.interface.common import body, clean_text, fail
from app.modules.identity.domain.audit_log import AuditLog
from app.modules.identity.domain.models import User
from app.shared import storage
from app.shared.extensions import db
from app.shared.utils.timezone import now_cuiaba

clubs_admin_bp = Blueprint('clubs_admin', __name__)


def _admin():
    return db.session.get(User, graph.parse_uuid(get_jwt_identity()))


@clubs_admin_bp.before_request
def require_admin():
    if request.method == 'OPTIONS':
        return None
    verify_jwt_in_request()
    user = _admin()
    if not user or user.role != 'admin':
        return jsonify({'msg': 'Admin access required'}), 403
    return None


def _club(club_id):
    gid = graph.parse_uuid(club_id)
    return db.session.get(CommunityGroup, gid) if gid else None


def _audit(action, club, description, changes=None):
    AuditLog.log(user=_admin(), action=action, resource_type='club', resource_id=club.id,
                 description=description, changes=changes)


def _people(ids):
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = db.session.query(User.id, User.name, User.email).filter(User.id.in_(ids)).all()
    return {r.id: {'id': str(r.id), 'name': r.name or r.email.split('@')[0], 'email': r.email} for r in rows}


def _summary(club, owner, posts=0, last_activity=None):
    return {
        'id': str(club.id),
        'name': club.name,
        'description': club.description,
        'is_public': club.is_public,
        'has_photo': bool(club.profile_picture),
        'member_count': len(club.members),
        'admin_count': sum(1 for m in club.members if m.role == 'admin'),
        'post_count': posts,
        'owner': owner,
        'created_at': club.created_at.isoformat() if club.created_at else None,
        'last_activity_at': last_activity.isoformat() if last_activity else None,
    }


@clubs_admin_bp.route('', methods=['GET'])
def list_clubs():
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 10, type=int), 1), 100)
    search = (request.args.get('search') or '').strip()
    visibility = request.args.get('visibility', 'all')
    sort = request.args.get('sort', 'recent')

    members = (db.session.query(GroupMember.group_id, func.count(GroupMember.id).label('n'))
               .group_by(GroupMember.group_id).subquery())
    posts = (db.session.query(Activity.group_id, func.count(Activity.id).label('n'), func.max(Activity.created_at).label('last'))
             .filter(Activity.group_id.isnot(None)).group_by(Activity.group_id).subquery())
    query = (db.session.query(CommunityGroup, func.coalesce(posts.c.n, 0), posts.c.last)
             .outerjoin(members, members.c.group_id == CommunityGroup.id)
             .outerjoin(posts, posts.c.group_id == CommunityGroup.id))
    if search:
        owner_ids = db.session.query(User.id).filter(or_(User.name.ilike(f'%{search}%'), User.email.ilike(f'%{search}%')))
        query = query.filter(or_(CommunityGroup.name.ilike(f'%{search}%'), CommunityGroup.invite_code == search.upper(),
                                 CommunityGroup.owner_id.in_(owner_ids)))
    if visibility in ('public', 'private'):
        query = query.filter(CommunityGroup.is_public.is_(visibility == 'public'))
    order = {
        'members': func.coalesce(members.c.n, 0).desc(),
        'activity': posts.c.last.desc().nullslast(),
    }.get(sort, CommunityGroup.created_at.desc())
    pagination = query.order_by(order, CommunityGroup.id).paginate(page=page, per_page=per_page, error_out=False)

    owners = _people(club.owner_id for club, _, _ in pagination.items)
    week_ago = now_cuiaba() - timedelta(days=7)
    stats = {
        'total': CommunityGroup.query.count(),
        'public': CommunityGroup.query.filter_by(is_public=True).count(),
        'memberships': GroupMember.query.count(),
        'new_this_week': CommunityGroup.query.filter(CommunityGroup.created_at >= week_ago).count(),
    }
    return jsonify({
        'clubs': [_summary(club, owners.get(club.owner_id), n, last) for club, n, last in pagination.items],
        'stats': stats,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page,
    }), 200


@clubs_admin_bp.route('/<club_id>', methods=['GET'])
def club_detail(club_id):
    club = _club(club_id)
    if not club:
        return fail('Clube não encontrado.', 404)
    recent = (Activity.query.filter_by(group_id=club.id).order_by(Activity.created_at.desc()).limit(30).all())
    post_count = Activity.query.filter_by(group_id=club.id).count()
    people = _people([m.user_id for m in club.members] + [a.user_id for a in recent] + [club.owner_id])
    reports = dict(db.session.query(Report.target_id, func.count(Report.id))
                   .filter(Report.target_type == 'activity', Report.status == 'open',
                           Report.target_id.in_([a.id for a in recent] or [None]))
                   .group_by(Report.target_id).all())
    data = _summary(club, people.get(club.owner_id), post_count, recent[0].created_at if recent else None)
    data['invite_code'] = club.invite_code
    data['members'] = [{
        **(people.get(m.user_id) or {'id': str(m.user_id), 'name': 'Usuário removido', 'email': ''}),
        'role': m.role,
        'joined_at': m.joined_at.isoformat() if m.joined_at else None,
    } for m in sorted(club.members, key=lambda m: (m.role != 'admin', m.joined_at))]
    data['posts'] = [{
        'id': str(a.id),
        'type': a.type,
        'text': a.text,
        'has_image': bool(a.image_path),
        'status': a.status,
        'open_reports': reports.get(a.id, 0),
        'author': people.get(a.user_id),
        'created_at': a.created_at.isoformat() if a.created_at else None,
    } for a in recent]
    return jsonify(data), 200


@clubs_admin_bp.route('/<club_id>/photo', methods=['GET'])
def club_photo(club_id):
    club = _club(club_id)
    payload = storage.image_payload('groups', club.profile_picture) if club else None
    if not payload:
        return fail('Este clube não tem foto.', 404)
    response = jsonify(payload)
    response.headers['Cache-Control'] = 'no-store'
    return response


@clubs_admin_bp.route('/<club_id>', methods=['PUT'])
def update_club(club_id):
    club = _club(club_id)
    if not club:
        return fail('Clube não encontrado.', 404)
    data, changes = body(), {}
    if 'name' in data:
        name, error = clean_text(data.get('name'), 60, 'Nome')
        if error:
            return fail(error)
        if len(name) < 2:
            return fail('O nome precisa ter pelo menos 2 caracteres.')
        changes['name'] = name
    if 'description' in data:
        description, error = clean_text(data.get('description'), 280, 'Descrição', required=False)
        if error:
            return fail(error)
        changes['description'] = description
    if 'is_public' in data:
        if not isinstance(data['is_public'], bool):
            return fail('Escolha clube público ou privado.')
        changes['is_public'] = data['is_public']
    diff = {k: {'old': getattr(club, k), 'new': v} for k, v in changes.items() if getattr(club, k) != v}
    for key, value in changes.items():
        setattr(club, key, value)
    if diff:
        _audit('update_club', club, f"Edited club '{club.name}'", diff)
    db.session.commit()
    return jsonify({'msg': 'Clube atualizado.'}), 200


@clubs_admin_bp.route('/<club_id>', methods=['DELETE'])
def delete_club(club_id):
    club = _club(club_id)
    if not club:
        return fail('Clube não encontrado.', 404)
    photo = club.profile_picture
    post_images = [a.image_path for a in Activity.query.filter_by(group_id=club.id).filter(Activity.image_path.isnot(None))]
    _audit('delete_club', club, f"Deleted club '{club.name}' ({len(club.members)} members)")
    db.session.delete(club)
    db.session.commit()
    storage.remove('groups', photo)
    for path in post_images:
        storage.remove('posts', path)
    return jsonify({'msg': 'Clube excluído.'}), 200


@clubs_admin_bp.route('/<club_id>/photo', methods=['DELETE'])
def remove_photo(club_id):
    club = _club(club_id)
    if not club or not club.profile_picture:
        return fail('Este clube não tem foto.', 404)
    old, club.profile_picture = club.profile_picture, None
    _audit('remove_club_photo', club, f"Removed photo of club '{club.name}'")
    db.session.commit()
    storage.remove('groups', old)
    return jsonify({'msg': 'Foto removida.'}), 200


@clubs_admin_bp.route('/<club_id>/invite-code', methods=['POST'])
def rotate_code(club_id):
    club = _club(club_id)
    if not club:
        return fail('Clube não encontrado.', 404)
    club.invite_code = new_code()
    _audit('rotate_club_code', club, f"New invite code for club '{club.name}'")
    db.session.commit()
    return jsonify({'invite_code': club.invite_code}), 200


def _member(club, user_id):
    target = graph.parse_uuid(user_id)
    return next((m for m in club.members if m.user_id == target), None) if club else None


@clubs_admin_bp.route('/<club_id>/members/<user_id>', methods=['DELETE'])
def remove_member(club_id, user_id):
    club = _club(club_id)
    member = _member(club, user_id)
    if not member:
        return fail('Membro não encontrado.', 404)
    others = sorted((m for m in club.members if m is not member), key=lambda m: m.joined_at)
    if not others:
        return fail('É o último membro. Exclua o clube em vez disso.')
    if member.role == 'admin' and not any(m.role == 'admin' for m in others):
        others[0].role = 'admin'
    if club.owner_id == member.user_id:
        club.owner_id = next(m.user_id for m in others if m.role == 'admin')
    _audit('remove_club_member', club, f"Removed member {member.user_id} from club '{club.name}'")
    club.members.remove(member)
    db.session.commit()
    return jsonify({'msg': 'Membro removido.'}), 200


@clubs_admin_bp.route('/<club_id>/members/<user_id>/role', methods=['PUT'])
def set_role(club_id, user_id):
    club = _club(club_id)
    member = _member(club, user_id)
    role = body().get('role')
    if not member or role not in ('admin', 'member'):
        return fail('Dados inválidos.')
    if role == 'member' and not any(m.role == 'admin' for m in club.members if m is not member):
        return fail('O clube precisa de pelo menos um administrador.')
    member.role = role
    if role == 'member' and club.owner_id == member.user_id:
        club.owner_id = next(m.user_id for m in club.members if m.role == 'admin' and m is not member)
    _audit('set_club_role', club, f"Set {member.user_id} as {role} in club '{club.name}'")
    db.session.commit()
    return jsonify({'msg': 'Função atualizada.'}), 200


@clubs_admin_bp.route('/<club_id>/posts/<post_id>', methods=['PUT'])
def moderate_post(club_id, post_id):
    """Hide or show a club post; resolves its open reports."""
    club = _club(club_id)
    pid = graph.parse_uuid(post_id)
    post = Activity.query.filter_by(id=pid, group_id=club.id).first() if club and pid else None
    status = body().get('status')
    if not post or status not in ('visible', 'hidden'):
        return fail('Publicação não encontrada.', 404)
    post.status = status
    Report.query.filter_by(target_type='activity', target_id=post.id, status='open').update({'status': 'resolved'})
    _audit('moderate_club_post', club, f"Post {post.id} in club '{club.name}' set to {status}")
    db.session.commit()
    return jsonify({'msg': 'Publicação ocultada.' if status == 'hidden' else 'Publicação visível.'}), 200
