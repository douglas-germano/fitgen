"""Per-user limits on AI routes and releasing the DB connection before the AI call."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from unittest.mock import patch
from uuid import uuid4

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.modules.nutrition.interface import routes_nutrition as routes
from app.shared.extensions import limiter

AI_JSON = '{"name": "Frango", "calories": 330, "protein": 62, "carbs": 0, "fats": 7}'


class AILimitTests(unittest.TestCase):
    def setUp(self):
        os.environ['AI_LIMIT_MEAL_ESTIMATE'] = '2 per hour'
        self.app = Flask(__name__)
        self.app.config.update(JWT_SECRET_KEY='isolated-test-jwt-secret-key-32-chars',
                               RATELIMIT_STORAGE_URI='memory://', RATELIMIT_ENABLED=True)
        JWTManager(self.app)
        limiter.init_app(self.app)
        self.app.register_blueprint(routes.nutrition_bp, url_prefix='/nutrition')
        self.client = self.app.test_client()
        with self.app.app_context():
            self.alice = {'Authorization': 'Bearer ' + create_access_token(identity=str(uuid4()))}
            self.bob = {'Authorization': 'Bearer ' + create_access_token(identity=str(uuid4()))}

    def tearDown(self):
        os.environ.pop('AI_LIMIT_MEAL_ESTIMATE', None)
        limiter.reset()
        # Other test modules use the global limiter without init_app (inactive); keep it that way
        limiter.enabled = False

    def estimate(self, headers):
        return self.client.post('/nutrition/estimate', json={'description': '200g de frango'}, headers=headers)

    def test_limit_counts_per_user_not_per_ip(self):
        with patch.object(routes.AIService, '__init__', return_value=None), \
             patch.object(routes.AIService, 'generate_text', return_value=AI_JSON), \
             patch.object(routes, 'release_db_connection'):
            self.assertEqual([self.estimate(self.alice).status_code for _ in range(3)], [200, 200, 429])
            # Same IP, different user: still allowed
            self.assertEqual(self.estimate(self.bob).status_code, 200)

    def test_releases_db_connection_before_calling_the_ai(self):
        calls = []
        with patch.object(routes.AIService, '__init__', return_value=None), \
             patch.object(routes.AIService, 'generate_text', side_effect=lambda p: calls.append('ai') or AI_JSON), \
             patch.object(routes, 'release_db_connection', side_effect=lambda: calls.append('release')):
            self.assertEqual(self.estimate(self.alice).status_code, 200)
        self.assertEqual(calls, ['release', 'ai'])


if __name__ == '__main__':
    unittest.main()
