"""Challenges: group challenges (any member creates) and public FitGen challenges (admins)."""
from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.shared.extensions import db, limiter
from app.shared.utils.timezone import get_today_cuiaba
from app.modules.identity.domain.models import User
from app.modules.community.application import challenges as service
from app.modules.community.application import graph, moderation, serializers
from app.modules.community.application.notify import notify
from app.modules.community.domain.models import CHALLENGE_METRICS, Challenge, ChallengeParticipant, CommunityGroup
from app.modules.community.interface.common import body, clean_text, fail, me

challenges_bp = Blueprint('community_challenges', __name__)

MAX_DAYS = 90
MAX_TARGET = 1000
LEADERBOARD_SIZE = 50


def _visible(challenge_id, uid):
    cid = graph.parse_uuid(challenge_id)
    challenge = db.session.get(Challenge, cid) if cid else None
    if not challenge or not service.can_view(challenge, uid):
        return None
    return challenge


def _groups(items):
    ids = {c.group_id for c in items if c.group_id}
    return {g.id: g for g in CommunityGroup.query.filter(CommunityGroup.id.in_(ids)).all()} if ids else {}


@challenges_bp.route('/challenges', methods=['GET'])
@jwt_required()
def list_challenges():
    """scope: mine (joined), available (my groups' + public I haven't joined, not ended), public, group."""
    uid = me()
    scope = request.args.get('scope', 'mine')
    today = get_today_cuiaba()
    groups = graph.group_ids(uid)
    joined = db.session.query(ChallengeParticipant.challenge_id).filter(ChallengeParticipant.user_id == uid)
    visible = or_(Challenge.is_public.is_(True), Challenge.group_id.in_(groups)) if groups else Challenge.is_public.is_(True)
    query = Challenge.query.filter(visible)
    if scope == 'mine':
        query = query.filter(Challenge.id.in_(joined), Challenge.end_date >= today - timedelta(days=30))
    elif scope == 'available':
        query = query.filter(Challenge.id.notin_(joined), Challenge.end_date >= today)
    elif scope == 'public':
        query = query.filter(Challenge.is_public.is_(True), Challenge.end_date >= today)
    elif scope == 'group':
        gid = graph.parse_uuid(request.args.get('group_id'))
        if not gid or gid not in groups:
            return fail('Grupo não encontrado.', 404)
        query = query.filter(Challenge.group_id == gid)
    else:
        return fail('Escopo inválido.')
    items = query.order_by(Challenge.end_date.asc()).limit(100).all()
    by_group = _groups(items)
    data = [serializers.challenge(c, uid, groups_by_id=by_group) for c in items]
    # Active first, then upcoming, then ended.
    order = {'active': 0, 'upcoming': 1, 'ended': 2}
    data.sort(key=lambda c: (order[c['status']], c['end_date']))
    return jsonify(data), 200


def _parse_date(value, fallback):
    if not value:
        return fallback
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


@challenges_bp.route('/challenges', methods=['POST'])
@jwt_required()
@limiter.limit('10 per hour')
def create_challenge():
    uid = me()
    data = body()
    title, error = clean_text(data.get('title'), 80, 'Título')
    if error:
        return fail(error)
    description, error = clean_text(data.get('description'), 280, 'Descrição', required=False)
    if error:
        return fail(error)
    metric = data.get('metric')
    if metric not in CHALLENGE_METRICS:
        return fail('Escolha o que será medido no desafio.')
    target = data.get('target')
    if isinstance(target, bool) or not isinstance(target, int) or not 1 <= target <= MAX_TARGET:
        return fail(f'A meta deve ser um número entre 1 e {MAX_TARGET}.')
    today = get_today_cuiaba()
    start = _parse_date(data.get('start_date'), today)
    if not start or start < today or start > today + timedelta(days=30):
        return fail('O desafio deve começar hoje ou nos próximos 30 dias.')
    days = data.get('duration_days')
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= MAX_DAYS:
        return fail(f'A duração deve ser entre 1 e {MAX_DAYS} dias.')
    end = start + timedelta(days=days - 1)
    if metric in ('active_days', 'hydration_days') and target > days:
        return fail(f'A meta não pode passar de {days} dias.')

    group_id = None
    is_public = bool(data.get('is_public'))
    if is_public:
        user = db.session.get(User, uid)
        if not user or user.role != 'admin':
            return fail('Só a equipe FitGen cria desafios públicos.', 403)
    else:
        group_id = graph.parse_uuid(data.get('group_id'))
        if not group_id or not graph.membership(group_id, uid):
            return fail('Escolha um dos seus grupos.', 403)
    for value in (title, description):
        if value:
            ok, reason = moderation.check_text(value)
            if not ok:
                return fail(reason, 422)

    challenge = Challenge(group_id=group_id, creator_id=uid, title=title, description=description, metric=metric,
                          target=target, start_date=start, end_date=end, is_public=is_public)
    challenge.participants.append(ChallengeParticipant(user_id=uid))
    db.session.add(challenge)
    db.session.commit()
    if group_id:
        group = db.session.get(CommunityGroup, group_id)
        name = serializers.users_by_id([uid]).get(uid, {}).get('name', 'Alguém')
        for member in group.members:
            if member.user_id != uid:
                notify(member.user_id, f'Novo desafio no {group.name}', f'{name} criou "{title}". Topa?',
                       link_type='community_challenge', link_id=challenge.id)
    return jsonify(serializers.challenge(challenge, uid, groups_by_id=_groups([challenge]))), 201


@challenges_bp.route('/challenges/<challenge_id>', methods=['GET'])
@jwt_required()
def get_challenge(challenge_id):
    """Challenge with its leaderboard (top 50, plus me)."""
    uid = me()
    challenge = _visible(challenge_id, uid)
    if not challenge:
        return fail('Desafio não encontrado.', 404)
    progress = service.progress_by_user(challenge)
    if service.complete_if_reached(challenge, progress):
        db.session.refresh(challenge)
    blocked = graph.blocked_ids(uid)
    participants = [p for p in challenge.participants if p.user_id not in blocked]
    participants.sort(key=lambda p: (-progress.get(p.user_id, 0), p.completed_at or p.joined_at))
    top = participants[:LEADERBOARD_SIZE]
    me_row = next((p for p in participants if p.user_id == uid), None)
    if me_row and me_row not in top:
        top.append(me_row)
    users = serializers.users_by_id(p.user_id for p in top)
    rank = {p.user_id: i + 1 for i, p in enumerate(participants)}
    data = serializers.challenge(challenge, uid, progress=progress, groups_by_id=_groups([challenge]))
    member = graph.membership(challenge.group_id, uid) if challenge.group_id else None
    data['can_delete'] = challenge.creator_id == uid or bool(member and member.role == 'admin')
    data['leaderboard'] = [{
        'rank': rank[p.user_id],
        'user': users.get(p.user_id) or serializers.unknown_user(p.user_id),
        'progress': progress.get(p.user_id, 0),
        'completed': p.completed_at is not None,
        'is_me': p.user_id == uid,
    } for p in top]
    return jsonify(data), 200


@challenges_bp.route('/challenges/<challenge_id>/join', methods=['POST'])
@jwt_required()
def join_challenge(challenge_id):
    uid = me()
    challenge = _visible(challenge_id, uid)
    if not challenge:
        return fail('Desafio não encontrado.', 404)
    if service.status(challenge) == 'ended':
        return fail('Este desafio já terminou.', 409)
    if not service.participant(challenge, uid):
        challenge.participants.append(ChallengeParticipant(user_id=uid))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
    service.complete_if_reached(challenge, service.progress_by_user(challenge, only=uid))
    return jsonify(serializers.challenge(challenge, uid, groups_by_id=_groups([challenge]))), 200


@challenges_bp.route('/challenges/<challenge_id>/leave', methods=['POST'])
@jwt_required()
def leave_challenge(challenge_id):
    uid = me()
    challenge = _visible(challenge_id, uid)
    if not challenge:
        return fail('Desafio não encontrado.', 404)
    mine = service.participant(challenge, uid)
    if mine and mine.completed_at:
        return fail('Desafio já concluído. Seu resultado foi preservado.', 409)
    if mine:
        challenge.participants.remove(mine)
        db.session.commit()
    return jsonify(serializers.challenge(challenge, uid, groups_by_id=_groups([challenge]))), 200


@challenges_bp.route('/challenges/<challenge_id>', methods=['DELETE'])
@jwt_required()
def delete_challenge(challenge_id):
    uid = me()
    challenge = _visible(challenge_id, uid)
    if not challenge:
        return fail('Desafio não encontrado.', 404)
    member = graph.membership(challenge.group_id, uid) if challenge.group_id else None
    if challenge.creator_id != uid and not (member and member.role == 'admin'):
        return fail('Só quem criou o desafio pode excluí-lo.', 403)
    db.session.delete(challenge)
    db.session.commit()
    return jsonify({'msg': 'Desafio excluído.'}), 200
