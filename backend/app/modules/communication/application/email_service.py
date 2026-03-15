import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from flask import current_app
import os

class EmailService:
    def __init__(self):
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv('BREVO_API_KEY')
        self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        self.sender = {
            "name": os.getenv('BREVO_SENDER_NAME', 'FitGen'),
            "email": os.getenv('BREVO_SENDER_EMAIL', 'no-reply@fitgen.com')
        }

    def send_password_reset_email(self, to_email, reset_link):
        """
        Send password reset email via Brevo
        """
        subject = "Recuperação de Senha - FitGen"
        html_content = f"""
        <html>
            <body>
                <h1>Recuperação de Senha</h1>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir sua senha no FitGen.</p>
                <p>Clique no link abaixo para criar uma nova senha:</p>
                <p><a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Redefinir Senha</a></p>
                <p>Se você não solicitou isso, pode ignorar este email.</p>
                <p>O link expira em 1 hora.</p>
                <br>
                <p>Atenciosamente,</p>
                <p>Equipe FitGen</p>
            </body>
        </html>
        """
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender=self.sender,
            subject=subject,
            html_content=html_content
        )

        try:
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            current_app.logger.info(f"Email sent successfully to {to_email}. Message ID: {api_response.message_id}")
            return True
        except ApiException as e:
            current_app.logger.error(f"Exception when calling TransactionalEmailsApi->send_transac_email: {e}")
            return False
            return False

    def send_welcome_email(self, to_email, name, password):
        """
        Send welcome email with credentials via Brevo
        """
        subject = "Bem-vindo ao FitGen - Seus Acessos"
        html_content = f"""
        <html>
            <body>
                <h1>Bem-vindo ao FitGen!</h1>
                <p>Olá {name},</p>
                <p>Estamos muito felizes em ter você conosco. Sua assinatura foi confirmada!</p>
                <p>Aqui estão suas credenciais de acesso:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Login:</strong> {to_email}</p>
                    <p><strong>Senha:</strong> {password}</p>
                </div>
                <p>Recomendamos que você altere sua senha após o primeiro acesso.</p>
                <p><a href="https://fitgen.suacozinha.site/login" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Acessar FitGen</a></p>
                <br>
                <p>Se tiver alguma dúvida, responda a este email.</p>
                <p>Atenciosamente,</p>
                <p>Equipe FitGen</p>
            </body>
        </html>
        """
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": name}],
            sender=self.sender,
            subject=subject,
            html_content=html_content
        )

        try:
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            current_app.logger.info(f"Welcome email sent successfully to {to_email}. Message ID: {api_response.message_id}")
            return True
        except ApiException as e:
            current_app.logger.error(f"Exception when calling TransactionalEmailsApi->send_transac_email: {e}")
            return False
