from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flasgger import Swagger
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
swagger = Swagger()
cache = Cache()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "500 per hour"]
)


def release_db_connection():
    """Ends the request's DB transaction so its pooled connection goes back to the pool.

    Call it right before a slow external call (an AI answer takes 5-60 s): otherwise every
    request waiting on the AI holds a connection and the pool runs dry for everyone else.
    Only call it with no pending writes you might still want to roll back. Objects already
    loaded stay usable; SQLAlchemy reloads them on next access.
    """
    db.session.commit()


def user_or_ip_key():
    """Rate-limit key: the logged-in user (JWT identity), falling back to the client IP."""
    from flask_jwt_extended import get_jwt_identity
    try:
        uid = get_jwt_identity()
    except Exception:
        uid = None
    return f"user:{uid}" if uid else get_remote_address()


def ai_limit(name, default):
    """Per-user limit for an AI route; override with env AI_LIMIT_<NAME> (e.g. "30 per hour").

    Put it BELOW @jwt_required() so the user is known when the limit is checked.
    """
    return limiter.limit(lambda: os.environ.get(f"AI_LIMIT_{name.upper()}", default), key_func=user_or_ip_key)


def cache_delete(key):
    """Deletes a cache entry; a Redis outage only logs (the data is already saved in Postgres).

    The cache is called after db.session.commit(), so raising here answered 500 for a change
    that had been saved.
    """
    try:
        cache.delete(key)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning('cache delete failed for %s: %s', key, exc)
