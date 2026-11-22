"""Redis down must not take the API down: limiter, cache and job state degrade to memory."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import time
import unittest
import uuid
from unittest.mock import patch

from app.shared import job_state
from app.shared.job_state import JobState

DEAD_REDIS = 'redis://127.0.0.1:1/0'  # nothing listens on port 1: connection refused


class RedisOutageTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'REDIS_URL': DEAD_REDIS, 'RATELIMIT_ENABLED': 'true'})
        env.start(); self.addCleanup(env.stop)
        job_state._client = None
        self.addCleanup(lambda: setattr(job_state, '_client', None))

    def test_api_keeps_answering_and_limiting(self):
        from app import create_app
        from app.shared.extensions import limiter
        app = create_app()
        app.config['TESTING'] = True
        self.addCleanup(lambda: setattr(limiter, 'enabled', False))  # other tests expect it inactive

        @app.get('/limited-probe')
        @limiter.limit('3 per minute')
        def limited_probe():
            return 'ok'

        client = app.test_client()
        started = time.monotonic()
        self.assertEqual(client.get('/health').status_code, 200)
        codes = [client.get('/limited-probe').status_code for _ in range(5)]
        self.assertEqual(codes, [200, 200, 200, 429, 429])  # limited from process memory, no 500
        self.assertLess(time.monotonic() - started, 10)

    def test_cache_delete_never_raises(self):
        from app import create_app
        from app.shared.extensions import cache_delete
        app = create_app()
        with app.app_context():
            cache_delete('diet_plan:someone')  # would raise redis.ConnectionError before

    def test_job_state_falls_back_to_memory(self):
        jobs = JobState()
        key = f'test:{uuid.uuid4()}'
        self.assertTrue(jobs.claim(key, 60))
        self.assertFalse(jobs.claim(key, 60))
        jobs.set(key, {'status': 'pending'})
        jobs.finish(key, {'status': 'done', 'plan_id': 'p'})
        self.assertEqual(jobs.get(key)['status'], 'done')


if __name__ == '__main__':
    unittest.main()
