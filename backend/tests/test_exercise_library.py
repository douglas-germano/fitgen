"""Exercise library: catalog integrity, idempotent seed and the app-facing routes (in-memory SQLite)."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from unittest.mock import patch
from uuid import uuid4
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from app.shared.extensions import db
from app.modules.training.data import exercise_catalog as catalog
from app.modules.training.domain.exercise_library import ExerciseLibrary
from app.modules.identity.domain.models import User
from app.modules.training.domain.models import Exercise, ExerciseLog, WorkoutDay, WorkoutPlan, WorkoutSession
from app.shared import model_registry  # noqa: F401  (maps every model so relationships resolve)
from app.modules.training.application.exercise_library_seed import seed_exercise_library
from app.modules.training.application.exercise_animations import ANIMATIONS
from app.modules.training.interface import routes_exercises, routes_workouts


class ExerciseLibraryTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', JWT_SECRET_KEY=os.environ['JWT_SECRET_KEY'])
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(routes_exercises.exercises_bp, url_prefix='/exercises')
        self.app.register_blueprint(routes_workouts.workouts_bp, url_prefix='/workouts')
        self.ctx = self.app.app_context()
        self.ctx.push()
        self.tables = [model.__table__ for model in (User, ExerciseLibrary, WorkoutPlan, WorkoutDay, Exercise, WorkoutSession, ExerciseLog)]
        db.metadata.create_all(db.engine, tables=self.tables)
        self.headers = {'Authorization': 'Bearer ' + create_access_token(identity=str(uuid4()))}
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.metadata.drop_all(db.engine, tables=self.tables)
        self.ctx.pop()

    def test_catalog_is_valid(self):
        self.assertGreaterEqual(catalog.validate(), 100)
        self.assertEqual(set(ANIMATIONS), {exercise['name'] for exercise in catalog.EXERCISES})
        self.assertEqual(len(set(ANIMATIONS.values())), len(ANIMATIONS))

    def test_seed_is_idempotent_and_keeps_admin_edits(self):
        self.assertEqual(seed_exercise_library(), (len(catalog.EXERCISES), 0))
        row = ExerciseLibrary.query.filter_by(name='Prancha Frontal').one()
        row.description = 'Editado no admin'
        row.tips = None
        db.session.commit()
        self.assertEqual(seed_exercise_library(), (0, 1))  # only the emptied field is refilled
        self.assertEqual(row.description, 'Editado no admin')
        self.assertTrue(row.tips)
        seed_exercise_library(overwrite=True)
        self.assertNotEqual(row.description, 'Editado no admin')

    def test_library_routes(self):
        self.assertEqual(self.client.get('/exercises/library').status_code, 401)
        seed_exercise_library()
        hidden = ExerciseLibrary.query.filter_by(name='Burpee').one()
        hidden.is_active = False
        db.session.commit()
        items = self.client.get('/exercises/library', headers=self.headers).get_json()
        self.assertEqual(len(items), len(catalog.EXERCISES) - 1)
        plank = next(i for i in items if i['name'] == 'Prancha Frontal')
        self.assertEqual(plank['muscle_groups'][0], 'abs')
        self.assertGreater(len(plank['instructions']), 1)  # stored per line, served as a list
        detail = self.client.get(f"/exercises/library/{plank['id']}", headers=self.headers)
        self.assertEqual(detail.get_json()['name'], 'Prancha Frontal')
        self.assertEqual(detail.get_json()['animation_url'], plank['animation_url'])
        self.assertEqual(self.client.get(f'/exercises/library/{hidden.id}', headers=self.headers).status_code, 404)

    def test_animation_is_served_only_for_active_catalog_entries(self):
        seed_exercise_library()
        plank = ExerciseLibrary.query.filter_by(name='Prancha Frontal').one()
        animation_path = f'/exercises/library/animations/{ANIMATIONS[plank.name]}'
        with patch.object(routes_exercises.storage, 'signed_url', return_value='https://media.example/file.gif') as sign:
            result = self.client.get(animation_path)
            self.assertEqual(result.status_code, 302)
            self.assertEqual(result.location, 'https://media.example/file.gif')
            self.assertEqual(result.headers['Cache-Control'], 'no-store')
            sign.assert_called_once_with(f'r2:exercise-animations/{ANIMATIONS[plank.name]}')
            plank.is_active = False
            db.session.commit()
            self.assertEqual(self.client.get(animation_path).status_code, 404)
            self.assertEqual(self.client.get('/exercises/library/animations/unknown.gif').status_code, 404)
            sign.assert_called_once()

    def test_exercise_link_validation(self):
        seed_exercise_library()
        library_id = ExerciseLibrary.query.first().id
        base = {'name': 'X', 'sets': 3, 'reps': '12'}
        self.assertEqual(routes_workouts.exercise_fields({**base, 'exercise_library_id': str(library_id)})['exercise_library_id'], library_id)
        self.assertIsNone(routes_workouts.exercise_fields({**base, 'exercise_library_id': None})['exercise_library_id'])
        self.assertNotIn('exercise_library_id', routes_workouts.exercise_fields(base))
        for bad in ['nope', str(uuid4())]:
            with self.assertRaises(ValueError):
                routes_workouts.exercise_fields({**base, 'exercise_library_id': bad})

    @patch.dict(os.environ, {'SUBSCRIPTION_REQUIRED': 'true', 'FREEMIUM': 'true'})
    def test_replacement_reuses_the_plan_row_and_keeps_premium_history(self):
        seed_exercise_library()
        original = ExerciseLibrary.query.filter_by(name='Prancha Frontal').one()
        replacement = ExerciseLibrary.query.filter_by(name='Flexão de Braço').one()
        user = User(name='Atleta', email='atleta@example.test', password_hash='unused', role='admin')
        other = User(name='Outra pessoa', email='outra@example.test', password_hash='unused')
        db.session.add_all([user, other])
        db.session.flush()
        plan = WorkoutPlan(name='Treino', user_id=user.id)
        db.session.add(plan)
        db.session.flush()
        day = WorkoutDay(workout_plan_id=plan.id, user_id=user.id)
        db.session.add(day)
        db.session.flush()
        exercise = Exercise(name=original.name, exercise_library_id=original.id, user_id=user.id, workout_day_id=day.id, sets=3)
        session = WorkoutSession(workout_day_id=day.id, user_id=user.id, status='in_progress')
        db.session.add_all([exercise, session])
        db.session.commit()
        headers = {'Authorization': 'Bearer ' + create_access_token(identity=str(user.id))}
        other_headers = {'Authorization': 'Bearer ' + create_access_token(identity=str(other.id))}
        self.assertEqual(self.client.post(f'/exercises/sessions/{session.id}/log-set', headers=headers, json={
            'exercise_id': str(exercise.id), 'set_number': 1, 'reps_done': 12, 'weight_used_kg': 10,
        }).status_code, 201)
        body = {'name': 'Nome ignorado', 'exercise_library_id': str(replacement.id), 'sets': 3, 'reps': '12'}
        path = f'/workouts/exercises/{exercise.id}'
        self.assertEqual(self.client.put(path, headers=headers, json=body).status_code, 409)
        session.status = 'completed'
        db.session.commit()
        self.assertEqual(self.client.put(path, headers=headers, json=body).status_code, 200)
        self.assertEqual(Exercise.query.count(), 1)
        self.assertEqual(ExerciseLibrary.query.count(), len(catalog.EXERCISES))
        self.assertEqual((exercise.name, exercise.exercise_library_id), (replacement.name, replacement.id))
        history_path = f'/exercises/library/{original.id}/history'
        locked = self.client.get(history_path, headers=other_headers)
        self.assertEqual(locked.status_code, 402)
        self.assertEqual(locked.get_json()['feature'], 'exercise_history')
        history = self.client.get(history_path, headers=headers).get_json()
        self.assertEqual(history['sessions'][0]['sets'][0]['reps'], 12)
        self.assertEqual(self.client.get(f'/exercises/library/{replacement.id}/history', headers=headers).get_json()['sessions'], [])
        other.role = 'admin'
        db.session.commit()
        self.assertEqual(self.client.get(history_path, headers=other_headers).get_json()['sessions'], [])


if __name__ == '__main__':
    unittest.main()
