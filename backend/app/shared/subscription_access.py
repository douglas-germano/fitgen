"""Subscription gate: the app is only usable with an active subscription.

Access rule (`user_has_access`):
- admins always have access;
- everyone else needs a paid/trial period that has not ended yet
  (`subscription_expires_at` in the future) and a status that is not `suspended`.
  `canceled` (won't renew) and `past_due` (billing retry) keep access until the period ends.

The free trial is the store's introductory offer (Apple / Kiwify); the webhooks store the
trial end as `subscription_expires_at`, so a trial needs no special case here.

Disable the whole gate (e.g. emergency / staging) with `SUBSCRIPTION_REQUIRED=false`.
"""
import os
import uuid
from datetime import datetime

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.shared.extensions import db

ACCESS_STATUSES = {"active", "canceled", "past_due"}

# Reachable without a subscription: auth, payment webhooks, subscription endpoints
# (to buy / restore / sync), the admin API (guarded by its own admin check) and docs/static.
EXEMPT_PREFIXES = (
    "/api/auth/", "/api/webhooks/", "/api/subscriptions/", "/api/admin/",
    "/api/static/", "/api/docs", "/apidocs", "/flasgger_static", "/apispec",
)
# The app reads its own profile to learn whether it is locked.
EXEMPT_EXACT_GET = {"/api/profile/me"}


def enforcement_enabled() -> bool:
    return os.getenv("SUBSCRIPTION_REQUIRED", "true").strip().lower() not in ("0", "false", "no", "off")


def user_has_access(user, now: datetime | None = None) -> bool:
    if not enforcement_enabled() or user.role == "admin":
        return True
    now = now or datetime.utcnow()
    expires = user.subscription_expires_at
    return bool(expires and expires > now and user.subscription_status in ACCESS_STATUSES)


def access_payload(user) -> dict:
    return {
        "has_access": user_has_access(user),
        "subscription_required": enforcement_enabled(),
        "subscription_status": user.subscription_status,
        "subscription_expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
    }


def init_subscription_gate(app) -> None:
    from app.modules.identity.domain.models import User

    @app.before_request
    def subscription_gate():
        path = request.path
        if request.method == "OPTIONS" or not path.startswith("/api/") or path.startswith(EXEMPT_PREFIXES):
            return None
        if request.method == "GET" and path in EXEMPT_EXACT_GET:
            return None
        if not enforcement_enabled():
            return None
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
        except Exception:  # noqa: BLE001 - bad/expired token: the route's own @jwt_required answers 401
            return None
        if not identity:
            return None
        try:
            user = db.session.get(User, uuid.UUID(str(identity)))
        except ValueError:
            return None
        if user is None or user_has_access(user):
            return None
        return jsonify({
            "code": "subscription_required",
            "msg": "Assinatura necessária para usar o FitGen.",
            **access_payload(user),
        }), 402
