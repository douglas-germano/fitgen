"""Image storage: Cloudflare R2 (S3 API) when configured, local disk otherwise.

A stored value in the database is one of:
  - ``r2:<key>``   an object in the R2 bucket (new uploads when R2 is configured)
  - a relative path such as ``uploads/community/x.png`` (legacy local file)
  - an ``http(s)://`` URL (e.g. a social-login photo), passed through untouched

The bucket stays private: clients get short-lived presigned URLs, and the routes
that hand them out keep enforcing who may see what.

Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
     R2_ENDPOINT (optional override), R2_URL_TTL (seconds, default 3600)
"""
import logging
import mimetypes
import os

log = logging.getLogger(__name__)

SCHEME = 'r2:'
DEFAULT_URL_TTL = 3600
_client = None
_client_key = None

# Where legacy / fallback files live: 'static' is public (profile pictures), 'instance' is private.
LOCAL_ROOTS = {'avatars': 'static', 'posts': 'instance', 'groups': 'instance', 'challenges': 'instance', 'progress-photos': 'instance'}
LEGACY_DIRS = {'avatars': 'uploads/profile_pics', 'posts': 'uploads/community', 'groups': 'uploads/community_groups', 'challenges': 'uploads/community_challenges', 'progress-photos': 'uploads/progress_photos'}


class StorageError(Exception):
    pass


def _settings():
    return {k: (os.environ.get(k) or '').strip() for k in ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT')}


def configured():
    s = _settings()
    return bool(s['R2_ACCESS_KEY_ID'] and s['R2_SECRET_ACCESS_KEY'] and s['R2_BUCKET'] and (s['R2_ACCOUNT_ID'] or s['R2_ENDPOINT']))


def bucket():
    return _settings()['R2_BUCKET']


def url_ttl():
    try:
        return max(60, int(os.environ.get('R2_URL_TTL') or DEFAULT_URL_TTL))
    except ValueError:
        return DEFAULT_URL_TTL


def _s3():
    """Cached boto3 client; rebuilt if the credentials change (tests, key rotation)."""
    global _client, _client_key
    s = _settings()
    key = tuple(sorted(s.items()))
    if _client is None or _client_key != key:
        import boto3
        from botocore.config import Config
        _client = boto3.client(
            's3',
            endpoint_url=s['R2_ENDPOINT'] or f"https://{s['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=s['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=s['R2_SECRET_ACCESS_KEY'],
            region_name='auto',
            config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}, retries={'max_attempts': 3, 'mode': 'standard'},
                          connect_timeout=5, read_timeout=20),
        )
        _client_key = key
    return _client


def is_r2(value):
    return isinstance(value, str) and value.startswith(SCHEME)


def key_of(value):
    return value[len(SCHEME):]


def _local_path(kind, value):
    from flask import current_app
    base = current_app.root_path + '/static' if LOCAL_ROOTS[kind] == 'static' else current_app.instance_path
    return os.path.join(base, value)


def content_type(ext):
    return mimetypes.types_map.get('.' + ext.lower().lstrip('.'), 'application/octet-stream')


def save_as_r2(kind, filename, data, ext):
    """Upload to R2 unconditionally (used by the migration) and return the ``r2:`` value."""
    key = f'{kind}/{filename}'
    try:
        _s3().put_object(Bucket=bucket(), Key=key, Body=data, ContentType=content_type(ext),
                         CacheControl='private, max-age=31536000, immutable')
    except Exception as exc:
        log.error('R2 upload failed for %s: %s', key, exc)
        raise StorageError('Não foi possível salvar a imagem agora. Tente novamente.') from exc
    return SCHEME + key


def save(kind, filename, data, ext):
    """Store `data` and return the value to keep in the database."""
    if configured():
        return save_as_r2(kind, filename, data, ext)
    value = f'{LEGACY_DIRS[kind]}/{filename}'
    path = _local_path(kind, value)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as out:
        out.write(data)
    return value


def read(kind, value, limit=10 * 1024 * 1024):
    """Bytes of a stored image, or None if it is gone."""
    if not value or value.startswith(('http://', 'https://')):
        return None
    try:
        if is_r2(value):
            body = _s3().get_object(Bucket=bucket(), Key=key_of(value))['Body']
            return body.read(limit)
        with open(_local_path(kind, value), 'rb') as f:
            return f.read(limit)
    except Exception as exc:
        log.info('image %s unavailable: %s', value, exc)
        return None


def remove(kind, value):
    """Best-effort delete of an object we own (never external URLs)."""
    if not value:
        return
    try:
        if is_r2(value):
            _s3().delete_object(Bucket=bucket(), Key=key_of(value))
        elif value.startswith(LEGACY_DIRS[kind] + '/'):
            os.remove(_local_path(kind, value))
    except Exception as exc:
        log.info('could not remove %s: %s', value, exc)


def signed_url(value, ttl=None):
    """Temporary URL for an R2 object; None for anything else."""
    if not is_r2(value) or not configured():
        return None
    try:
        return _s3().generate_presigned_url('get_object', Params={'Bucket': bucket(), 'Key': key_of(value)}, ExpiresIn=ttl or url_ttl())
    except Exception as exc:
        log.warning('presign failed for %s: %s', value, exc)
        return None


def display_value(value):
    """What an API sends to a client as an image reference: presigned URL for R2, unchanged otherwise."""
    if is_r2(value):
        return signed_url(value)
    return value


def image_payload(kind, value):
    """Body for the authenticated /image endpoints: {'url', 'expires_in'} for R2, {'data_uri'} for local files, or None."""
    if not value:
        return None
    if is_r2(value):
        url = signed_url(value)
        return {'url': url, 'expires_in': url_ttl()} if url else None
    import base64
    data = read(kind, value)
    if data is None:
        return None
    ext = value.rsplit('.', 1)[-1].lower()
    return {'data_uri': f'data:image/{"jpeg" if ext == "jpg" else ext};base64,' + base64.b64encode(data).decode()}
