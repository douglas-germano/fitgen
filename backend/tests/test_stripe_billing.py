"""Stripe web checkout webhook contracts against an isolated database."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-stripe-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-stripe-jwt-secret-32-characters')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import hashlib
import hmac
import json
import time
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock
from flask import Flask
from app.shared.extensions import db
from app.shared import model_registry  # noqa: F401  (registers every model for the mapper)
from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import PaymentHistory, Subscription
from app.modules.identity.application import stripe_billing
from app.modules.communication.interface.routes_webhooks import webhooks_bp

SECRET = 'whsec_test_secret'


def ts(days=0):
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def subscription(status='active', end_days=30, pm_type='card', **extra):
    return {
        'object': 'subscription', 'id': 'sub_1', 'customer': 'cus_1', 'status': status,
        'metadata': {'user_id': extra.pop('user_id', None)} if extra.get('with_meta', True) else {},
        'trial_end': ts(7) if status == 'trialing' else None,
        'items': {'data': [{'current_period_end': ts(end_days)}]},
        'default_payment_method': {'type': pm_type} if pm_type else None,
        'cancel_at_period_end': extra.pop('cancel_at_period_end', False),
        'ended_at': ts() if status == 'canceled' else None,
    }


class StripeWebhookTests(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {'STRIPE_WEBHOOK_SECRET': SECRET}, clear=False)
        patcher.start(); self.addCleanup(patcher.stop)
        self.app = Flask(__name__)
        self.app.config.update(SQLALCHEMY_DATABASE_URI='sqlite://', TESTING=True)
        db.init_app(self.app)
        self.app.register_blueprint(webhooks_bp, url_prefix='/webhooks')
        self.ctx = self.app.app_context(); self.ctx.push()
        self.addCleanup(self.ctx.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[n] for n in ['users', 'subscriptions', 'payment_history']])
        self.user = User(name='Ana', email='ana@test.invalid', password_hash='x', subscription_status='free')
        db.session.add(self.user); db.session.commit()
        db.session.add(Subscription(user_id=self.user.id, plan_type='free', status='incomplete', stripe_customer_id='cus_1'))
        db.session.commit()
        self.client = self.app.test_client()
        self.uid = str(self.user.id)

    def post(self, event, secret=SECRET):
        payload = json.dumps(event)
        t = int(time.time())
        sig = hmac.new(secret.encode(), f'{t}.{payload}'.encode(), hashlib.sha256).hexdigest()
        return self.client.post('/webhooks/stripe', data=payload, content_type='application/json',
                                headers={'Stripe-Signature': f't={t},v1={sig}'})

    def event(self, type_, obj):
        return {'id': 'evt_1', 'object': 'event', 'type': type_, 'data': {'object': obj}}

    def test_rejects_bad_signature(self):
        self.assertEqual(self.post(self.event('invoice.paid', {}), secret='whsec_wrong').status_code, 400)

    def test_trial_start_unlocks_until_trial_end_without_ledger_entry(self):
        res = self.post(self.event('customer.subscription.created', subscription('trialing', user_id=self.uid)))
        self.assertEqual(res.get_json()['msg'], 'trialing')
        self.assertEqual(self.user.subscription_status, 'active')
        self.assertTrue(timedelta(days=6) < self.user.subscription_expires_at - datetime.utcnow() <= timedelta(days=7))
        self.assertEqual(PaymentHistory.query.count(), 0)
        self.assertEqual(Subscription.query.first().stripe_subscription_id, 'sub_1')

    def test_paid_pix_invoice_is_recorded_once(self):
        invoice = {'object': 'invoice', 'id': 'in_1', 'customer': 'cus_1', 'amount_paid': 2990, 'currency': 'brl',
                   'parent': {'subscription_details': {'subscription': 'sub_1'}},
                   'lines': {'data': [{'period': {'end': ts(30)}}]}, 'status_transitions': {'paid_at': ts()}}
        fake = mock.Mock()
        fake.v1.subscriptions.retrieve.return_value = subscription(pm_type='pix')
        with mock.patch.object(stripe_billing, '_client', return_value=fake):
            self.assertEqual(self.post(self.event('invoice.paid', invoice)).get_json()['msg'], 'paid')
            self.post(self.event('invoice.paid', invoice))  # duplicate delivery
        payments = PaymentHistory.query.all()
        self.assertEqual(len(payments), 1)
        self.assertEqual(str(payments[0].amount), '29.90')
        self.assertEqual(payments[0].payment_method, 'pix')
        self.assertEqual(self.user.subscription_status, 'active')

    def test_cancel_at_period_end_keeps_access_until_expiry(self):
        res = self.post(self.event('customer.subscription.updated', subscription(user_id=self.uid, cancel_at_period_end=True)))
        self.assertEqual(res.get_json()['msg'], 'canceling')
        self.assertEqual(self.user.subscription_status, 'canceled')
        self.assertGreater(self.user.subscription_expires_at, datetime.utcnow() + timedelta(days=29))

    def test_deleted_subscription_ends_access(self):
        self.post(self.event('customer.subscription.updated', subscription(user_id=self.uid)))
        self.post(self.event('customer.subscription.deleted', subscription('canceled', user_id=self.uid)))
        self.assertEqual(self.user.subscription_status, 'canceled')
        self.assertLessEqual(self.user.subscription_expires_at, datetime.utcnow() + timedelta(seconds=5))

    def test_payment_failure_marks_past_due_and_unknown_customers_are_ignored(self):
        self.post(self.event('invoice.payment_failed', {'object': 'invoice', 'customer': 'cus_1'}))
        self.assertEqual(self.user.subscription_status, 'past_due')
        res = self.post(self.event('invoice.payment_failed', {'object': 'invoice', 'customer': 'cus_other'}))
        self.assertEqual(res.get_json()['msg'], 'ignored:unknown-user')


if __name__ == '__main__':
    unittest.main()
