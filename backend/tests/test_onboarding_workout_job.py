"""Onboarding workout generation runs outside the request (Sentry FITGEN-BACKEND-7).

Before: the route waited for the AI inside the request; a slow answer passed gunicorn's
120 s timeout and the worker was killed (SystemExit). Now the request waits a bounded
time and answers 202 while the job finishes in the background.
"""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import threading
import time
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.modules.identity.interface.routes import onboarding as routes


class OnboardingWorkoutJobTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['JWT_SECRET_KEY'] = 'isolated-test-jwt-secret-key-32-chars'
        JWTManager(self.app)
        self.app.register_blueprint(routes.onboarding_bp, url_prefix='/onboarding')
        self.client = self.app.test_client()
        self.user_id = uuid4()
        self.profile = SimpleNamespace(onboarding_completed=False)
        self.user = SimpleNamespace(id=self.user_id, profile=self.profile, onboarding_completed=False)
        with self.app.app_context():
            self.headers = {'Authorization': 'Bearer ' + create_access_token(identity=str(self.user_id))}
        routes._workout_jobs.clear()
        self.release = threading.Event()
        self.patches = [
            patch.object(routes, 'User', MagicMock(query=MagicMock(get=MagicMock(return_value=self.user)))),
            patch.object(routes, 'db', MagicMock()),
            patch.object(routes, 'WorkoutGeneratorService'),
        ]
        mocks = [p.start() for p in self.patches]
        self.generator = mocks[2]

    def tearDown(self):
        self.release.set()
        for p in self.patches:
            p.stop()
        routes._workout_jobs.clear()

    def _slow_plan(self, *_):
        self.release.wait(5)
        return SimpleNamespace(id=uuid4(), name='Plano Inicial')

    def _wait_job(self):
        job = routes._workout_jobs[str(self.user_id)]
        self.assertTrue(job['event'].wait(5))
        return job

    def test_slow_ai_answers_202_within_budget_instead_of_holding_the_worker(self):
        self.generator.return_value.generate_workout_plan.side_effect = self._slow_plan
        with patch.dict(os.environ, {'ONBOARDING_WORKOUT_WAIT_SECONDS': '0.2'}):
            started = time.monotonic()
            res = self.client.post('/onboarding/generate-workout', headers=self.headers)
            elapsed = time.monotonic() - started
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.get_json()['status'], 'pending')
        self.assertLess(elapsed, 2)

        status = self.client.get('/onboarding/generate-workout/status', headers=self.headers)
        self.assertEqual(status.get_json()['status'], 'pending')

        self.release.set()
        self._wait_job()
        status = self.client.get('/onboarding/generate-workout/status', headers=self.headers).get_json()
        self.assertEqual(status['status'], 'done')
        self.assertEqual(status['plan_name'], 'Plano Inicial')
        self.assertTrue(self.user.onboarding_completed)
        self.assertTrue(self.profile.onboarding_completed)

    def test_fast_ai_keeps_the_old_200_contract(self):
        plan = SimpleNamespace(id=uuid4(), name='Plano Rápido')
        self.generator.return_value.generate_workout_plan.return_value = plan
        res = self.client.post('/onboarding/generate-workout', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body['plan_id'], str(plan.id))
        self.assertEqual(body['plan_name'], 'Plano Rápido')

    def test_ai_failure_returns_500_and_rolls_back(self):
        self.generator.return_value.generate_workout_plan.side_effect = RuntimeError('boom')
        res = self.client.post('/onboarding/generate-workout', headers=self.headers)
        self.assertEqual(res.status_code, 500)
        self.assertEqual(res.get_json()['status'], 'failed')
        routes.db.session.rollback.assert_called()

    def test_second_tap_joins_the_running_job_instead_of_starting_another(self):
        self.generator.return_value.generate_workout_plan.side_effect = self._slow_plan
        with patch.dict(os.environ, {'ONBOARDING_WORKOUT_WAIT_SECONDS': '0.1'}):
            self.client.post('/onboarding/generate-workout', headers=self.headers)
            self.client.post('/onboarding/generate-workout', headers=self.headers)
        self.release.set()
        self._wait_job()
        self.assertEqual(self.generator.return_value.generate_workout_plan.call_count, 1)

    def test_requires_completed_profile(self):
        self.user.profile = None
        res = self.client.post('/onboarding/generate-workout', headers=self.headers)
        self.assertEqual(res.status_code, 400)
        self.generator.assert_not_called()

    def test_status_is_idle_without_a_job(self):
        res = self.client.get('/onboarding/generate-workout/status', headers=self.headers)
        self.assertEqual(res.get_json(), {'status': 'idle'})


if __name__ == '__main__':
    unittest.main()
