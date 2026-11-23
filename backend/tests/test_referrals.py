import os
import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "isolated-referral-tests")
os.environ.setdefault("JWT_SECRET_KEY", "isolated-referral-tests-jwt-secret")

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.modules.identity.application.referrals import attribute_signup, new_code, preserve_bonus, record_referral_payment
from app.modules.identity.application.revenuecat import apply_revenuecat_event
from app.modules.identity.application.stripe_billing import apply_stripe_event
from app.modules.identity.domain.models import User
from app.modules.identity.domain.referral import PartnerCommission, ReferralReward
from app.modules.identity.interface.routes.admin import admin_bp
from app.modules.identity.interface.routes.referrals import referrals_bp
from app.shared import model_registry  # noqa: F401
from app.shared.extensions import db
from app.shared.subscription_access import user_has_access


class ReferralTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite://", JWT_SECRET_KEY=os.environ["JWT_SECRET_KEY"])
        db.init_app(app)
        JWTManager(app)
        app.register_blueprint(admin_bp, url_prefix="/admin")
        app.register_blueprint(referrals_bp, url_prefix="/referrals")
        self.client = app.test_client()
        self.context = app.app_context()
        self.context.push()
        self.addCleanup(self.context.pop)
        self.addCleanup(db.engine.dispose)
        self.addCleanup(db.session.remove)
        db.metadata.create_all(db.engine, tables=[db.metadata.tables[name] for name in (
            "users", "subscriptions", "payment_history", "referral_codes", "referrals", "referral_rewards",
            "partner_commissions",
        )])

    def user(self, name, role="user"):
        user = User(email=f"{name}@example.test", name=name, role=role, subscription_status="free")
        db.session.add(user)
        db.session.flush()
        return user

    def headers(self, user):
        return {"Authorization": f"Bearer {create_access_token(identity=str(user.id))}"}

    def test_three_distinct_paying_friends_award_thirty_days_and_six_award_sixty(self):
        owner = self.user("owner")
        owner.subscription_status = "active"
        owner.subscription_expires_at = datetime.utcnow() + timedelta(days=10)
        code = new_code(owner, "friends")
        db.session.flush()

        for index in range(6):
            invited = self.user(f"friend{index}")
            attribute_signup(invited, code)
            record_referral_payment(invited, f"trial{index}", Decimal("0"), "BRL", source="stripe")
            record_referral_payment(invited, f"paid{index}", Decimal("29.90"), "BRL", source="stripe")
            record_referral_payment(invited, f"renewal{index}", Decimal("29.90"), "BRL", source="stripe")
            db.session.commit()
            reward = db.session.get(ReferralReward, owner.id)
            if index < 2:
                self.assertIsNone(reward)
            else:
                self.assertEqual(reward.ends_at - reward.starts_at, timedelta(days=30 * ((index + 1) // 3)))

        previous = owner.subscription_expires_at
        owner.subscription_expires_at += timedelta(days=30)
        preserve_bonus(owner, previous)
        db.session.commit()
        self.assertEqual(reward.starts_at, owner.subscription_expires_at)
        self.assertTrue(user_has_access(owner, now=reward.starts_at + timedelta(days=59)))
        self.assertFalse(user_has_access(owner, now=reward.ends_at))
        response = self.client.post("/referrals/friends", headers=self.headers(owner))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["earned_days"], 60)

    def test_stripe_renewals_are_idempotent_and_admin_uses_net_amount(self):
        partner = self.user("partner")
        admin = self.user("admin", role="admin")
        code = new_code(partner, "partner")
        db.session.flush()
        buyer = self.user("buyer")
        attribute_signup(buyer, code)
        db.session.commit()

        for invoice_id in ("in_first", "in_first", "in_renewal"):
            apply_stripe_event({"type": "invoice.paid", "data": {"object": {
                "id": invoice_id, "amount_paid": 2990, "currency": "brl",
                "subscription": "sub_example", "metadata": {"user_id": str(buyer.id)},
            }}}, client=Mock())
            db.session.commit()

        self.assertEqual(PartnerCommission.query.count(), 2)
        listing = self.client.get("/admin/referral-commissions", headers=self.headers(admin))
        self.assertEqual(len(listing.json["items"]), 2)
        self.assertEqual(self.client.get("/referrals/partner", headers=self.headers(partner)).json["qualified"], 1)
        row = PartnerCommission.query.filter_by(payment_id="stripe:in_first").one()
        url = f"/admin/referral-commissions/{row.id}"
        response = self.client.patch(url, json={"status": "approved", "received_amount": "27.40"}, headers=self.headers(admin))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["amount"], "8.22")
        response = self.client.patch(url, json={"status": "paid", "payout_reference": "comprovante"}, headers=self.headers(admin))
        self.assertEqual(response.json["status"], "paid")


    def test_store_trial_and_sandbox_do_not_create_commissions(self):
        code = new_code(self.user("store_partner"), "partner")
        db.session.flush()
        buyer = self.user("store_buyer")
        attribute_signup(buyer, code)
        db.session.commit()
        event = {
            "app_user_id": str(buyer.id), "transaction_id": "store_transaction",
            "store": "APP_STORE", "currency": "BRL", "price_in_purchased_currency": 29.90,
            "type": "INITIAL_PURCHASE", "environment": "PRODUCTION", "period_type": "TRIAL",
        }
        apply_revenuecat_event(event)
        apply_revenuecat_event({**event, "environment": "SANDBOX", "period_type": "NORMAL"})
        db.session.commit()
        self.assertEqual(PartnerCommission.query.count(), 0)
        for _ in range(2):
            apply_revenuecat_event({**event, "type": "RENEWAL", "period_type": "NORMAL"})
            db.session.commit()
        self.assertEqual(PartnerCommission.query.one().payment_id, "app_store:store_transaction")
