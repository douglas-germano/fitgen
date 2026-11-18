"""Subscription gate: the app is only usable with an active subscription or trial."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-gate-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-gate-jwt-secret-32-characters')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import datetime, timedelta
from unittest import mock
from flask import Blueprint, Flask, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from app.shared.extensions import db
from app.shared import model_registry  # noqa: F401
from app.shared.subscription_access import init_subscription_gate, user_has_access
from app.modules.identity.domain.models import User

api = Blueprint('api', __name__, url_prefix='/api')


@api.get('/chat/ping')
@jwt_required()
def ping():
    return jsonify(ok=True)


@api.get('/profile/me')
@jwt_required()
def me():
    return jsonify(ok=True)


@api.put('/profile/me')
@jwt_required()
def me_put():
    return jsonify(ok=True)


@api.post('/auth/login')
def login():
    return jsonify(ok=True)


@api.post('/subscriptions/sync')
@jwt_required()
def sync():
    return jsonify(ok=True)


def days(n):
    return datetime.utcnow() + timedelta(days=n)


class SubscriptionGateTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', JWT_SECRET_KEY='isolated-gate-jwt-secret-32-characters', TESTING=True)
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(api)
        init_subscription_gate(self.app)
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables['users']])
        self.client = self.app.test_client()
        self.counter = 0

    def user(self, status='active', expires=None, role='user'):
        self.counter += 1
        u = User(name='U', email=f'u{self.counter}@test.invalid', password_hash='x', role=role,
                 subscription_status=status, subscription_expires_at=expires)
        db.session.add(u); db.session.commit()
        return {'Authorization': 'Bearer ' + create_access_token(identity=str(u.id))}, u

    def get(self, headers, path='/api/chat/ping'):
        return self.client.get(path, headers=headers).status_code

    def test_free_signup_without_subscription_is_blocked_with_402(self):
        headers, _ = self.user(status='free')
        response = self.client.get('/api/chat/ping', headers=headers)
        self.assertEqual(response.status_code, 402)
        body = response.get_json()
        self.assertEqual((body['code'], body['has_access']), ('subscription_required', False))

    def test_legacy_active_without_expiry_is_blocked(self):
        headers, _ = self.user(status='active', expires=None)
        self.assertEqual(self.get(headers), 402)

    def test_active_trial_or_paid_period_has_access(self):
        self.assertEqual(self.get(self.user(expires=days(7))[0]), 200)    # 7-day trial
        self.assertEqual(self.get(self.user(expires=days(30))[0]), 200)   # paid month

    def test_expired_period_is_blocked(self):
        self.assertEqual(self.get(self.user(expires=days(-1))[0]), 402)

    def test_canceled_and_past_due_keep_access_until_the_period_ends(self):
        self.assertEqual(self.get(self.user(status='canceled', expires=days(5))[0]), 200)
        self.assertEqual(self.get(self.user(status='past_due', expires=days(2))[0]), 200)
        self.assertEqual(self.get(self.user(status='canceled', expires=days(-1))[0]), 402)

    def test_suspended_is_blocked_even_with_time_left(self):
        self.assertEqual(self.get(self.user(status='suspended', expires=days(10))[0]), 402)

    def test_admin_is_never_blocked(self):
        self.assertEqual(self.get(self.user(status='free', role='admin')[0]), 200)

    def test_unsubscribed_user_can_still_reach_the_endpoints_needed_to_subscribe(self):
        headers, _ = self.user(status='free')
        self.assertEqual(self.get(headers, '/api/profile/me'), 200)        # app reads has_access here
        self.assertEqual(self.client.put('/api/profile/me', headers=headers).status_code, 402)
        self.assertEqual(self.client.post('/api/subscriptions/sync', headers=headers).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/login').status_code, 200)

    def test_missing_or_invalid_token_falls_through_to_the_route_401(self):
        self.assertEqual(self.client.get('/api/chat/ping').status_code, 401)
        self.assertEqual(self.client.get('/api/chat/ping', headers={'Authorization': 'Bearer junk'}).status_code, 422)

    def test_gate_can_be_switched_off(self):
        headers, user = self.user(status='free')
        with mock.patch.dict(os.environ, {'SUBSCRIPTION_REQUIRED': 'false'}):
            self.assertEqual(self.get(headers), 200)
            self.assertTrue(user_has_access(user))


if __name__ == '__main__':
    unittest.main()
