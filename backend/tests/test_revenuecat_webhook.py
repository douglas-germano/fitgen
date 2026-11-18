"""RevenueCat webhook contracts against an isolated database."""
import os
os.environ.setdefault('SECRET_KEY', 'isolated-rc-test')
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-rc-jwt-secret-32-characters')
os.environ.setdefault('DATABASE_URL', 'sqlite://')
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock
from flask import Flask
from app.shared.extensions import db
from app.shared import model_registry  # noqa: F401  (registers every model for the mapper)
from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import PaymentHistory, Subscription
from app.modules.communication.interface.routes_webhooks import webhooks_bp

AUTH = 'Bearer rc-test-secret'


def ms(days=0):
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp() * 1000)


class RevenueCatWebhookTests(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {'REVENUECAT_WEBHOOK_AUTH': AUTH}, clear=False)
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
        self.user = User(name='Ana', email='ana@test.invalid', password_hash='x', subscription_status='active')
        db.session.add(self.user); db.session.commit()
        self.client = self.app.test_client()

    def send(self, type_, auth=AUTH, **fields):
        event = dict(type=type_, app_user_id=str(self.user.id), store='APP_STORE', environment='PRODUCTION',
                     currency='BRL', price_in_purchased_currency=19.9, price=3.6, period_type='NORMAL',
                     purchased_at_ms=ms(), expiration_at_ms=ms(30), transaction_id='tx-1',
                     original_transaction_id='otx-1', event_timestamp_ms=ms())
        event.update(fields)
        headers = {'Authorization': auth} if auth is not None else {}
        return self.client.post('/webhooks/revenuecat', json={'event': event}, headers=headers)

    def payments(self):
        return PaymentHistory.query.order_by(PaymentHistory.created_at).all()

    def sub(self):
        return Subscription.query.filter_by(user_id=self.user.id).first()

    # --- auth ---------------------------------------------------------
    def test_rejects_missing_or_wrong_authorization(self):
        self.assertEqual(self.send('INITIAL_PURCHASE', auth=None).status_code, 401)
        self.assertEqual(self.send('INITIAL_PURCHASE', auth='Bearer nope').status_code, 401)
        self.assertEqual(PaymentHistory.query.count(), 0)

    def test_refuses_when_secret_not_configured(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('REVENUECAT_WEBHOOK_AUTH', None)
            self.assertEqual(self.send('INITIAL_PURCHASE').status_code, 503)

    # --- purchases ----------------------------------------------------
    def test_initial_purchase_records_payment_and_grants_access(self):
        self.assertEqual(self.send('INITIAL_PURCHASE').status_code, 200)
        payment, = self.payments()
        self.assertEqual((float(payment.amount), payment.currency, payment.status, payment.payment_method),
                         (19.9, 'BRL', 'completed', 'app_store'))
        sub = self.sub()
        self.assertEqual((sub.status, float(sub.price_monthly), sub.external_subscription_id), ('active', 19.9, 'otx-1'))
        db.session.refresh(self.user)
        self.assertEqual(self.user.subscription_status, 'active')
        self.assertIsNotNone(self.user.subscription_expires_at)

    def test_duplicate_delivery_is_idempotent_and_renewal_adds_a_payment(self):
        self.send('INITIAL_PURCHASE'); self.send('INITIAL_PURCHASE')
        self.assertEqual(len(self.payments()), 1)
        self.send('RENEWAL', transaction_id='tx-2')
        self.assertEqual(len(self.payments()), 2)

    def test_free_trial_creates_no_payment_and_no_revenue(self):
        self.send('INITIAL_PURCHASE', period_type='TRIAL', price_in_purchased_currency=0, price=0)
        self.assertEqual(PaymentHistory.query.count(), 0)
        self.assertEqual(self.sub().status, 'active')
        self.assertEqual(float(self.sub().price_monthly or 0), 0.0)

    def test_foreign_currency_is_stored_in_its_own_currency(self):
        self.send('INITIAL_PURCHASE', currency='USD', price_in_purchased_currency=3.99)
        self.assertEqual(self.payments()[0].currency, 'USD')

    def test_period_is_derived_from_the_billing_window(self):
        self.send('INITIAL_PURCHASE', price_in_purchased_currency=199.0, expiration_at_ms=ms(365))
        self.assertAlmostEqual(float(self.sub().price_monthly), 16.58, places=2)

    # --- lifecycle ----------------------------------------------------
    def test_cancellation_keeps_access_until_expiry_without_new_payment(self):
        self.send('INITIAL_PURCHASE')
        self.send('CANCELLATION', cancel_reason='UNSUBSCRIBE')
        db.session.refresh(self.user)
        self.assertEqual(self.user.subscription_status, 'canceled')
        self.assertEqual(len(self.payments()), 1)
        self.assertEqual(self.sub().status, 'cancelled')
        self.assertIsNotNone(self.sub().cancelled_at)

    def test_refund_records_a_refunded_row_and_never_suspends(self):
        self.send('INITIAL_PURCHASE')
        self.send('CANCELLATION', cancel_reason='CUSTOMER_SUPPORT', transaction_id='tx-1', price_in_purchased_currency=-19.9)
        statuses = sorted(p.status for p in self.payments())
        self.assertEqual(statuses, ['completed', 'refunded'])
        db.session.refresh(self.user)
        self.assertEqual(self.user.subscription_status, 'canceled')  # must still be able to log in

    def test_expiration_and_billing_issue(self):
        self.send('INITIAL_PURCHASE')
        self.send('BILLING_ISSUE')
        db.session.refresh(self.user); self.assertEqual(self.user.subscription_status, 'past_due')
        self.assertEqual(self.sub().status, 'past_due')
        self.send('EXPIRATION', expiration_at_ms=ms(-1))
        db.session.refresh(self.user); self.assertEqual(self.user.subscription_status, 'canceled')
        self.assertEqual(self.sub().status, 'expired')

    # --- ignored events -----------------------------------------------
    def test_sandbox_unlocks_access_but_stays_out_of_the_ledger_unless_accepted(self):
        # App Review / TestFlight buy in sandbox and must still get into the app.
        outcome = self.send('INITIAL_PURCHASE', environment='SANDBOX').get_json()['msg']
        self.assertTrue(outcome.endswith('sandbox-no-ledger'))
        self.assertEqual(PaymentHistory.query.count(), 0)
        db.session.refresh(self.user)
        self.assertEqual(self.user.subscription_status, 'active')
        self.assertGreater(self.user.subscription_expires_at, datetime.utcnow() + timedelta(days=29))
        with mock.patch.dict(os.environ, {'REVENUECAT_ACCEPT_SANDBOX': 'true'}):
            self.send('INITIAL_PURCHASE', environment='SANDBOX', transaction_id='tx-sb')
        self.assertEqual(PaymentHistory.query.count(), 1)

    def test_trial_grants_access_until_the_trial_ends(self):
        self.send('INITIAL_PURCHASE', period_type='TRIAL', price_in_purchased_currency=0, price=0, expiration_at_ms=ms(7))
        db.session.refresh(self.user)
        delta = self.user.subscription_expires_at - datetime.utcnow()
        self.assertTrue(timedelta(days=6) < delta <= timedelta(days=7))

    def test_anonymous_unknown_and_test_events_are_acknowledged_but_ignored(self):
        self.assertEqual(self.send('INITIAL_PURCHASE', app_user_id='$RCAnonymousID:abc').get_json()['msg'], 'ignored:unknown-user')
        self.assertEqual(self.send('INITIAL_PURCHASE', app_user_id='not-a-uuid').status_code, 200)
        self.assertEqual(self.send('TEST').get_json()['msg'], 'ignored:TEST')
        self.assertEqual(Subscription.query.count(), 0)

    def test_alias_resolves_the_user(self):
        self.send('INITIAL_PURCHASE', app_user_id='$RCAnonymousID:abc', aliases=['$RCAnonymousID:abc', str(self.user.id)])
        self.assertEqual(len(self.payments()), 1)


if __name__ == '__main__':
    unittest.main()
