"""Exercise the outdoor API with an isolated database and two fake accounts."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import unittest

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from sqlalchemy import insert

from app.modules.identity.domain.models import User, UserProfile
from app.modules.training.domain.models import OutdoorSession
from app.modules.training.interface.routes_outdoor import outdoor_bp
from app.shared.extensions import db
from app.shared import model_registry  # noqa: F401 - registers user relationships


class OutdoorTrainingTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite://',
            JWT_SECRET_KEY='isolated-test-jwt-secret-key-32-chars',
        )
        db.init_app(app)
        JWTManager(app)
        app.register_blueprint(outdoor_bp, url_prefix='/outdoor')
        self.context = app.app_context()
        self.context.push()
        self.addCleanup(self.context.pop)
        tables = [User.__table__, UserProfile.__table__, OutdoorSession.__table__]
        db.metadata.create_all(db.engine, tables=tables)
        self.addCleanup(db.metadata.drop_all, db.engine, tables=tables)
        self.owner, self.other = uuid4(), uuid4()
        for user_id in (self.owner, self.other):
            db.session.execute(insert(User).values(
                id=user_id, email=f'{user_id}@example.test', name='Atleta', password_hash='unused',
            ))
        db.session.execute(insert(UserProfile).values(user_id=self.owner, current_weight_kg=75))
        db.session.commit()
        self.client = app.test_client()
        self.activity_url = f'/outdoor/{uuid4()}'
        end = datetime.now(timezone.utc)
        self.payload = {
            'owner_id': str(self.owner),
            'activity_type': 'run',
            'started_at': (end - timedelta(seconds=420)).isoformat(),
            'completed_at': end.isoformat(),
            'duration_seconds': 300,
            'route': [[[0, 0], [0, 0.01]], [[0.02, 0.03], [0.02, 0.031]]],
        }

    def headers(self, user_id):
        return {'Authorization': 'Bearer ' + create_access_token(identity=str(user_id))}

    def test_save_retry_and_private_history(self):
        owner = self.headers(self.owner)
        other = self.headers(self.other)
        self.assertEqual(self.client.put(self.activity_url, json=self.payload).status_code, 401)
        first = self.client.put(self.activity_url, json=self.payload, headers=owner)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json['route'], self.payload['route'])
        self.assertEqual(first.json['duration_seconds'], 300)
        # The distance between paused segments is excluded.
        self.assertAlmostEqual(first.json['distance_meters'], 1223.1, places=1)
        self.assertEqual(first.json['calories'], 92)
        second = self.client.put(self.activity_url, json=self.payload, headers=owner)
        self.assertEqual(second.json, first.json)
        self.assertEqual(self.client.get(self.activity_url, headers=owner).json, first.json)

        history = self.client.get('/outdoor', headers=owner).json
        self.assertEqual(len(history), 1)
        self.assertNotIn('route', history[0])
        self.assertEqual(self.client.get('/outdoor', headers=other).json, [])
        self.assertEqual(self.client.get(self.activity_url, headers=other).status_code, 404)
        self.assertEqual(self.client.put(self.activity_url, json=self.payload, headers=other).status_code, 403)

    def test_reject_invalid_points_and_active_duration(self):
        owner = self.headers(self.owner)
        for fields in ({'route': [[[91, 0]]]}, {'duration_seconds': 421}, {'activity_type': 'bike'}):
            with self.subTest(fields=fields):
                response = self.client.put(self.activity_url, json={**self.payload, **fields}, headers=owner)
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get('/outdoor', headers=owner).json, [])


if __name__ == '__main__':
    unittest.main()
