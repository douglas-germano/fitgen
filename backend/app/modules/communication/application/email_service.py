"""Transactional email through Brevo's HTTP API (https://api.brevo.com/v3/smtp/email).

Env:
  BREVO_API_KEY       required; without it nothing is sent (logged as an error, send returns False)
  BREVO_SENDER_EMAIL  default no-reply@fitgen.pro (must be a sender verified in Brevo)
  BREVO_SENDER_NAME   default FitGen
  SITE_URL            default https://fitgen.pro (logo, links in the footer)
"""
import logging
import os
from html import escape

import requests
from flask import current_app, has_app_context

_module_logger = logging.getLogger(__name__)


def _log():
    return current_app.logger if has_app_context() else _module_logger

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT_SECONDS = 10

# Volt Fit palette (frontend/src/app/globals.css)
INK = "#111214"
MUTED = "#5b6168"
PAGE_BG = "#f3f5f7"
CARD_BG = "#ffffff"
BORDER = "#e3e6e9"
VOLT = "#b5ef52"


def _site_url():
    return os.getenv("SITE_URL", "https://fitgen.pro").rstrip("/")


def missing_config():
    """Names of the Brevo env vars that are not set (empty list = ready to send)."""
    return [name for name in ("BREVO_API_KEY",) if not os.getenv(name)]


def _layout(title, intro_html, button_label=None, button_url=None, after_html="", preheader=""):
    site = _site_url()
    button = ""
    if button_label and button_url:
        button = f"""
              <tr><td style="padding:8px 0 24px 0;">
                <a href="{escape(button_url, quote=True)}" style="display:inline-block;background:{VOLT};color:{INK};font-weight:700;font-size:16px;line-height:20px;text-decoration:none;padding:14px 28px;border-radius:999px;">{escape(button_label)}</a>
              </td></tr>"""
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:{PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAGE_BG};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 0 20px 4px;">
        <img src="{site}/brand/fitgen-logo.png" width="126" height="36" alt="FitGen" style="display:block;border:0;">
      </td></tr>
      <tr><td style="background:{CARD_BG};border:1px solid {BORDER};border-radius:20px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{INK};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:24px;line-height:30px;font-weight:800;letter-spacing:-0.4px;padding:0 0 16px 0;">{escape(title)}</td></tr>
          <tr><td style="font-size:16px;line-height:24px;color:{INK};padding:0 0 16px 0;">{intro_html}</td></tr>{button}
          <tr><td style="font-size:14px;line-height:21px;color:{MUTED};">{after_html}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:{MUTED};">
        FitGen · seu treino e sua dieta com IA<br>
        <a href="{site}" style="color:{MUTED};">{site.replace("https://", "")}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


class EmailService:
    def __init__(self):
        self.api_key = os.getenv("BREVO_API_KEY")
        self.sender = {
            "name": os.getenv("BREVO_SENDER_NAME", "FitGen"),
            "email": os.getenv("BREVO_SENDER_EMAIL", "no-reply@fitgen.pro"),
        }

    def _send(self, to_email, subject, html, text, to_name=None, tag=None):
        """POST to Brevo. Never raises: returns True when Brevo accepted the message."""
        if not self.api_key:
            _log().error("Email not sent to %s (%s): BREVO_API_KEY is not set", to_email, subject)
            return False
        recipient = {"email": to_email}
        if to_name:
            recipient["name"] = to_name
        payload = {
            "sender": self.sender,
            "to": [recipient],
            "subject": subject,
            "htmlContent": html,
            "textContent": text,
        }
        if tag:
            payload["tags"] = [tag]
        try:
            resp = requests.post(
                BREVO_SEND_URL,
                json=payload,
                headers={"api-key": self.api_key, "accept": "application/json"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as e:
            _log().error("Brevo request failed for %s (%s): %s", to_email, subject, e)
            return False
        if resp.status_code >= 300:
            _log().error("Brevo rejected email to %s (%s): HTTP %s %s",
                         to_email, subject, resp.status_code, resp.text[:500])
            return False
        try:
            message_id = resp.json().get("messageId")
        except ValueError:
            message_id = None
        _log().info("Email sent to %s (%s), messageId=%s", to_email, subject, message_id)
        return True

    def send_password_reset_email(self, to_email, reset_link):
        subject = "Redefina sua senha do FitGen"
        html = _layout(
            title="Redefinir senha",
            preheader="Use o link para criar uma nova senha. Ele vale por 1 hora.",
            intro_html="Recebemos um pedido para redefinir a senha da sua conta FitGen. "
                       "Toque no botão abaixo para criar uma nova senha.",
            button_label="Criar nova senha",
            button_url=reset_link,
            after_html="O link vale por 1 hora. Se você não pediu isso, pode ignorar este email: "
                       "sua senha continua a mesma.",
        )
        text = (
            "Redefinir senha\n\n"
            "Recebemos um pedido para redefinir a senha da sua conta FitGen.\n"
            f"Crie uma nova senha neste link: {reset_link}\n\n"
            "O link vale por 1 hora. Se você não pediu isso, pode ignorar este email.\n"
        )
        return self._send(to_email, subject, html, text, tag="password-reset")

    def send_welcome_email(self, to_email, name, password):
        """Welcome + generated credentials (accounts created by the Kiwify/Herospark webhooks)."""
        first_name = (name or "").split(" ")[0] or "atleta"
        site = _site_url()
        subject = "Bem-vindo ao FitGen: seus dados de acesso"
        html = _layout(
            title=f"Bem-vindo, {first_name}!",
            preheader="Sua assinatura foi confirmada. Aqui estão seus dados de acesso.",
            intro_html=(
                "Sua assinatura foi confirmada. Baixe o app FitGen e entre com estes dados:"
                f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
                f'style="margin:16px 0 0 0;background:{PAGE_BG};border-radius:14px;">'
                f'<tr><td style="padding:14px 16px;font-size:15px;line-height:24px;">'
                f"<strong>Email:</strong> {escape(to_email)}<br>"
                f"<strong>Senha:</strong> {escape(password)}</td></tr></table>"
            ),
            button_label="Baixar o app",
            button_url=site,
            after_html="Recomendamos trocar a senha depois do primeiro acesso, em Perfil. "
                       "Dúvidas? É só responder este email.",
        )
        text = (
            f"Bem-vindo, {first_name}!\n\n"
            "Sua assinatura foi confirmada. Baixe o app FitGen e entre com estes dados:\n"
            f"Email: {to_email}\nSenha: {password}\n\n"
            f"Baixe o app: {site}\n\n"
            "Recomendamos trocar a senha depois do primeiro acesso.\n"
        )
        return self._send(to_email, subject, html, text, to_name=name, tag="welcome")
