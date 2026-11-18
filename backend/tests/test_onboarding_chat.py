"""Conversation validation and atomic-save contracts; no real accounts or providers."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from sqlalchemy.exc import SQLAlchemyError
from app.modules.identity.application.onboarding import validate_answers, CHOICES, MULTI
from app.modules.identity.interface.routes import onboarding as routes
from app.modules.nutrition.domain import diet


def answers():
    return {**{k: v[0] for k, v in CHOICES.items()},
            **{k: choices[:minimum] for k, (minimum, maximum, choices) in MULTI.items()},
            'name': ' Pessoa Teste ', 'birth_date': '18/11/1995', 'height': '175',
            'weight': '72,5', 'target_weight': '70', 'calories': '', 'training_time': '18:30'}


class OnboardingTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['JWT_SECRET_KEY'] = 'isolated-test-jwt-secret-key-32-chars'
        JWTManager(self.app)
        self.app.register_blueprint(routes.onboarding_bp, url_prefix='/onboarding')
        self.client = self.app.test_client()
        self.user_id = uuid4()
        with self.app.app_context():
            self.headers = {'Authorization': 'Bearer ' + create_access_token(identity=str(self.user_id))}

    def test_maps_all_profile_and_nutrition_fields_without_inventing_answers(self):
        data = answers()
        data.update(diet_style='vegan', excluded_foods=['nuts'], liked_foods='Banana', supplements=['creatine'])
        saved, profile, nutrition = validate_answers(data, date(2026, 11, 17))
        self.assertEqual(profile['age'], 30)
        self.assertEqual(profile['current_weight_kg'], 72.5)
        self.assertEqual(saved['name'], 'Pessoa Teste')
        self.assertEqual(nutrition['meals_per_day'], 2)
        self.assertEqual(nutrition['cooks_at_home'], 'sim_todas')
        self.assertEqual(nutrition['restrictions'], ['vegano', 'Sem castanhas e amendoim'])
        self.assertIsNone(nutrition['calorie_goal'])
        self.assertEqual(saved['liked_foods'], 'Banana')
        self.assertEqual(saved['supplements'], ['creatine'])

    def test_rejects_malformed_and_out_of_range_answers(self):
        for value in [None, [], {}, {'name': True}]:
            with self.assertRaises(ValueError): validate_answers(value)
        for key, value in [('height', 'nan'), ('weight', True), ('weight', '-20'), ('weight', '72x'), ('birth_date', '31/02/2000'), ('days', []), ('days',['monday','monday']), ('muscles', ['legs'] * 4), ('training_time', '24:00'), ('calories', '0'), ('allergies', ['nuts']), ('goal','invalid'), ('name',' '), ('meals', ['breakfast'])]:
            data = answers(); data[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): validate_answers(data)

    def test_requires_auth_and_validates_before_database_access(self):
        self.assertEqual(self.client.post('/onboarding/complete', json={}).status_code, 401)
        with patch.object(routes, 'db') as db:
            self.assertEqual(self.client.post('/onboarding/complete', headers=self.headers, json={'answers': {}}).status_code, 400)
            db.session.commit.assert_not_called()

    def test_completes_atomically_and_does_not_duplicate_baseline_on_retry(self):
        user_model, profile_model, pref_model, metric_model = [MagicMock() for _ in range(4)]
        user, profile, pref = SimpleNamespace(), SimpleNamespace(), SimpleNamespace()
        user_model.query.filter_by.return_value.with_for_update.return_value.first.return_value = user
        profile_model.query.filter_by.return_value.first.return_value = profile
        pref_model.query.filter_by.return_value.first.return_value = pref
        metric_model.query.filter_by.return_value.first.return_value = object()
        with patch.object(routes, 'User', user_model), patch.object(routes, 'UserProfile', profile_model), patch.object(diet, 'DietPreference', pref_model), patch.object(routes, 'BodyMetric', metric_model), patch.object(routes, 'db') as db:
            for _ in range(2):
                response = self.client.post('/onboarding/complete', headers=self.headers, json={'answers': answers()})
                self.assertEqual(response.status_code, 200)
            self.assertEqual(db.session.commit.call_count, 2)
            metric_model.assert_not_called()
            self.assertTrue(user.onboarding_completed)
            self.assertTrue(profile.onboarding_completed)
            self.assertEqual(pref.meals_per_day, 2)
            self.assertEqual(profile.onboarding_answers['training_time'], '18:30')
            db.session.commit.side_effect = SQLAlchemyError('test failure')
            self.assertEqual(self.client.post('/onboarding/complete', headers=self.headers, json={'answers': answers()}).status_code, 503)
            db.session.rollback.assert_called_once()


if __name__ == '__main__': unittest.main()
