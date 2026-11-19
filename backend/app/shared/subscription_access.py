"""Access rules: freemium (default) or a hard subscription gate.

Premium rule (`user_has_access` / `is_premium`):
- admins always have it;
- everyone else needs a paid/trial period that has not ended yet
  (`subscription_expires_at` in the future) and a status that is not `suspended`.
  `canceled` (won't renew) and `past_due` (billing retry) keep it until the period ends.
  The 7-day trial (store intro offer / Stripe trial) is stored as `subscription_expires_at`.

Freemium (`FREEMIUM=true`, default): the app is usable by everyone (`has_access` is always
true); only the AI features below need Premium and answer 402 `premium_required`:
  - IA Coach (POST /api/chat)
  - diet plan generation (POST /api/diet/generate, /api/diet/regenerate-day)
  - meal photo/description estimate (POST /api/nutrition/estimate)
  - workout plan generation (POST /api/onboarding/generate-workout), except the FIRST plan,
    which is free so new users get a real plan out of onboarding.
Logging workouts, meals, water and measurements, progress, achievements and community stay free.

`FREEMIUM=false` restores the hard gate: without Premium every API call answers 402
`subscription_required`. `SUBSCRIPTION_REQUIRED=false` turns every check off.
"""
import os
import uuid
from datetime import datetime

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.shared.extensions import db

ACCESS_STATUSES = {"active", "canceled", "past_due"}

# Hard-gate mode only: reachable without a subscription (auth, payment webhooks, subscription
# endpoints to buy / restore / sync, the admin API with its own admin check, docs/static).
EXEMPT_PREFIXES = (
    "/api/auth/", "/api/webhooks/", "/api/subscriptions/", "/api/admin/",
    "/api/static/", "/api/docs", "/apidocs", "/flasgger_static", "/apispec",
)
# The app reads its own profile to learn whether it is locked.
EXEMPT_EXACT_GET = {"/api/profile/me"}

# Freemium mode: (method, path) -> feature key reported to the client.
PREMIUM_ROUTES = {
    ("POST", "/api/chat"): "coach",
    ("POST", "/api/diet/generate"): "diet_plan",
    ("POST", "/api/diet/regenerate-day"): "diet_plan",
    ("POST", "/api/nutrition/estimate"): "meal_estimate",
    ("POST", "/api/onboarding/generate-workout"): "workout_plan",
}
EXERCISE_HISTORY_FEATURE = "exercise_history"
PREMIUM_FEATURES = sorted({*PREMIUM_ROUTES.values(), EXERCISE_HISTORY_FEATURE})


def enforcement_enabled() -> bool:
    return os.getenv("SUBSCRIPTION_REQUIRED", "true").strip().lower() not in ("0", "false", "no", "off")


def freemium_enabled() -> bool:
    return os.getenv("FREEMIUM", "true").strip().lower() not in ("0", "false", "no", "off")


def user_has_access(user, now: datetime | None = None) -> bool:
    """True when the user has Premium (paid or trial period running, or admin)."""
    if not enforcement_enabled() or user.role == "admin":
        return True
    now = now or datetime.utcnow()
    expires = user.subscription_expires_at
    return bool(expires and expires > now and user.subscription_status in ACCESS_STATUSES)


is_premium = user_has_access


def subscription_source(user) -> str | None:
    """Where the subscription is billed: 'web' (Stripe at fitgen.pro), 'app_store', 'play_store'."""
    from app.modules.identity.domain.subscription import Subscription
    sub = Subscription.query.filter_by(user_id=user.id).first()
    if not sub:
        return None
    if sub.stripe_subscription_id or sub.payment_method in ("credit_card", "pix", "boleto"):
        return "web"
    if sub.payment_method in ("app_store", "play_store"):
        return sub.payment_method
    return None


def access_payload(user) -> dict:
    premium = user_has_access(user)
    freemium = freemium_enabled()
    return {
        # Can the app be used at all? Always in freemium mode (old app builds rely on this).
        "has_access": True if freemium else premium,
        "is_premium": premium,
        "plan": "premium" if premium else "free",
        "freemium": freemium,
        "premium_features": [] if premium else (PREMIUM_FEATURES if freemium else []),
        "subscription_required": enforcement_enabled(),
        "subscription_status": user.subscription_status,
        "subscription_source": subscription_source(user) if premium else None,
        "subscription_expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
    }


def _first_workout_plan_is_free(user) -> bool:
    from app.modules.training.domain.models import WorkoutPlan
    return WorkoutPlan.query.filter_by(user_id=user.id).first() is None


def _current_user():
    from app.modules.identity.domain.models import User
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:  # noqa: BLE001 - bad/expired token: the route's own @jwt_required answers 401
        return None
    if not identity:
        return None
    try:
        return db.session.get(User, uuid.UUID(str(identity)))
    except ValueError:
        return None


def init_subscription_gate(app) -> None:
    @app.before_request
    def subscription_gate():
        if request.method == "OPTIONS" or not enforcement_enabled():
            return None
        path = request.path.rstrip("/") or "/"

        if freemium_enabled():
            feature = PREMIUM_ROUTES.get((request.method, path))
            if not feature:
                return None
            user = _current_user()
            if user is None or user_has_access(user):
                return None
            if feature == "workout_plan" and _first_workout_plan_is_free(user):
                return None
            return jsonify({
                "code": "premium_required",
                "feature": feature,
                "msg": "Esse recurso faz parte do FitGen Premium.",
                **access_payload(user),
            }), 402

        # Hard gate (FREEMIUM=false)
        if not request.path.startswith("/api/") or request.path.startswith(EXEMPT_PREFIXES):
            return None
        if request.method == "GET" and request.path in EXEMPT_EXACT_GET:
            return None
        user = _current_user()
        if user is None or user_has_access(user):
            return None
        return jsonify({
            "code": "subscription_required",
            "msg": "Assinatura necessária para usar o FitGen.",
            **access_payload(user),
        }), 402
