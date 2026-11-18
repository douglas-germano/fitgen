"""Brevo email service: payload, config and failure handling (no network)."""
import os
import unittest
from unittest import mock

import requests

from app.modules.communication.application import email_service
from app.modules.communication.application.email_service import EmailService, missing_config


def ok_response():
    resp = mock.Mock(status_code=201, content=b'{"messageId":"<id@brevo>"}', text='')
    resp.json.return_value = {"messageId": "<id@brevo>"}
    return resp


class EmailServiceTests(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {"BREVO_API_KEY": "xkeysib-test"}, clear=False)
        patcher.start(); self.addCleanup(patcher.stop)
        for var in ("BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "SITE_URL"):
            os.environ.pop(var, None)

    @mock.patch.object(email_service.requests, "post", return_value=ok_response())
    def test_reset_email_payload(self, post):
        self.assertTrue(EmailService().send_password_reset_email("ana@test.invalid", "https://admin.fitgen.pro/reset-password?token=abc"))
        url, kwargs = post.call_args.args[0], post.call_args.kwargs
        self.assertEqual(url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(kwargs["headers"]["api-key"], "xkeysib-test")
        body = kwargs["json"]
        self.assertEqual(body["sender"], {"name": "FitGen", "email": "no-reply@fitgen.pro"})
        self.assertEqual(body["to"], [{"email": "ana@test.invalid"}])
        self.assertIn("reset-password?token=abc", body["htmlContent"])
        self.assertIn("reset-password?token=abc", body["textContent"])
        self.assertIn("https://fitgen.pro/brand/fitgen-logo.png", body["htmlContent"])
        self.assertNotIn("suacozinha", body["htmlContent"])

    @mock.patch.object(email_service.requests, "post", return_value=ok_response())
    def test_welcome_email_escapes_user_input(self, post):
        EmailService().send_welcome_email("ana@test.invalid", "<b>Ana</b> Souza", "p<w>")
        html = post.call_args.kwargs["json"]["htmlContent"]
        self.assertNotIn("<b>Ana</b>", html)
        self.assertIn("&lt;b&gt;Ana&lt;/b&gt;", html)
        self.assertIn("p&lt;w&gt;", html)

    @mock.patch.object(email_service.requests, "post")
    def test_missing_key_sends_nothing(self, post):
        os.environ.pop("BREVO_API_KEY")
        self.assertEqual(missing_config(), ["BREVO_API_KEY"])
        self.assertFalse(EmailService().send_password_reset_email("ana@test.invalid", "https://x"))
        post.assert_not_called()

    @mock.patch.object(email_service.requests, "post", side_effect=requests.ConnectionError("down"))
    def test_network_error_returns_false(self, _post):
        self.assertFalse(EmailService().send_password_reset_email("ana@test.invalid", "https://x"))

    @mock.patch.object(email_service.requests, "post")
    def test_brevo_rejection_returns_false(self, post):
        post.return_value = mock.Mock(status_code=400, text='{"code":"invalid_parameter"}')
        self.assertFalse(EmailService().send_password_reset_email("ana@test.invalid", "https://x"))


if __name__ == "__main__":
    unittest.main()
