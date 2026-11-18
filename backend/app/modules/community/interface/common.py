from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity

from app.modules.community.application.graph import as_uuid


def me():
    return as_uuid(get_jwt_identity())


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def fail(message, status=400):
    return jsonify({'msg': message}), status


def clean_text(value, max_len, field='Texto', required=True):
    """(text, error)."""
    text = (value or '').strip() if isinstance(value, str) or value is None else None
    if text is None:
        return None, f'{field} inválido.'
    if required and not text:
        return None, f'{field} é obrigatório.'
    if len(text) > max_len:
        return None, f'{field} pode ter no máximo {max_len} caracteres.'
    return text or None, None
