"""Runs a command while holding a Postgres advisory lock, so only one container runs it at a time.

With several Railway replicas starting together, each one runs entrypoint.sh: migrations
and seeds racing each other can fail or insert duplicates. The others wait for the lock,
then run the (idempotent) commands and find nothing left to do.

usage: python3 scripts/run_locked.py <lock-name> <command> [args...]
"""
import hashlib
import os
import subprocess
import sys
import time


def main():
    if len(sys.argv) < 3:
        sys.exit('usage: run_locked.py <lock-name> <command> [args...]')
    name, cmd = sys.argv[1], sys.argv[2:]
    url = os.environ.get('DATABASE_URL', '')
    if not url.startswith('postgres'):
        # sqlite / no database: nothing to share, just run it
        sys.exit(subprocess.call(cmd))

    import psycopg2
    dsn = url.replace('postgresql+psycopg2://', 'postgresql://', 1)
    key = int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], 'big', signed=True)
    conn = psycopg2.connect(dsn, connect_timeout=10)
    conn.autocommit = True
    with conn.cursor() as cur:
        started = time.monotonic()
        print(f'[run_locked] waiting for lock "{name}"...', flush=True)
        cur.execute('SELECT pg_advisory_lock(%s)', (key,))
        print(f'[run_locked] got lock "{name}" after {time.monotonic() - started:.1f}s', flush=True)
        try:
            code = subprocess.call(cmd)
        finally:
            cur.execute('SELECT pg_advisory_unlock(%s)', (key,))
            conn.close()
    sys.exit(code)


if __name__ == '__main__':
    main()
