"""Body metric history/edit/delete and private progress photos against an isolated database (storage mocked)."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-metrics-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-metrics-jwt-secret-32chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import io
import unittest
from datetime import datetime
from unittest.mock import patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.shared.extensions import db
from app.shared import model_registry  # noqa: F401
from app.modules.identity.domain.models import User, UserProfile
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.analytics.domain.progress_photo import ProgressPhoto
from app.modules.analytics.interface.routes_metrics import metrics_bp
from app.modules.analytics.interface import routes_progress
from app.modules.analytics.interface.routes_progress import progress_bp

JPEG = b'\xff\xd8\xff\xe0' + b'\0' * 32


class MetricsProgressTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', JWT_SECRET_KEY='isolated-metrics-jwt-secret-32chars', TESTING=True)
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(metrics_bp, url_prefix='/api/metrics')
        self.app.register_blueprint(progress_bp, url_prefix='/api/progress')
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[n] for n in ['users', 'user_profiles', 'body_metrics', 'progress_photos']])
        self.users = [User(name='Teste', email=f'{i}@test.invalid', password_hash='unused') for i in range(2)]
        db.session.add_all(self.users); db.session.flush()
        for user in self.users:
            db.session.add(UserProfile(user_id=user.id, current_weight_kg=80))
        db.session.commit()
        self.headers = [{'Authorization': 'Bearer ' + create_access_token(identity=str(u.id))} for u in self.users]
        self.client = self.app.test_client()

    def add_metric(self, day, weight, waist=None, user=0):
        m = BodyMetric(user_id=self.users[user].id, weight_kg=weight, waist_cm=waist, recorded_at=datetime(2026, 10, day))
        db.session.add(m); db.session.commit()
        return m

    def current_weight(self, user=0):
        db.session.expire_all()
        return UserProfile.query.filter_by(user_id=self.users[user].id).first().current_weight_kg

    def test_history_waist_and_ids(self):
        a = self.add_metric(1, 80, waist=90)
        self.add_metric(2, 79)
        b = self.add_metric(3, 78, waist=88.5)
        waist = self.client.get('/api/metrics/history?type=waist', headers=self.headers[0]).json
        self.assertEqual(waist, [{'id': str(a.id), 'date': '2026-10-01T00:00:00', 'value': 90},
                                 {'id': str(b.id), 'date': '2026-10-03T00:00:00', 'value': 88.5}])
        weight = self.client.get('/api/metrics/history', headers=self.headers[0]).json
        self.assertEqual(len(weight), 3)
        self.assertTrue(all('id' in p for p in weight))

    def test_entries_newest_first(self):
        self.add_metric(1, 80, waist=90)
        self.add_metric(5, 78)
        res = self.client.get('/api/metrics/entries?limit=1', headers=self.headers[0]).json
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]['weight_kg'], 78)
        self.assertEqual(set(res[0]), {'id', 'recorded_at', 'weight_kg', 'body_fat_percentage', 'muscle_mass_kg', 'waist_cm', 'notes'})
        self.assertEqual(len(self.client.get('/api/metrics/entries', headers=self.headers[0]).json), 2)

    def test_update_and_syncs_profile_weight_only_for_latest(self):
        old, new = self.add_metric(1, 80), self.add_metric(2, 79)
        res = self.client.put(f'/api/metrics/{old.id}', headers=self.headers[0], json={'weight_kg': 81, 'waist_cm': 85, 'notes': 'x'})
        self.assertEqual(res.status_code, 200, res.json)
        self.assertEqual((res.json['weight_kg'], res.json['waist_cm'], res.json['notes']), (81, 85, 'x'))
        self.assertEqual(self.current_weight(), 80)
        self.assertEqual(self.client.put(f'/api/metrics/{new.id}', headers=self.headers[0], json={'weight_kg': 77.5}).status_code, 200)
        self.assertEqual(self.current_weight(), 77.5)

    def test_update_validation_and_ownership(self):
        m = self.add_metric(1, 80)
        self.assertEqual(self.client.put(f'/api/metrics/{m.id}', headers=self.headers[0], json={'weight_kg': -3}).status_code, 400)
        self.assertEqual(self.client.put(f'/api/metrics/{m.id}', headers=self.headers[0], json={'waist_cm': 'abc'}).status_code, 400)
        self.assertEqual(self.client.put(f'/api/metrics/{m.id}', headers=self.headers[1], json={'weight_kg': 70}).status_code, 404)
        self.assertEqual(self.client.put('/api/metrics/not-a-uuid', headers=self.headers[0], json={'weight_kg': 70}).status_code, 404)
        self.assertEqual(self.client.put(f'/api/metrics/{uuid4()}', headers=self.headers[0], json={'weight_kg': 70}).status_code, 404)

    def test_delete_latest_restores_previous_weight(self):
        old, new = self.add_metric(1, 82), self.add_metric(2, 79)
        self.assertEqual(self.client.delete(f'/api/metrics/{new.id}', headers=self.headers[1]).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/metrics/{new.id}', headers=self.headers[0]).status_code, 204)
        self.assertEqual(self.current_weight(), 82)
        self.assertEqual(self.client.delete(f'/api/metrics/{old.id}', headers=self.headers[0]).status_code, 204)
        self.assertEqual(self.current_weight(), 82)  # none left: unchanged
        self.assertEqual(BodyMetric.query.count(), 0)

    def upload(self, user=0, **fields):
        data = {'image': (io.BytesIO(fields.pop('data', JPEG)), 'IMG.HEIC'), 'pose': 'front'}
        data.update(fields)
        return self.client.post('/api/progress/photos', headers=self.headers[user], data=data, content_type='multipart/form-data')

    def test_photo_upload_list_delete(self):
        with patch.object(routes_progress.storage, 'save', return_value='r2:progress-photos/x.jpg') as save, \
             patch.object(routes_progress.storage, 'image_payload', return_value={'url': 'https://signed.example/x'}), \
             patch.object(routes_progress.storage, 'remove') as remove:
            res = self.upload(pose='side', taken_at='2026-10-02')
            self.assertEqual(res.status_code, 201, res.json)
            self.assertEqual((res.json['pose'], res.json['url'], res.json['taken_at']), ('side', 'https://signed.example/x', '2026-10-02T00:00:00'))
            self.assertEqual(save.call_args[0][0], 'progress-photos')
            self.upload(pose='back', taken_at='2026-10-05')
            listed = self.client.get('/api/progress/photos', headers=self.headers[0]).json
            self.assertEqual([p['pose'] for p in listed], ['back', 'side'])
            self.assertEqual(self.client.get('/api/progress/photos', headers=self.headers[1]).json, [])
            pid = listed[0]['id']
            self.assertEqual(self.client.delete(f'/api/progress/photos/{pid}', headers=self.headers[1]).status_code, 404)
            remove.assert_not_called()
            self.assertEqual(self.client.delete(f'/api/progress/photos/{pid}', headers=self.headers[0]).status_code, 204)
            remove.assert_called_once_with('progress-photos', 'r2:progress-photos/x.jpg')
            self.assertEqual(ProgressPhoto.query.count(), 1)

    def test_photo_validation(self):
        with patch.object(routes_progress.storage, 'save') as save:
            self.assertEqual(self.upload(pose='top').status_code, 400)
            self.assertEqual(self.upload(data=b'not an image').status_code, 400)
            self.assertEqual(self.upload(taken_at='garbage').status_code, 400)
            self.assertEqual(self.upload(data=JPEG + b'\0' * routes_progress.MAX_PHOTO_BYTES).status_code, 400)
            save.assert_not_called()
        self.assertEqual(ProgressPhoto.query.count(), 0)


if __name__ == '__main__':
    unittest.main()
