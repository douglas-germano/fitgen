"""Error monitoring with Sentry (project `fitgen-backend`).

Off unless `SENTRY_DSN` is set, so tests and local runs without it send nothing.
Optional: `SENTRY_ENVIRONMENT` (default: FLASK_ENV or "production") and
`SENTRY_TRACES_SAMPLE_RATE` (default 0.1; 0 disables performance tracing).

Privacy: no default PII (no IPs, cookies or request bodies). The only user data attached
is the FitGen user id taken from the JWT, so an error can be matched to an account.
"""
import os


def init_monitoring(app) -> bool:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration

    try:
        traces_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
    except ValueError:
        traces_rate = 0.1

    sentry_sdk.init(
        dsn=dsn,
        integrations=[FlaskIntegration()],
        environment=os.getenv("SENTRY_ENVIRONMENT") or os.getenv("FLASK_ENV") or "production",
        release=os.getenv("SENTRY_RELEASE") or None,
        traces_sample_rate=traces_rate,
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
