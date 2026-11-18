"""Sentry monitoring: off without a DSN; with one, errors carry only the JWT user id."""
import os
os.environ.setdefault("SECRET_KEY", "isolated-monitoring-test")
os.environ.setdefault("JWT_SECRET_KEY", "isolated-monitoring-jwt-secret-32-chars")
os.environ.setdefault("DATABASE_URL", "sqlite://")
import unittest
from unittest import mock

import sentry_sdk
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, create_access_token

from app.shared.monitoring import init_monitoring

FAKE_DSN = "https://public@o0.ingest.us.sentry.io/0"


def make_app():
    app = Flask(__name__)
    app.config.update(JWT_SECRET_KEY="monitoring-test-jwt-secret-32-characters")
    JWTManager(app)

    @app.get("/boom")
    def boom():
        raise RuntimeError("boom")

    @app.get("/ok")
    def ok():
        return jsonify(ok=True)

    return app


class MonitoringTest(unittest.TestCase):
    def tearDown(self):
        sentry_sdk.init(dsn=None)

    def test_disabled_without_dsn(self):
        with mock.patch.dict("os.environ", {"SENTRY_DSN": ""}):
            self.assertFalse(init_monitoring(make_app()))

    def test_captures_errors_with_user_id_only(self):
        events = []
        app = make_app()
        with mock.patch.dict("os.environ", {"SENTRY_DSN": FAKE_DSN}):
            self.assertTrue(init_monitoring(app))
        sentry_sdk.get_client().options["before_send"] = lambda event, hint: events.append(event) or None

        with app.app_context():
            token = create_access_token(identity="user-123")
        client = app.test_client()
        self.assertEqual(client.get("/ok").status_code, 200)
        self.assertEqual(client.get("/boom", headers={"Authorization": f"Bearer {token}"}).status_code, 500)

        # Flask's own error log can add a second, identical report; Sentry groups both in one issue.
        errors = [e for e in events if e.get("exception")]
        self.assertGreaterEqual(len(errors), 1)
        self.assertEqual(errors[0]["exception"]["values"][-1]["value"], "boom")
        for event in events:
            self.assertEqual(event["user"], {"id": "user-123"})
            self.assertNotIn("cookies", event.get("request", {}))

    def test_bad_token_does_not_break_request(self):
        app = make_app()
        with mock.patch.dict("os.environ", {"SENTRY_DSN": FAKE_DSN}):
            init_monitoring(app)
        res = app.test_client().get("/ok", headers={"Authorization": "Bearer not-a-jwt"})
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
