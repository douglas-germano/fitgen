"""Feed, posts, reactions and comments."""
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import and_, or_

from app.shared import images, storage
from app.shared.extensions import db, limiter
from app.modules.community.application import graph, moderation, serializers
from app.modules.community.application.notify import notify
from app.modules.community.domain.models import (
    REACTION_KINDS, Activity, Comment, CommunityGroup, GroupMember, Reaction,
)
from app.modules.community.interface.common import body, clean_text, fail, me

feed_bp = Blueprint('community_feed', __name__)

MAX_POST_IMAGE_BYTES = 10 * 1024 * 1024
PAGE_SIZE = 20
IMAGE_RATIOS = ('4:5', '9:16')  # feed photo formats; the app crops to the chosen one
# (masculine?, noun) for "reagiu ao seu treino" / "comentou na sua conquista".
TYPE_LABELS = {
    'workout_completed': (True, 'treino'), 'streak': (False, 'sequência'), 'achievement': (False, 'conquista'),
    'hydration_goal': (False, 'meta de água'), 'challenge_completed': (True, 'desafio'), 'post': (True, 'post'),
    'group_joined': (False, 'entrada no grupo'),
}


def _about(activity, verb):
    masculine, noun = TYPE_LABELS.get(activity.type, (False, 'publicação'))
    if verb == 'reagiu':
        return f'reagiu {"ao seu" if masculine else "à sua"} {noun}'
    return f'comentou {"no seu" if masculine else "na sua"} {noun}'


def _cursor(value):
    try:
        created, ident = value.split('|', 1)
        return datetime.fromisoformat(created), uuid.UUID(ident)
    except (AttributeError, ValueError):
        return None


def _groups_for(items):
    ids = {a.group_id for a in items if a.group_id}
    return {g.id: g for g in CommunityGroup.query.filter(CommunityGroup.id.in_(ids)).all()} if ids else {}


def visible_activity(activity_id, user_id):
    activity = db.session.get(Activity, graph.parse_uuid(activity_id)) if graph.parse_uuid(activity_id) else None
    if not activity or not graph.can_see_activity(user_id, activity):
        return None
    return activity


@feed_bp.route('/feed', methods=['GET'])
@jwt_required()
def get_feed():
    """Activity feed. scope: home (friends + groups), group, user or public. Cursor-paginated."""
    uid = me()
    scope = request.args.get('scope', 'home')
    query = Activity.query.filter(Activity.status == 'visible')
    blocked = graph.blocked_ids(uid)
    if scope == 'home':
        # People I know; public posts by strangers live in "Descobrir".
        clauses = [and_(Activity.audience.in_(('network', 'public')), Activity.user_id.in_(graph.network_ids(uid)))]
        followed = graph.followed_ids(uid)
        if followed:
            clauses.append(and_(Activity.audience == 'public', Activity.user_id.in_(followed)))
        groups = graph.group_ids(uid)
        if groups:
            clauses.append(and_(Activity.audience == 'group', Activity.group_id.in_(groups)))
        query = query.filter(or_(*clauses))
        if blocked:
            query = query.filter(Activity.user_id.notin_(blocked))
    elif scope == 'group':
        group_id = graph.parse_uuid(request.args.get('group_id'))
        if not group_id or not graph.membership(group_id, uid):
            return fail('Grupo não encontrado.', 404)
        members = [m.user_id for m in GroupMember.query.filter_by(group_id=group_id).all()]
        query = query.filter(or_(
            and_(Activity.audience == 'group', Activity.group_id == group_id),
            and_(Activity.audience.in_(('network', 'public')), Activity.user_id.in_(members)),
        ))
        if blocked:
            query = query.filter(Activity.user_id.notin_(blocked))
    elif scope == 'user':
        target = graph.parse_uuid(request.args.get('user_id'))
        if not target or not graph.can_see_profile(uid, target):
            return fail('Perfil não encontrado.', 404)
        query = query.filter(Activity.user_id == target)
        if target != uid:
            query = query.filter(graph.visibility_filter(uid))
    elif scope == 'public':
        query = query.filter(Activity.audience == 'public')
        if blocked:
            query = query.filter(Activity.user_id.notin_(blocked))
    else:
        return fail('Escopo inválido.')

    cursor = _cursor(request.args.get('cursor'))
    if cursor:
        created, ident = cursor
        query = query.filter(or_(Activity.created_at < created, and_(Activity.created_at == created, Activity.id < ident)))
    limit = min(max(request.args.get('limit', PAGE_SIZE, type=int), 1), 50)
    items = query.order_by(Activity.created_at.desc(), Activity.id.desc()).limit(limit + 1).all()
    more = len(items) > limit
    items = items[:limit]
    db.session.commit()  # settings rows created on first visit
    return jsonify({
        'items': serializers.activities(items, uid, _groups_for(items)),
        'next_cursor': f'{items[-1].created_at.isoformat()}|{items[-1].id}' if more and items else None,
    }), 200


def _save_image(upload):
    from app.modules.identity.interface.routes.profile import _image_extension
    data = upload.read(MAX_POST_IMAGE_BYTES + 1)
    if not data:
        return None, None, 'A imagem está vazia.'
    if len(data) > MAX_POST_IMAGE_BYTES:
        return None, None, 'A imagem é muito grande. Use uma de até 10 MB.'
    ext = _image_extension(data)
    if not ext:
        return None, None, 'Formato não suportado. Envie uma foto JPG, PNG, GIF ou WEBP.'
    return data, ext, None


@feed_bp.route('/posts', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def create_post():
    """Manual post (text and/or photo). audience: network | group (with group_id) | public."""
    uid = me()
    form = request.form if request.files or request.form else body()
    text, error = clean_text(form.get('text'), 1000, 'Texto', required=False)
    if error:
        return fail(error)
    audience = form.get('audience') or 'network'
    if audience not in ('network', 'group', 'public'):
        return fail('Público inválido.')
    group_id = None
    if audience == 'group':
        group_id = graph.parse_uuid(form.get('group_id'))
        if not group_id or not graph.membership(group_id, uid):
            return fail('Você não participa desse grupo.', 403)

    upload = request.files.get('file')
    image = None
    if upload:
        data, ext, error = _save_image(upload)
        if error:
            return fail(error)
        image = (data, ext)
    if not text and not image:
        return fail('Escreva algo ou escolha uma foto.')
    ratio = form.get('ratio') or '4:5'
    if ratio not in IMAGE_RATIOS:
        return fail('Formato de foto inválido. Use 4:5 ou 9:16.')

    if text:
        ok, reason = moderation.check_text(text)
        if not ok:
            return fail(reason, 422)
    image_path = None
    if image:
        try:
            data = images.feed_photo(image[0], ratio)  # 1080 px max, in the chosen format, no metadata
        except images.ImageError as exc:
            return fail(str(exc))
        ok, reason = moderation.check_image(data, 'image/jpeg')
        if not ok:
            return fail(reason, 422)
        try:
            image_path = storage.save('posts', f'{uuid.uuid4().hex}.jpg', data, 'jpg')
        except storage.StorageError as exc:
            return fail(str(exc), 503)

    activity = Activity(user_id=uid, type='post', audience=audience, group_id=group_id, payload={'ratio': ratio} if image_path else {}, text=text, image_path=image_path)
    db.session.add(activity)
    db.session.commit()
    return jsonify(serializers.activities([activity], uid, _groups_for([activity]))[0]), 201


@feed_bp.route('/activities/<activity_id>', methods=['GET'])
@jwt_required()
def get_activity(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    return jsonify(serializers.activities([activity], uid, _groups_for([activity]))[0]), 200


def _remove_image(activity):
    storage.remove('posts', activity.image_path)


@feed_bp.route('/activities/<activity_id>', methods=['DELETE'])
@jwt_required()
def delete_activity(activity_id):
    """Author, or an admin of the group the item was posted to."""
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    member = graph.membership(activity.group_id, uid) if activity.group_id else None
    if activity.user_id != uid and not (member and member.role == 'admin' and activity.audience == 'group'):
        return fail('Você não pode remover esta publicação.', 403)
    _remove_image(activity)
    db.session.delete(activity)
    db.session.commit()
    return jsonify({'msg': 'Publicação removida.'}), 200


@feed_bp.route('/activities/<activity_id>/reaction', methods=['PUT'])
@jwt_required()
@limiter.limit('120 per hour')
def react(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    kind = body().get('kind', 'fire')
    if kind not in REACTION_KINDS:
        return fail('Reação inválida.')
    reaction = Reaction.query.filter_by(activity_id=activity.id, user_id=uid).first()
    created = reaction is None
    if created:
        reaction = Reaction(activity_id=activity.id, user_id=uid, kind=kind)
        db.session.add(reaction)
    else:
        reaction.kind = kind
    db.session.commit()
    if created and activity.user_id != uid:
        name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
        notify(activity.user_id, f'{name} {_about(activity, "reagiu")}',
               'Abra a comunidade para ver.', link_type='community_activity', link_id=activity.id)
    return jsonify(serializers.activities([activity], uid, _groups_for([activity]))[0]), 200


@feed_bp.route('/activities/<activity_id>/reaction', methods=['DELETE'])
@jwt_required()
def unreact(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    Reaction.query.filter_by(activity_id=activity.id, user_id=uid).delete()
    db.session.commit()
    return jsonify(serializers.activities([activity], uid, _groups_for([activity]))[0]), 200


@feed_bp.route('/activities/<activity_id>/reactions', methods=['GET'])
@jwt_required()
def list_reactions(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    blocked = graph.blocked_ids(uid)
    rows = [r for r in Reaction.query.filter_by(activity_id=activity.id).order_by(Reaction.created_at.desc()).limit(200).all() if r.user_id not in blocked]
    users = serializers.users_by_id(r.user_id for r in rows)
    return jsonify([{'kind': r.kind, 'user': users.get(r.user_id) or serializers.unknown_user(r.user_id)} for r in rows]), 200


@feed_bp.route('/activities/<activity_id>/comments', methods=['GET'])
@jwt_required()
def list_comments(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    query = Comment.query.filter_by(activity_id=activity.id, status='visible')
    blocked = graph.blocked_ids(uid)
    if blocked:
        query = query.filter(Comment.user_id.notin_(blocked))
    return jsonify(serializers.comments(query.order_by(Comment.created_at.asc()).limit(300).all(), uid)), 200


@feed_bp.route('/activities/<activity_id>/comments', methods=['POST'])
@jwt_required()
@limiter.limit('60 per hour')
def add_comment(activity_id):
    uid = me()
    activity = visible_activity(activity_id, uid)
    if not activity:
        return fail('Publicação não encontrada.', 404)
    text, error = clean_text(body().get('text'), 500, 'Comentário')
    if error:
        return fail(error)
    ok, reason = moderation.check_text(text)
    if not ok:
        return fail(reason, 422)
    comment = Comment(activity_id=activity.id, user_id=uid, text=text)
    db.session.add(comment)
    db.session.commit()
    if activity.user_id != uid:
        name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
        notify(activity.user_id, f'{name} {_about(activity, "comentou")}',
               text[:120], link_type='community_activity', link_id=activity.id)
    return jsonify(serializers.comments([comment], uid)[0]), 201


@feed_bp.route('/comments/<comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    """Comment author or the author of the post."""
    uid = me()
    cid = graph.parse_uuid(comment_id)
    comment = db.session.get(Comment, cid) if cid else None
    activity = db.session.get(Activity, comment.activity_id) if comment else None
    if not comment or not activity or (comment.user_id != uid and activity.user_id != uid):
        return fail('Comentário não encontrado.', 404)
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'msg': 'Comentário removido.'}), 200



@feed_bp.route('/activities/<activity_id>/image', methods=['GET'])
@jwt_required()
def get_image(activity_id):
    activity = visible_activity(activity_id, me())
    if not activity or activity.status != 'visible' or not activity.image_path:
        return fail('Foto não encontrada.', 404)
    payload = storage.image_payload('posts', activity.image_path)
    if payload is None:
        return fail('Foto não encontrada.', 404)
    response = jsonify(payload)
    response.headers['Cache-Control'] = 'no-store'
    return response
