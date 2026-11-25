from datetime import datetime, timedelta, timezone
from math import asin, cos, isfinite, radians, sin, sqrt
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer

from app.modules.identity.domain.models import User
from app.modules.training.domain.models import OutdoorSession
from app.shared.extensions import db

outdoor_bp = Blueprint('outdoor', __name__)

ACTIVITIES = {'run': 'Corrida ao ar livre', 'walk': 'Caminhada ao ar livre', 'bike': 'Pedal ao ar livre'}
MAX_METERS_PER_SECOND = {'run': 12, 'walk': 12, 'bike': 31}


def meters_between(first, second):
    lat1, lon1 = map(radians, first)
    lat2, lon2 = map(radians, second)
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 12_742_000 * asin(sqrt(min(1, h)))


def serialize_outdoor(session, *, detail=False):
    result = {
        'id': str(session.id),
        'started_at': session.started_at.replace(tzinfo=timezone.utc).isoformat(),
        'completed_at': session.completed_at.replace(tzinfo=timezone.utc).isoformat(),
        'duration_seconds': session.duration_seconds,
        'workout_name': ACTIVITIES[session.activity_type],
        'outdoor_type': session.activity_type,
        'distance_meters': session.distance_meters,
        'calories': session.calories,
    }
    if detail:
        result['route'] = session.route
    return result


def parse_activity(data):
    if not isinstance(data, dict):
        raise ValueError
    activity = data.get('activity_type')
    duration = data.get('duration_seconds')
    route = data.get('route')
    if not isinstance(activity, str) or activity not in ACTIVITIES or type(duration) is not int or not 1 <= duration <= 86400:
        raise ValueError
    if not isinstance(route, list) or len(route) > 35000:
        raise ValueError

    def parse_utc(value):
        timestamp = datetime.fromisoformat(value)
        if timestamp.tzinfo is None:
            raise ValueError
        return timestamp.astimezone(timezone.utc).replace(tzinfo=None)

    start = parse_utc(data['started_at'])
    end = parse_utc(data['completed_at'])
    if (end - start).total_seconds() < duration or end > datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=5):
        raise ValueError

    distance = 0
    point_count = 0
    for segment in route:
        if not isinstance(segment, list) or not segment:
            raise ValueError
        point_count += len(segment)
        if point_count > 35000:
            raise ValueError
        for point in segment:
            if not isinstance(point, list) or len(point) != 2 or any(
                type(coordinate) not in (int, float) or not -limit <= coordinate <= limit
                for coordinate, limit in zip(point, (90, 180))
            ):
                raise ValueError
        distance += sum(meters_between(a, b) for a, b in zip(segment, segment[1:]))
    # The cycling recorder checks each fix in milliseconds and submits whole active seconds.
    speed_window = duration + 1 if activity == 'bike' else duration
    if distance > speed_window * MAX_METERS_PER_SECOND[activity]:
        raise ValueError

    return activity, duration, start, end, route, round(distance, 1)


def estimated_calories(activity, duration, distance, weight):
    if not weight or not isfinite(weight) or weight <= 0 or not distance:
        return None
    if activity == 'bike':
        # Adult Compendium, 2024. Use average speed as an effort proxy and subtract resting MET.
        mph = distance / duration * 3600 / 1609.344
        met = next((met for upper, met in ((10, 4), (12, 6.8), (14, 8), (16, 10)) if mph < upper), 12)
        return int((met - 1) * weight * duration / 3600 + 0.5)
    # ACSM horizontal energy cost above rest (kcal per kg per km).
    return round(weight * distance / 1000 * (1 if activity == 'run' else 0.5))


@outdoor_bp.put('/<uuid:activity_id>')
@jwt_required()
def save_outdoor(activity_id):
    user_id = UUID(get_jwt_identity())
    if request.content_length and request.content_length > 2_000_000:
        return jsonify(message='O trajeto excede o tamanho permitido.'), 413
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(message='Os dados da atividade são inválidos.'), 400
    if data.get('owner_id') != str(user_id):
        return jsonify(message='A atividade pertence a outra conta.'), 403

    existing = db.session.get(OutdoorSession, (user_id, activity_id))
    if existing:
        return jsonify(serialize_outdoor(existing, detail=True))

    try:
        activity, duration, start, end, route, distance = parse_activity(data)
    except (KeyError, TypeError, ValueError, OverflowError):
        return jsonify(message='Os dados da atividade são inválidos.'), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(message='Conta não encontrada.'), 404
    weight = user.profile.current_weight_kg if user.profile else None
    calories = estimated_calories(activity, duration, distance, weight)
    session = OutdoorSession(
        id=activity_id, user_id=user_id, activity_type=activity,
        started_at=start, completed_at=end, duration_seconds=duration,
        distance_meters=distance, calories=calories, route=route,
    )
    db.session.add(session)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        session = db.session.get(OutdoorSession, (user_id, activity_id))
        if session is None:
            raise
    return jsonify(serialize_outdoor(session, detail=True))


@outdoor_bp.get('/<uuid:activity_id>')
@jwt_required()
def get_outdoor(activity_id):
    session = db.session.get(OutdoorSession, (UUID(get_jwt_identity()), activity_id))
    if session is None:
        return jsonify(message='Atividade não encontrada.'), 404
    return jsonify(serialize_outdoor(session, detail=True))


@outdoor_bp.delete('/<uuid:activity_id>')
@jwt_required()
def delete_outdoor(activity_id):
    session = db.session.get(OutdoorSession, (UUID(get_jwt_identity()), activity_id))
    if session is None:
        return jsonify(message='Atividade não encontrada.'), 404
    db.session.delete(session)
    db.session.commit()
    return '', 204


@outdoor_bp.get('')
@jwt_required()
def list_outdoor():
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=91)
    sessions = OutdoorSession.query.filter(
        OutdoorSession.user_id == UUID(get_jwt_identity()),
        OutdoorSession.started_at >= cutoff,
    ).options(defer(OutdoorSession.route)).order_by(OutdoorSession.started_at.desc()).all()
    return jsonify([serialize_outdoor(session) for session in sessions])
