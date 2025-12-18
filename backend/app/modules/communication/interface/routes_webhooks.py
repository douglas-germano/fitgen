from flask import Blueprint, request, jsonify, current_app
from app.shared.extensions import db
from app.modules.identity.domain.models import User, UserProfile
from app.modules.identity.domain.subscription import Subscription
from app.modules.communication.application.email_service import EmailService
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import secrets
import uuid

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/kiwify', methods=['POST'])
def kiwify_webhook():
    """
    Webhook handler for Kiwify payments
    Expected payload structure (simplified based on typical Kiwify payloads):
    {
        "order_status": "paid",
        "customer": {
            "email": "customer@email.com",
            "full_name": "Customer Name",
            "mobile": "+55..."
        },
        "subscription_id": "..." (optional)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No payload received"}), 400

        # Log payload for debugging (be careful with PII in production logs)
        current_app.logger.info(f"Kiwify Webhook received: {data}")

        # Verify event type
        event_type = data.get('webhook_event_type')
        order_status = data.get('order_status')
        
        current_app.logger.info(f"Processing Kiwify event: {event_type} | Order Status: {order_status}")

        customer = data.get('Customer', data.get('customer', {}))
        email = customer.get('email')
        name = customer.get('full_name', customer.get('name', 'Usuário FitGen'))
        
        if not email:
            current_app.logger.error("No email in Kiwify payload")
            return jsonify({"msg": "Invalid payload"}), 400

        # Find or Create User
        user = User.query.filter_by(email=email).first()
        is_new_user = False
        generated_password = None

        if not user:
            # Only create user on approved/paid events
            if event_type not in ['order_approved', 'subscription_renewed'] and order_status != 'paid':
                current_app.logger.info(f"Ignoring non-creation event for unknown user: {email}")
                return jsonify({"msg": "Ignored"}), 200

            is_new_user = True
            generated_password = secrets.token_urlsafe(8)
            
            user = User(
                email=email,
                name=name,
                password_hash=generate_password_hash(generated_password),
                role='user',
                subscription_status='active',
                onboarding_completed=False 
            )
            db.session.add(user)
            db.session.flush()
            
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
            
            current_app.logger.info(f"Created new user via Kiwify: {email}")
        
        # Handle Events
        if event_type in ['order_approved', 'subscription_renewed'] or order_status == 'paid':
            user.subscription_status = 'active'
            # Default to +30 days if expiration not mapped
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Send welcome email only for new users
            if is_new_user:
                email_service = EmailService()
                email_service.send_welcome_email(email, name, generated_password)
                
            current_app.logger.info(f"Access granted/renewed for: {email}")

        elif event_type == 'subscription_canceled':
            # Mark as canceled but don't revoke access immediately (unless refund)
            # Usually we let them finish the period.
            # But let's set status to 'canceled' to indicate no future renewal.
            user.subscription_status = 'canceled'
            current_app.logger.info(f"Subscription canceled for: {email}")

        elif event_type in ['order_refunded', 'chargeback']:
            # Revoke access immediately
            user.subscription_status = 'suspended'
            user.subscription_expires_at = datetime.utcnow()
            current_app.logger.info(f"Access revoked (refund/chargeback) for: {email}")
        
        elif event_type == 'subscription_late':
             # Notify or suspend? Let's keep active but maybe mark status
             user.subscription_status = 'past_due'
             current_app.logger.info(f"Subscription past due for: {email}")

        db.session.commit()
        return jsonify({"msg": "Webhook processed successfully"}), 200

    except Exception as e:
        current_app.logger.error(f"Error processing Kiwify webhook: {e}")
        db.session.rollback()
        return jsonify({"msg": "Error processing webhook"}), 500


@webhooks_bp.route('/herospark', methods=['POST'])
def herospark_webhook():
    """
    Webhook handler for Herospark payments
    
    Estrutura do payload Herospark:
    - buyer: informações do comprador (email, full_name, phone, etc)
    - payments: array de pagamentos com status e valores
    - recurrency: informações da recorrência (status, next_invoice_at, etc)
    - product: informações do produto
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No payload received"}), 400
        
        # Log detalhado para debug
        current_app.logger.info("="*80)
        current_app.logger.info("HEROSPARK WEBHOOK RECEIVED")
        current_app.logger.info(f"Payload: {data}")
        current_app.logger.info("="*80)
        
        # Extrair informações principais
        buyer = data.get('buyer', {})
        payments = data.get('payments', [])
        recurrency = data.get('recurrency', {})
        
        email = buyer.get('email')
        name = buyer.get('full_name', 'Usuário FitGen')
        phone = buyer.get('phone_raw')
        
        if not email:
            current_app.logger.error("No email in Herospark payload")
            return jsonify({"msg": "Invalid payload - missing email"}), 400
        
        if not payments:
            current_app.logger.error("No payments in Herospark payload")
            return jsonify({"msg": "Invalid payload - missing payments"}), 400
        
        # Pegar primeiro pagamento
        payment = payments[0]
        payment_status = payment.get('status')
        payment_method = payment.get('method')
        refunded_at = payment.get('refundedAt')
        paid_at = payment.get('paidAt')
        
        # Informações da recorrência
        recurrency_status = recurrency.get('status')
        canceled_at = recurrency.get('canceled_at')
        next_invoice = recurrency.get('next_invoice_at')
        recurrency_period = recurrency.get('period', 'monthly')
        
        current_app.logger.info(
            f"Processing Herospark: email={email}, "
            f"payment_status={payment_status}, "
            f"recurrency_status={recurrency_status}"
        )
        
        # Buscar ou criar usuário
        user = User.query.filter_by(email=email).first()
        is_new_user = False
        generated_password = None
        
        if not user:
            # Criar usuário apenas se pagamento foi aprovado
            if payment_status != 'paid':
                current_app.logger.info(f"Ignoring non-paid event for unknown user: {email}")
                return jsonify({"msg": "Ignored - user not found and payment not confirmed"}), 200
            
            is_new_user = True
            generated_password = secrets.token_urlsafe(8)
            
            # Verificar se telefone já existe (campo tem constraint UNIQUE)
            phone_to_save = None
            if phone:
                existing_phone_user = User.query.filter_by(phone=phone).first()
                if not existing_phone_user:
                    phone_to_save = phone
                else:
                    current_app.logger.warning(
                        f"Phone {phone} already exists for user {existing_phone_user.email}. "
                        f"Creating new user without phone."
                    )
            
            user = User(
                email=email,
                name=name,
                password_hash=generate_password_hash(generated_password),
                role='user',
                subscription_status='active',
                onboarding_completed=False,
                phone=phone_to_save
            )
            db.session.add(user)
            db.session.flush()
            
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
            
            current_app.logger.info(f"Created new user via Herospark: {email}")
        
        # Processar eventos baseado no status
        
        # 1. PAGAMENTO APROVADO
        if payment_status == 'paid' and paid_at and not refunded_at:
            user.subscription_status = 'active'
            
            # Calcular data de expiração
            if next_invoice:
                # Usar próxima data de faturamento
                try:
                    # next_invoice vem como "YYYY-MM-DD"
                    user.subscription_expires_at = datetime.strptime(next_invoice, '%Y-%m-%d')
                except ValueError:
                    # Fallback: calcular baseado no período
                    user.subscription_expires_at = _calculate_expiration_date(recurrency_period)
            else:
                # Calcular baseado no período
                user.subscription_expires_at = _calculate_expiration_date(recurrency_period)
            
            # Enviar email de boas-vindas para novos usuários
            if is_new_user:
                email_service = EmailService()
                email_service.send_welcome_email(email, name, generated_password)
            
            current_app.logger.info(
                f"Access granted for {email}. "
                f"Expires at: {user.subscription_expires_at}"
            )
        
        # 2. REEMBOLSO
        elif refunded_at or payment_status == 'refunded':
            user.subscription_status = 'suspended'
            user.subscription_expires_at = datetime.utcnow()
            current_app.logger.info(f"Access revoked (refund) for: {email}")
        
        # 3. ASSINATURA CANCELADA
        elif canceled_at or recurrency_status == 'canceled':
            user.subscription_status = 'canceled'
            current_app.logger.info(f"Subscription canceled for: {email}")
        
        # 4. ASSINATURA ATIVA/RENOVADA
        elif recurrency_status == 'active':
            user.subscription_status = 'active'
            if next_invoice:
                try:
                    user.subscription_expires_at = datetime.strptime(next_invoice, '%Y-%m-%d')
                except ValueError:
                    user.subscription_expires_at = _calculate_expiration_date(recurrency_period)
            current_app.logger.info(f"Subscription renewed for: {email}")
        
        db.session.commit()
        return jsonify({
            "msg": "Webhook processed successfully",
            "user_email": email,
            "status": user.subscription_status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing Herospark webhook: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({"msg": f"Error processing webhook: {str(e)}"}), 500


def _calculate_expiration_date(period):
    """
    Calcula data de expiração baseada no período da assinatura
    
    Args:
        period: 'monthly', 'quarterly', 'yearly', 'unitary'
    
    Returns:
        datetime: Data de expiração
    """
    now = datetime.utcnow()
    
    if period == 'monthly':
        return now + timedelta(days=30)
    elif period == 'quarterly':
        return now + timedelta(days=90)
    elif period == 'yearly':
        return now + timedelta(days=365)
    else:  # unitary ou outro
        return now + timedelta(days=30)  # Default 30 dias
