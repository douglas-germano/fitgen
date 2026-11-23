"""Sign in with Google / Apple: token verification and account find-or-create."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-social-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-social-jwt-secret-32-characters')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import time
import unittest
from types import SimpleNamespace
from unittest import mock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from flask import Flask
from flask_jwt_extended import JWTManager, decode_token

from app.shared.extensions import db, limiter
from app.shared import model_registry  # noqa: F401
from app.modules.identity.application import social_auth
from app.modules.identity.domain.models import User
from app.modules.identity.interface.routes.auth import auth_bp

GOOGLE_WEB = 'web-client.apps.googleusercontent.com'
BUNDLE = 'com.douglas.fitgen'
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_token(provider, key=KEY, **overrides):
    now = int(time.time())
    claims = {
        'iss': 'https://accounts.google.com' if provider == 'google' else 'https://appleid.apple.com',
        'aud': GOOGLE_WEB if provider == 'google' else BUNDLE,
        'sub': f'{provider}-sub-1',
        'email': 'ana@test.invalid',
        'email_verified': True if provider == 'google' else 'true',
        'iat': now,
        'exp': now + 600,
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm='RS256')


class SocialAuthTests(unittest.TestCase):
    def setUp(self):
        env = mock.patch.dict(os.environ, {'GOOGLE_CLIENT_IDS': f'ios-client,{GOOGLE_WEB}'}, clear=False)
        env.start(); self.addCleanup(env.stop)
        signing_key = SimpleNamespace(key=KEY.public_key())
        for provider in ('google', 'apple'):
            patcher = mock.patch.object(social_auth._jwk_clients[provider], 'get_signing_key_from_jwt',
                                        return_value=signing_key)
            patcher.start(); self.addCleanup(patcher.stop)

        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', TESTING=True, RATELIMIT_ENABLED=False,
                               JWT_SECRET_KEY=os.environ['JWT_SECRET_KEY'])
        db.init_app(self.app)
        limiter.init_app(self.app)
        self.app.limiter = limiter  # the password login route reads current_app.limiter
        JWTManager(self.app)
        self.app.register_blueprint(auth_bp, url_prefix='/api/auth')
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[n] for n in ['users', 'user_profiles', "referral_codes", "referrals", "referral_rewards", "partner_commissions"]])
        self.client = self.app.test_client()

    def social(self, provider, token, **extra):
        return self.client.post('/api/auth/social', json={'provider': provider, 'id_token': token, **extra})

    def test_google_creates_passwordless_user(self):
        res = self.social('google', make_token('google', name='Ana Souza'))
        self.assertEqual(res.status_code, 200, res.json)
        self.assertTrue(res.json['created'])
        user = User.query.one()
        self.assertEqual((user.google_sub, user.name, user.password_hash, user.subscription_status),
                         ('google-sub-1', 'Ana Souza', None, 'free'))
        self.assertEqual(decode_token(res.json['access_token'])['sub'], str(user.id))

    def test_second_login_reuses_account_by_sub_even_if_email_changes(self):
        self.social('google', make_token('google'))
        res = self.social('google', make_token('google', email='new@test.invalid'))
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json['created'])
        self.assertEqual(User.query.count(), 1)

    def test_apple_links_existing_email_account_and_keeps_password(self):
        db.session.add(User(name='Ana', email='ana@test.invalid', password_hash='hash'))
        db.session.commit()
        res = self.social('apple', make_token('apple'))
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json['created'])
        user = User.query.one()
        self.assertEqual((user.apple_sub, user.password_hash), ('apple-sub-1', 'hash'))

    def test_apple_uses_name_forwarded_by_app_on_first_sign_in(self):
        res = self.social('apple', make_token('apple', email='x@privaterelay.appleid.com'), name='Bia')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.query.one().name, 'Bia')

    def test_unverified_email_does_not_take_over_existing_account(self):
        db.session.add(User(name='Ana', email='ana@test.invalid', password_hash='hash'))
        db.session.commit()
        res = self.social('google', make_token('google', email_verified=False))
        self.assertEqual(res.status_code, 409)
        self.assertIsNone(User.query.one().google_sub)

    def test_rejects_wrong_audience_issuer_expiry_and_signature(self):
        bad = [
            make_token('google', aud='someone-elses-app'),
            make_token('google', iss='https://evil.example'),
            make_token('google', exp=int(time.time()) - 10),
            make_token('google', key=OTHER_KEY),
            make_token('apple', aud='com.other.app'),
        ]
        for token in bad:
            provider = 'apple' if jwt.decode(token, options={'verify_signature': False})['iss'].endswith('apple.com') else 'google'
            self.assertEqual(self.social(provider, token).status_code, 401)
        self.assertEqual(User.query.count(), 0)

    def test_suspended_account_is_blocked(self):
        db.session.add(User(name='Ana', email='ana@test.invalid', password_hash=None,
                            google_sub='google-sub-1', subscription_status='suspended'))
        db.session.commit()
        self.assertEqual(self.social('google', make_token('google')).status_code, 403)

    def test_password_login_fails_cleanly_for_passwordless_account(self):
        self.social('google', make_token('google'))
        res = self.client.post('/api/auth/login', json={'email': 'ana@test.invalid', 'password': 'Whatever1!'})
        self.assertEqual(res.status_code, 401)

    def test_passwordless_user_can_set_a_password(self):
        token = self.social('google', make_token('google')).json['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        # SQLite can't bind a str UUID in query.get (Postgres can); hand the routes a real UUID.
        user_id = User.query.one().id
        patcher = mock.patch('app.modules.identity.interface.routes.auth.get_jwt_identity', return_value=user_id)
        patcher.start(); self.addCleanup(patcher.stop)
        self.assertFalse(self.client.get('/api/auth/me', headers=headers).json['has_password'])
        res = self.client.post('/api/auth/change-password', headers=headers, json={'new_password': 'NovaSenha#2026'})
        self.assertEqual(res.status_code, 200, res.json)
        self.assertTrue(self.client.get('/api/auth/me', headers=headers).json['has_password'])


if __name__ == '__main__':
    unittest.main()
