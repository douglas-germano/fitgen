"""Error monitoring with Sentry (project `fitgen-backend`).

Off unless `SENTRY_DSN` is set, so tests and local runs without it send nothing.
Optional: `SENTRY_ENVIRONMENT` (default: FLASK_ENV or "production"),
`SENTRY_TRACES_SAMPLE_RATE` (default 0.1; 0 disables performance tracing) and
`SENTRY_AI_TRACES_SAMPLE_RATE` (default 1.0): AI routes and background AI jobs are few and
slow (5-60 s), so they are all traced while the fast routes keep the lower rate. Each
OpenRouter call is a `gen_ai.chat` span with feature, model, tokens and cost
(app/modules/coach/infrastructure/ai_service.py).

Privacy: no default PII (no IPs, cookies or request bodies). The only user data attached
is the FitGen user id taken from the JWT, so an error can be matched to an account.
"""
import os

# Routes that call the AI (method, path). Background AI jobs name their transaction "ai.*".
AI_ROUTES = {
    ("POST", "/api/chat"),
    ("POST", "/api/diet/generate"),
    ("POST", "/api/diet/regenerate-day"),
    ("POST", "/api/nutrition/estimate"),
    ("POST", "/api/nutrition/analyze"),
    ("POST", "/api/onboarding/generate-workout"),
}
AI_TRANSACTION_PREFIX = "ai."


def _rate(name, default):
    try:
        return min(1.0, max(0.0, float(os.getenv(name, str(default)))))
    except ValueError:
        return default


def make_traces_sampler(default_rate, ai_rate):
    """100% (ai_rate) for AI work, default_rate for the rest, following the caller's
    decision when the request continues a trace started in the app."""
    def sampler(ctx):
        environ = ctx.get("wsgi_environ") or {}
        route = (environ.get("REQUEST_METHOD"), (environ.get("PATH_INFO") or "").rstrip("/"))
        name = (ctx.get("transaction_context") or {}).get("name") or ""
        if route in AI_ROUTES or name.startswith(AI_TRANSACTION_PREFIX):
            return ai_rate
        parent = ctx.get("parent_sampled")
        if parent is not None:
            return 1.0 if parent else 0.0
        return default_rate
    return sampler


def init_monitoring(app) -> bool:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration

    traces_rate = _rate("SENTRY_TRACES_SAMPLE_RATE", 0.1)
    ai_rate = _rate("SENTRY_AI_TRACES_SAMPLE_RATE", 1.0)

    sentry_sdk.init(
        dsn=dsn,
        integrations=[FlaskIntegration()],
        environment=os.getenv("SENTRY_ENVIRONMENT") or os.getenv("FLASK_ENV") or "production",
        release=os.getenv("SENTRY_RELEASE") or None,
        traces_sampler=make_traces_sampler(traces_rate, ai_rate),
        send_default_pii=False,
    )

    from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

    @app.before_request
    def _tag_sentry_user():
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            user_id = None
        sentry_sdk.set_user({"id": str(user_id)} if user_id else None)

    app.logger.info("Sentry monitoring enabled")
    return True
