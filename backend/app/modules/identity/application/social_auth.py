"""Sign in with Google / Apple: verify the provider's id_token and find or create the user."""
import os

import jwt
from jwt import PyJWKClient

GOOGLE_ISSUERS = ('accounts.google.com', 'https://accounts.google.com')
APPLE_ISSUER = 'https://appleid.apple.com'

_jwk_clients = {
    'google': PyJWKClient('https://www.googleapis.com/oauth2/v3/certs', cache_keys=True),
    'apple': PyJWKClient('https://appleid.apple.com/auth/keys', cache_keys=True),
}


class SocialAuthError(Exception):
    pass


def _env_list(name, default=''):
    return [v.strip() for v in os.environ.get(name, default).split(',') if v.strip()]


def allowed_audiences(provider):
    if provider == 'google':
        return _env_list('GOOGLE_CLIENT_IDS')
    return _env_list('APPLE_BUNDLE_IDS', 'com.douglas.fitgen')


def verify_id_token(provider, token):
    """Return the verified claims: sub, email, email_verified, name."""
    if provider not in _jwk_clients:
        raise SocialAuthError('Provedor inválido')
    audiences = allowed_audiences(provider)
    if not audiences:
        raise SocialAuthError(f'Login com {provider} não configurado')
    try:
        key = _jwk_clients[provider].get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=audiences,
            issuer=GOOGLE_ISSUERS if provider == 'google' else APPLE_ISSUER,
            options={'require': ['sub', 'exp', 'iat', 'aud', 'iss']},
        )
    except jwt.PyJWTError as exc:
        raise SocialAuthError('Token inválido') from exc

    # Apple sends email_verified as the string "true"; Google as a bool.
    verified = str(claims.get('email_verified', '')).lower() == 'true'
    return {
        'sub': claims['sub'],
        'email': (claims.get('email') or '').strip().lower() or None,
        'email_verified': verified,
        'name': claims.get('name'),
    }
