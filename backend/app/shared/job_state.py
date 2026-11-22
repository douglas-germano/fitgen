"""State of background jobs shared by every gunicorn worker and every Railway replica.

A job started on one replica must be visible to a request that lands on another (a second
tap, a status poll). With REDIS_URL set the state lives in Redis; without it (tests, local
runs) it falls back to this process's memory, which is only correct for a single process.

Usage:
    if jobs.claim(key, ttl):      # True for exactly one caller while the claim lives
        jobs.set(key, {...}); start_the_work()
    jobs.get(key)                 # {...} or None
    jobs.finish(key, {...})       # stores the result and releases the claim
"""
import json
import logging
import os
import threading
import time

log = logging.getLogger(__name__)

_client = None
_client_url = None


def redis_client():
    """Shared redis-py client for REDIS_URL, or None when it isn't configured."""
    global _client, _client_url
    url = os.environ.get('REDIS_URL')
    if not url:
        return None
    if _client is None or _client_url != url:
        import redis
        _client = redis.Redis.from_url(url, socket_timeout=2, socket_connect_timeout=1, health_check_interval=30)
        _client_url = url
    return _client


class _MemoryBackend:
    def __init__(self):
        self._data = {}
        self._lock = threading.Lock()

    def _live(self, key):
        item = self._data.get(key)
        if item and item[1] is not None and item[1] < time.monotonic():
            self._data.pop(key, None)
            return None
        return item

    def set(self, key, value, ttl, only_if_absent=False):
        with self._lock:
            if only_if_absent and self._live(key):
                return False
            self._data[key] = (value, time.monotonic() + ttl if ttl else None)
            return True

    def get(self, key):
        with self._lock:
            item = self._live(key)
            return item[0] if item else None

    def delete(self, key):
        with self._lock:
            self._data.pop(key, None)

    def clear(self):
        with self._lock:
            self._data.clear()


class _RedisBackend:
    def __init__(self, client):
        self.r = client

    def set(self, key, value, ttl, only_if_absent=False):
        return bool(self.r.set(key, value, ex=int(ttl) if ttl else None, nx=only_if_absent))

    def get(self, key):
        value = self.r.get(key)
        return value.decode() if isinstance(value, bytes) else value

    def delete(self, key):
        self.r.delete(key)


class JobState:
    PREFIX = 'fitgen:job:'

    def __init__(self):
        self._memory = _MemoryBackend()

    def _call(self, op, *args, **kwargs):
        """Runs op on Redis; if Redis is unreachable, on this process's memory instead.

        Degraded but working: during an outage another replica can't see this job, so a
        second tap there may start a duplicate generation. Better than failing onboarding.
        """
        client = redis_client()
        if client is not None:
            try:
                return getattr(_RedisBackend(client), op)(*args, **kwargs)
            except Exception as exc:
                log.warning('job state: Redis unavailable (%s), using process memory', exc)
        return getattr(self._memory, op)(*args, **kwargs)

    def claim(self, key, ttl):
        """Takes the job's lock; True for one caller only until finish() or the ttl runs out.

        The ttl is the safety net if the process running the job dies (deploy, crash).
        """
        return self._call('set', self.PREFIX + key + ':lock', '1', ttl, only_if_absent=True)

    def set(self, key, data, ttl=86400):
        self._call('set', self.PREFIX + key, json.dumps(data), ttl)

    def get(self, key):
        raw = self._call('get', self.PREFIX + key)
        return json.loads(raw) if raw else None

    def finish(self, key, data, ttl=86400):
        self.set(key, data, ttl)
        self._call('delete', self.PREFIX + key + ':lock')

    def wait(self, key, timeout, interval=0.5):
        """Polls until the job leaves 'pending' or the timeout passes; returns the last state.

        Cheap under gevent (time.sleep yields), and works across replicas, unlike an Event.
        """
        deadline = time.monotonic() + timeout
        while True:
            state = self.get(key)
            if not state or state.get('status') != 'pending' or time.monotonic() >= deadline:
                return state
            time.sleep(min(interval, max(0.0, deadline - time.monotonic())))

    def reset_memory(self):
        """Tests only: clears the in-memory fallback."""
        self._memory.clear()


jobs = JobState()
