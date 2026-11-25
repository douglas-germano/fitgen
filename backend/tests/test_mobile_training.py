"""Route contract tests with isolated fixtures; no database or real accounts."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.modules.training.interface import routes_workouts as workouts
from app.modules.training.interface import routes_exercises as sessions
from app.modules.identity.domain import models as identity
from app.modules.gamification.application.service import GamificationService


class MobileTrainingTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['JWT_SECRET_KEY'] = 'isolated-test-jwt-secret-key-32-chars'
        JWTManager(self.app)
        self.app.register_blueprint(workouts.workouts_bp, url_prefix='/workouts')
        self.app.register_blueprint(sessions.exercises_bp, url_prefix='/exercises')
        self.user = str(uuid4())
        with self.app.app_context():
            self.headers = {'Authorization': 'Bearer ' + create_access_token(identity=self.user)}
        self.client = self.app.test_client()

    def test_recent_records_only_count_improvements(self):
        since = datetime(2026, 11, 5)
        bench, squat, row = uuid4(), uuid4(), uuid4()
        rows = [
            (bench, 'Supino', datetime(2026, 10, 20), 30.0),
            (bench, 'Supino', datetime(2026, 11, 10), 32.0),
            (bench, 'Supino', datetime(2026, 11, 12), 32.0),
            (squat, 'Agachamento', datetime(2026, 10, 1), 80.0),
            (squat, 'Agachamento', datetime(2026, 11, 15), 80.0),
            (row, 'Remada', datetime(2026, 11, 16), 40.0),
        ]
        records = sessions.recent_records(rows, since)
        self.assertEqual(records, [{
            'exercise_library_id': str(bench), 'name': 'Supino', 'weight_kg': 32.0,
            'previous_kg': 30.0, 'achieved_at': '2026-11-10T00:00:00',
        }])

    def test_recent_records_require_authentication(self):
        self.assertEqual(self.client.get('/exercises/records/recent').status_code, 401)

    def test_routes_require_authentication(self):
        self.assertEqual(self.client.get('/exercises/sessions/active').status_code, 401)
        self.assertEqual(self.client.post(f'/workouts/day/{uuid4()}/exercises', json={}).status_code, 401)

    def test_exercise_validation(self):
        for data in [None, {}, {'name': 'x', 'sets': 0}, {'name': 'x', 'sets': True}, {'name': 'x', 'sets': 3, 'reps': ''}, {'name': 'x', 'sets': 3, 'reps': '12', 'rest_seconds': -1}]:
            with self.assertRaises(ValueError): workouts.exercise_fields(data)
        self.assertEqual(workouts.exercise_fields({'name': ' X ', 'sets': 3, 'reps': '8-12'})['name'], 'X')

    def test_add_exercise_checks_ownership(self):
        model = MagicMock()
        model.query.filter_by.return_value.first.return_value = None
        day_id = uuid4()
        with patch.object(workouts, 'WorkoutDay', model):
            response = self.client.post(f'/workouts/day/{day_id}/exercises', json={'name': 'X'}, headers=self.headers)
            self.assertEqual(response.status_code, 404)
            model.query.filter_by.assert_called_once_with(id=day_id, user_id=__import__('uuid').UUID(self.user))

    def test_edit_exercise_and_preserve_fields(self):
        model = MagicMock()
        exercise = SimpleNamespace(id=uuid4(), name='Old', sets=3, reps='12', rest_seconds=60, notes='')
        model.query.filter_by.return_value.first.return_value = exercise
        with patch.object(workouts, 'Exercise', model), patch.object(workouts, 'db') as db:
            response = self.client.put(f'/workouts/exercises/{exercise.id}', json={'name': 'New', 'sets': 4, 'reps': '8', 'rest_seconds': 90}, headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(exercise.name, 'New')
            self.assertEqual(exercise.sets, 4)
            db.session.commit.assert_called_once()

    def test_details_include_nullable_date(self):
        model = MagicMock()
        plan = SimpleNamespace(id=uuid4(), name='Plan', description='', is_active=True, created_at=datetime(2026, 11, 16), days=[])
        model.query.options.return_value.filter_by.return_value.first.return_value = plan
        with patch.object(workouts, 'WorkoutPlan', model), patch.object(workouts, 'joinedload', MagicMock()):
            self.assertEqual(self.client.get(f'/workouts/{plan.id}', headers=self.headers).json['created_at'], '2026-11-16T00:00:00')
            plan.created_at = None
            self.assertIsNone(self.client.get(f'/workouts/{plan.id}', headers=self.headers).json['created_at'])

    def test_active_session_restores_sets(self):
        session_model, day_model = MagicMock(), MagicMock()
        day = SimpleNamespace(id=uuid4(), workout_plan_id=uuid4())
        session = SimpleNamespace(id=uuid4(), workout_day_id=day.id, started_at=sessions.now_cuiaba() - timedelta(minutes=5), logs=[SimpleNamespace(exercise_id=uuid4(), set_number=1, reps_done=12, weight_used_kg=20, completed=True)])
        session_model.query.filter_by.return_value.first.return_value = session
        day_model.query.filter_by.return_value.first.return_value = day
        with patch.object(sessions, 'WorkoutSession', session_model), patch.object(sessions, 'WorkoutDay', day_model):
            response = self.client.get('/exercises/sessions/active', headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['logs'][0]['reps_done'], 12)
            self.assertGreaterEqual(response.json['elapsed_seconds'], 300)
            session_model.query.filter_by.assert_called_once_with(user_id=self.user, status='in_progress')

    def test_finish_uses_current_weight_and_is_idempotent(self):
        model, user_model = MagicMock(), MagicMock()
        session = SimpleNamespace(id=uuid4(), status='in_progress', started_at=sessions.now_cuiaba()-timedelta(minutes=30))
        model.query.filter_by.return_value.first.return_value = session
        user_model.query.get.return_value = SimpleNamespace(profile=SimpleNamespace(current_weight_kg=80))
        with patch.object(sessions, 'WorkoutSession', model), patch.object(identity, 'User', user_model), patch.object(sessions, 'db'), patch.object(GamificationService, 'handle_activity') as gamification:
            response = self.client.put(f'/exercises/sessions/{session.id}/finish', json={}, headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertGreater(response.json['calories'], 0)
            self.assertEqual(session.status, 'completed')
            second = self.client.put(f'/exercises/sessions/{session.id}/finish', json={}, headers=self.headers)
            self.assertEqual(second.status_code, 200)
            gamification.assert_called_once()

    def test_log_set_again_corrects_the_logged_set(self):
        session_model, exercise_model, log_model = MagicMock(), MagicMock(), MagicMock()
        session = SimpleNamespace(id=uuid4(), status='in_progress', workout_day_id=uuid4())
        exercise = SimpleNamespace(id=uuid4(), sets=3)
        existing = SimpleNamespace(id=uuid4(), reps_done=8, weight_used_kg=40)
        session_model.query.filter_by.return_value.first.return_value = session
        exercise_model.query.filter_by.return_value.first.return_value = exercise
        log_model.query.filter_by.return_value.first.return_value = existing
        with patch.object(sessions, 'WorkoutSession', session_model), patch.object(sessions, 'Exercise', exercise_model), patch.object(sessions, 'ExerciseLog', log_model), patch.object(sessions, 'db') as db:
            response = self.client.post(f'/exercises/sessions/{session.id}/log-set', json={'exercise_id': str(exercise.id), 'set_number': 1, 'reps_done': 10, 'weight_used_kg': 42.5}, headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual((existing.reps_done, existing.weight_used_kg), (10, 42.5))
            db.session.commit.assert_called_once()
            log_model.assert_not_called()

    def test_discard_only_open_sessions(self):
        model = MagicMock()
        session = SimpleNamespace(id=uuid4(), status='completed')
        model.query.filter_by.return_value.first.return_value = session
        with patch.object(sessions, 'WorkoutSession', model), patch.object(sessions, 'db') as db:
            self.assertEqual(self.client.delete(f'/exercises/sessions/{session.id}', headers=self.headers).status_code, 409)
            db.session.delete.assert_not_called()
            session.status = 'in_progress'
            self.assertEqual(self.client.delete(f'/exercises/sessions/{session.id}', headers=self.headers).status_code, 204)
            db.session.delete.assert_called_once_with(session)
            db.session.commit.assert_called_once()
            model.query.filter_by.assert_called_with(id=session.id, user_id=__import__('uuid').UUID(self.user))
        model.query.filter_by.return_value.first.return_value = None
        with patch.object(sessions, 'WorkoutSession', model):
            self.assertEqual(self.client.delete(f'/exercises/sessions/{uuid4()}', headers=self.headers).status_code, 404)

    def test_session_detail_groups_sets_by_exercise(self):
        session_model, day_model, exercise_model = MagicMock(), MagicMock(), MagicMock()
        squat, plank = uuid4(), uuid4()
        t = datetime(2026, 11, 20, 7, 0)
        logs = [
            SimpleNamespace(exercise_id=squat, exercise_library_id=None, set_number=2, reps_done=8, weight_used_kg=60.0, completed=True, created_at=t + timedelta(minutes=3)),
            SimpleNamespace(exercise_id=squat, exercise_library_id=None, set_number=1, reps_done=10, weight_used_kg=50.0, completed=True, created_at=t + timedelta(minutes=1)),
            SimpleNamespace(exercise_id=plank, exercise_library_id=None, set_number=1, reps_done=45, weight_used_kg=0, completed=True, created_at=t + timedelta(minutes=6)),
            SimpleNamespace(exercise_id=plank, exercise_library_id=None, set_number=2, reps_done=45, weight_used_kg=0, completed=False, created_at=t + timedelta(minutes=8)),
        ]
        session = SimpleNamespace(id=uuid4(), status='completed', workout_day_id=uuid4(), started_at=t, completed_at=t + timedelta(minutes=40),
                                  total_duration_seconds=2400, calories_burned=300.0, notes=None, logs=logs)
        session_model.query.filter_by.return_value.first.return_value = session
        day_model.query.filter_by.return_value.first.return_value = SimpleNamespace(name='Treino A')
        exercise_model.query.filter.return_value.all.return_value = [SimpleNamespace(id=squat, name='Agachamento'), SimpleNamespace(id=plank, name='Prancha')]
        with patch.object(sessions, 'WorkoutSession', session_model), patch.object(sessions, 'WorkoutDay', day_model), patch.object(sessions, 'Exercise', exercise_model):
            body = self.client.get(f'/exercises/sessions/{session.id}', headers=self.headers).json
        self.assertEqual(body['workout_name'], 'Treino A')
        self.assertEqual([e['name'] for e in body['exercises']], ['Agachamento', 'Prancha'])
        self.assertEqual([s['set_number'] for s in body['exercises'][0]['sets']], [1, 2])
        self.assertEqual(body['total_sets'], 3)
        self.assertEqual(body['total_volume_kg'], 980.0)


if __name__ == '__main__': unittest.main()
