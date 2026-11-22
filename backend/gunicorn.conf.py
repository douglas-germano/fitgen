"""Gunicorn settings, loaded automatically from the working directory.

AI calls (OpenRouter) spend 5-60 s waiting on the network. With sync workers each one
holds a whole worker, so 2 slow calls froze the API (login included). gevent workers
serve many requests per process and switch to another while one waits on I/O.
Flags passed on the command line (bind, workers, timeout) still win over this file.
"""
import os

worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "gevent")
# Simultaneous requests per worker (most of them just waiting on the AI provider).
worker_connections = int(os.environ.get("GUNICORN_WORKER_CONNECTIONS", "200"))


def post_fork(server, worker):
    # psycopg2 is a C driver: without this a query blocks every greenlet in the worker.
    if worker_class == "gevent":
        from psycogreen.gevent import patch_psycopg
        patch_psycopg()
