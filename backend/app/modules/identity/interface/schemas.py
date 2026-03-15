"""
Marshmallow schemas for request validation
"""
from marshmallow import Schema, fields, validate, ValidationError

# ============ AUTH SCHEMAS ============

class RegisterSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={'required': 'Nome é obrigatório'}
    )
    email = fields.Email(
        required=True,
        error_messages={'required': 'Email é obrigatório'}
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        error_messages={'required': 'Senha é obrigatória'}
    )
    phone = fields.Str(
        required=False,
        validate=validate.Length(min=10, max=15),
        metadata={"description": "WhatsApp number (optional but recommended)"}
    )

class LoginSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={'required': 'Email é obrigatório'}
    )
    password = fields.Str(
        required=True,
        error_messages={'required': 'Senha é obrigatória'}
    )

# ============ USER SCHEMAS ============

class UserUpdateSchema(Schema):
    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        required=False
    )
    email = fields.Email(required=False)
    subscription_status = fields.Str(
        validate=validate.OneOf(['active', 'suspended']),
        required=False
    )

class UserRoleUpdateSchema(Schema):
    role = fields.Str(
        required=True,
        validate=validate.OneOf(['user', 'admin']),
        error_messages={'required': 'Role é obrigatória'}
    )

# ============ PROFILE SCHEMAS ============

class ProfileUpdateSchema(Schema):
    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        required=False
    )
    age = fields.Int(
        validate=validate.Range(min=10, max=120),
        required=False
    )
    gender = fields.Str(
        validate=validate.OneOf(['male', 'female', 'other']),
        required=False
    )
    height_cm = fields.Float(
        validate=validate.Range(min=50, max=300),
        required=False
    )
    current_weight_kg = fields.Float(
        validate=validate.Range(min=20, max=500),
        required=False
    )
    target_weight_kg = fields.Float(
        validate=validate.Range(min=20, max=500),
        required=False
    )

# ============ PAGINATION SCHEMA ============

class PaginationSchema(Schema):
    page = fields.Int(
        load_default=1,
        validate=validate.Range(min=1)
    )
    per_page = fields.Int(
        load_default=20,
        validate=validate.Range(min=1, max=100)
    )

