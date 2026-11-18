"""Health import contracts against an isolated database, never live samples."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-health-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-health-jwt-secret-32chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import datetime
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.shared.extensions import db
from app.shared import model_registry
from app.modules.identity.domain.models import User, UserProfile
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.analytics.domain.health_import import HealthImport
from app.modules.analytics.interface.routes_health import health_bp


class HealthSyncTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', JWT_SECRET_KEY='isolated-health-jwt-secret-32chars', TESTING=True)
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(health_bp, url_prefix='/health')
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[n] for n in ['users', 'user_profiles', 'body_metrics', 'health_imports']])
        self.users = [User(name='Teste', email=f'{i}@test.invalid', password_hash='unused') for i in range(2)]
        db.session.add_all(self.users); db.session.flush()
        for user in self.users:
            db.session.add(UserProfile(user_id=user.id, current_weight_kg=80))
        db.session.commit()
        self.headers = [{'Authorization': 'Bearer ' + create_access_token(identity=str(u.id))} for u in self.users]
        self.client = self.app.test_client()

    def sample(self, kind='weight', **changes):
        item = dict(sample_id=str(uuid4()), kind=kind, source='Balança', started_at='2026-10-01T12:00:00Z', weight_kg=79.4)
        if kind == 'workout':
            item.update(source='Apple Watch', ended_at='2026-10-01T12:30:00Z', duration_seconds=1700, workout_name='Corrida', calories=240)
        return dict(item, **changes)

    def sync(self, samples, user=0, **overrides):
        return self.client.post('/health/sync', headers=self.headers[user], json=dict(user_id=str(self.users[user].id), samples=samples, **overrides))

    def test_retry_deduplicates_preserves_dates_and_measured_values(self):
        weight, workout = self.sample(), self.sample('workout')
        self.assertEqual(self.sync([weight, workout]).json['imported'], 2)
        self.assertEqual(self.sync([weight, workout]).json, dict(imported=0, skipped=2))
        self.assertEqual(HealthImport.query.count(), 2)
        self.assertEqual(BodyMetric.query.count(), 1)
        metric = BodyMetric.query.first()
        self.assertEqual(metric.recorded_at, datetime(2026, 10, 1, 9))  # legacy DB timezone
        self.assertEqual(metric.weight_kg, 79.4)
        self.assertIsNone(metric.body_fat_percentage)
        self.assertIsNone(metric.muscle_mass_kg)
        result = self.client.get('/health/workouts', headers=self.headers[0]).json
        self.assertEqual(result[0]['started_at'], '2026-10-01T12:00:00+00:00')
        self.assertEqual(result[0]['duration_seconds'], 1700)
        self.assertEqual(result[0]['source'], 'Apple Watch')

    def test_account_isolation_and_account_switch(self):
        sample = self.sample('workout')
        self.sync([sample])
        self.assertEqual(self.client.get('/health/workouts', headers=self.headers[1]).json, [])
        self.assertEqual(self.client.post('/health/sync', headers=self.headers[1], json={'user_id': str(self.users[0].id), 'samples': [sample]}).status_code, 403)
        self.assertEqual(self.sync([sample], user=1).json['imported'], 1)
        self.assertEqual(self.client.get('/health/workouts').status_code, 401)

    def test_backfill_does_not_replace_a_newer_manual_weight(self):
        db.session.add(BodyMetric(user_id=self.users[0].id, weight_kg=76, recorded_at=datetime(2026, 10, 2)))
        db.session.commit()
        self.sync([self.sample()])
        self.assertEqual(UserProfile.query.filter_by(user_id=self.users[0].id).first().current_weight_kg, 76)

    def test_batch_is_validated_before_any_write(self):
        bad = [self.sample(weight_kg=-1), self.sample(weight_kg=True), self.sample(started_at='not-a-date'), self.sample('workout', duration_seconds=999999)]
        for sample in bad:
            self.assertEqual(self.sync([self.sample(), sample]).status_code, 400)
        self.assertEqual(HealthImport.query.count(), 0)
        self.assertEqual(BodyMetric.query.count(), 0)
        self.assertEqual(self.sync([self.sample()] * 101).status_code, 400)
        self.assertEqual(self.sync([]).json['imported'], 0)


if __name__ == '__main__':
    unittest.main()
