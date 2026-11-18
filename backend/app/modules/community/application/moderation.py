"""Content checks for user-written posts, comments and photos.

Text uses a local filter when the provider is unavailable. Photos require an
explicit successful AI moderation decision before publication.
"""
import logging
import os

from flask import current_app, has_app_context
import re

log = logging.getLogger(__name__)

# Minimal local net for the most common slurs/threats in pt-BR.
_BLOCKLIST = re.compile(
    r'\b(viad[oa]|bich[ao]na|macac[oa]|retardad[oa]|vagabund[oa]|put[ao]|arrombad[oa]|vou te matar|se mata)\b',
    re.IGNORECASE,
)

TEXT_PROMPT = """Você modera a comunidade de um app de fitness brasileiro.
Decida se o texto abaixo pode ser publicado. Recuse discurso de ódio, assédio, ameaças,
conteúdo sexual, incentivo a transtornos alimentares ou automutilação, venda de anabolizantes
ou remédios para emagrecer, golpes e spam. Elogios, desabafos e linguagem informal são permitidos.
Responda em JSON: {"allowed": true|false, "reason": "motivo curto em português para o usuário"}.

Texto:
"""

IMAGE_PROMPT = """Você modera fotos de uma comunidade de fitness. Recuse nudez, conteúdo sexual,
violência, imagens de automutilação e propaganda. Fotos de treino, comida, paisagens e selfies
vestidas são permitidas. Responda em JSON: {"allowed": true|false, "reason": "motivo curto em português"}."""


def _ai():
    from app.modules.coach.infrastructure.ai_service import AIService
    return AIService()


def _enabled():
    value = os.environ.get('COMMUNITY_MODERATION_ENABLED', 'true')
    if has_app_context():
        value = current_app.config.get('COMMUNITY_MODERATION_ENABLED', value)
    return str(value).strip().lower() not in ('false', '0', 'no', 'off')


def check_text(text):
    """(allowed, reason)."""
    if not _enabled():
        return True, None
    if _BLOCKLIST.search(text or ''):
        return False, 'O texto tem termos ofensivos. Revise e tente novamente.'
    try:
        result = _ai().generate_json(TEXT_PROMPT + text)
        if isinstance(result, dict) and result.get('allowed') is False:
            return False, result.get('reason') or 'Esse conteúdo não segue as regras da comunidade.'
    except Exception as exc:  # provider missing or down: local check already ran
        log.info('community text moderation skipped: %s', exc)
    return True, None


def check_image(data, mime_type):
    if not _enabled():
        return True, None
    try:
        result = _ai().analyze_image(IMAGE_PROMPT, [{'data': data, 'mime_type': mime_type}])
        if isinstance(result, dict) and result.get('allowed') is True:
            return True, None
        if isinstance(result, dict) and result.get('allowed') is False:
            return False, result.get('reason') or 'Essa foto não segue as regras da comunidade.'
    except Exception as exc:
        log.info('community image moderation unavailable: %s', type(exc).__name__)
    return False, 'Não foi possível verificar a foto agora. Tente novamente mais tarde.'
