"""Shared job state: one claim per job, results visible to every process (via Redis)."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-test-secret-key')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-jwt-secret-key-32-chars')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
import uuid
from unittest.mock import patch

from app.shared import job_state
from app.shared.job_state import JobState

LOCAL_REDIS = os.environ.get('TEST_REDIS_URL', 'redis://localhost:6379/15')


def redis_available():
    try:
        import redis
        return redis.Redis.from_url(LOCAL_REDIS, socket_connect_timeout=0.5).ping()
    except Exception:
        return False


class Contract:
    """Same behaviour on both backends."""
    def test_only_one_claim_until_finish(self):
        key = f'test:{uuid.uuid4()}'
        self.assertTrue(self.a.claim(key, 60))
        self.assertFalse(self.b.claim(key, 60))   # another worker / replica
        self.a.set(key, {'status': 'pending'})
        self.assertEqual(self.b.get(key), {'status': 'pending'})
        self.a.finish(key, {'status': 'done', 'plan_id': 'p1'})
        self.assertEqual(self.b.get(key)['plan_id'], 'p1')
        self.assertTrue(self.b.claim(key, 60))    # finished: can run again

    def test_wait_returns_when_the_job_leaves_pending(self):
        key = f'test:{uuid.uuid4()}'
        self.a.set(key, {'status': 'done'})
        self.assertEqual(self.b.wait(key, timeout=1, interval=0.01)['status'], 'done')
        self.a.set(key, {'status': 'pending'})
        self.assertEqual(self.b.wait(key, timeout=0.05, interval=0.01)['status'], 'pending')
        self.assertIsNone(self.b.get(f'test:{uuid.uuid4()}'))


class MemoryJobStateTests(Contract, unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ); env.start(); self.addCleanup(env.stop)
        os.environ.pop('REDIS_URL', None)
        self.a = self.b = JobState()  # memory is per process: one instance plays both sides

    def test_claim_expires_if_the_process_dies(self):
        key = f'test:{uuid.uuid4()}'
        self.assertTrue(self.a.claim(key, 0.01))
        import time; time.sleep(0.02)
        self.assertTrue(self.a.claim(key, 60))


@unittest.skipUnless(redis_available(), 'local Redis not running')
class RedisJobStateTests(Contract, unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'REDIS_URL': LOCAL_REDIS}); env.start(); self.addCleanup(env.stop)
        job_state._client = None
        self.addCleanup(lambda: setattr(job_state, '_client', None))
        # Two separate JobState objects: their memory fallbacks differ, so sharing proves Redis
        self.a, self.b = JobState(), JobState()


if __name__ == '__main__':
    unittest.main()
