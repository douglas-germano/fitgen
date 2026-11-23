from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.modules.identity.application.referrals import commission_payload, new_code, program_summary
from app.modules.identity.domain.models import User
from app.modules.identity.domain.referral import PartnerCommission, Referral, ReferralCode, ReferralReward
from app.shared.extensions import db

referrals_bp = Blueprint("referrals", __name__)


@referrals_bp.post("/friends")
@jwt_required()
def friends():
    user = db.get_or_404(User, UUID(get_jwt_identity()))
    code = new_code(user, "friends")
    db.session.flush()
    summary = program_summary(code)
    reward = db.session.get(ReferralReward, user.id)
    summary.update(
        progress=summary["qualified"] % 3,
        earned_days=(summary["qualified"] // 3) * 30,
        starts_at=reward.starts_at.isoformat() + "Z" if reward else None,
        ends_at=reward.ends_at.isoformat() + "Z" if reward else None,
    )
    db.session.commit()
    return jsonify(summary)


@referrals_bp.get("/partner")
@jwt_required()
def partner():
    code = ReferralCode.query.filter_by(owner_id=UUID(get_jwt_identity()), program="partner").first_or_404()
    rows = (PartnerCommission.query.join(Referral, Referral.user_id == PartnerCommission.user_id)
            .filter(Referral.code == code.code).order_by(PartnerCommission.created_at.desc()))
    page = rows.paginate(per_page=25, max_per_page=25, error_out=False)
    return jsonify({**program_summary(code), "commissions": [commission_payload(row) for row in page.items],
                    "pages": page.pages})
