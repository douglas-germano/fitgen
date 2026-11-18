"""Imports never publish health data to the community or send it to AI."""
from datetime import datetime, timezone, timedelta
import math
import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from app.shared.extensions import db
from app.shared.utils.timezone import BRT_TZ
from app.modules.analytics.domain.health_import import HealthImport
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.identity.domain.models import UserProfile

health_bp = Blueprint('health', __name__)


def date_value(value):
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is None or dt > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError('Data inválida')
    return dt


def number(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Valor inválido')
    return value


def validate(item):
    if not isinstance(item, dict):
        raise ValueError('Registro inválido')
    result = {'sample_id': str(uuid.UUID(item['sample_id'])), 'kind': item['kind'],
              'source': str(item.get('source', 'Apple Saúde'))[:160]}
    start = date_value(item['started_at'])
    result['started_at'] = start.astimezone(timezone.utc).isoformat()
    if result['kind'] == 'weight':
        result['weight_kg'] = number(item['weight_kg'], 1, 1000)
    elif result['kind'] == 'workout':
        end = date_value(item['ended_at'])
        if end <= start:
            raise ValueError('Duração inválida')
        result.update(ended_at=end.astimezone(timezone.utc).isoformat(),
                      duration_seconds=number(item['duration_seconds'], 1, (end - start).total_seconds() + 1),
                      workout_name=str(item.get('workout_name', 'Treino'))[:160],
                      calories=number(item.get('calories', 0), 0, 100000))
    else:
        raise ValueError('Tipo inválido')
    return result


@health_bp.post('/sync')
@jwt_required()
def sync():
    user_id = get_jwt_identity()
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or body.get('user_id') != user_id:
        return jsonify(msg='A conta mudou. Entre novamente antes de sincronizar.'), 403
    try:
        if not isinstance(body, dict) or not isinstance(body.get('samples'), list) or len(body['samples']) > 100:
            raise ValueError('Envie até 100 registros por vez')
        samples = [validate(item) for item in body['samples']]
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        return jsonify(msg='Registros do Saúde inválidos. Revise os dados e tente novamente.'), 400

    user_id = uuid.UUID(user_id)
    profile = UserProfile.query.filter_by(user_id=user_id).with_for_update().first()
    imported = 0
    for item in samples:
        if HealthImport.query.filter_by(user_id=user_id, kind=item['kind'], sample_id=item['sample_id']).first():
            continue
        try:
            # The unique constraint also protects concurrent retries/devices.
            with db.session.begin_nested():
                entry = HealthImport(user_id=user_id, kind=item['kind'], sample_id=item['sample_id'], payload=item)
                if item['kind'] == 'weight':
                    metric = BodyMetric(user_id=user_id, weight_kg=item['weight_kg'],
                        recorded_at=date_value(item['started_at']).astimezone(BRT_TZ).replace(tzinfo=None),
                        notes='Importado do Apple Saúde · ' + item['source'])
                    db.session.add(metric)
                    db.session.flush()
                    entry.metric_id = metric.id
                db.session.add(entry)
                db.session.flush()
            imported += 1
        except IntegrityError:
            # A parallel request already stored this sample; nothing is duplicated.
            if not HealthImport.query.filter_by(user_id=user_id, kind=item['kind'], sample_id=item['sample_id']).first():
                raise
    # Backfills must never replace a newer manual measurement with an old weight.
    latest = BodyMetric.query.filter(BodyMetric.user_id == user_id, BodyMetric.weight_kg > 0).order_by(BodyMetric.recorded_at.desc()).first()
    if latest and profile:
        profile.current_weight_kg = latest.weight_kg
    db.session.commit()
    return jsonify(imported=imported, skipped=len(samples) - imported)


@health_bp.get('/workouts')
@jwt_required()
def workouts():
    rows = HealthImport.query.filter_by(user_id=uuid.UUID(get_jwt_identity()), kind='workout').all()
    result = [dict(id='health:' + row.sample_id, started_at=row.payload['started_at'],
                   completed_at=row.payload['ended_at'], duration_seconds=row.payload['duration_seconds'],
                   workout_name=row.payload['workout_name'], calories=row.payload['calories'],
                   source=row.payload['source'], from_health=True) for row in rows]
    return jsonify(sorted(result, key=lambda row: row['started_at'], reverse=True)[:1000])
