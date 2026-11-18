"""Admin financial endpoints (revenue, MRR, churn, payments ledger).

Registered on the same blueprint as the other admin routes, so every endpoint
here is protected by `admin.check_admin`.
"""
import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from flask import jsonify, make_response, request
from sqlalchemy import func

from app.modules.identity.domain.models import User
from app.modules.identity.domain.subscription import PaymentHistory, Subscription
from app.modules.identity.interface.routes.admin import admin_bp
from app.shared.extensions import db

PAID_STATUS = "completed"


def _num(value) -> float:
    return float(value) if value is not None else 0.0


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(dt: datetime, months: int) -> datetime:
    index = dt.year * 12 + (dt.month - 1) + months
    return dt.replace(year=index // 12, month=index % 12 + 1, day=1)


def _paid_at():
    """Date a payment counts for: when it was paid, falling back to creation."""
    return func.coalesce(PaymentHistory.payment_date, PaymentHistory.created_at)


def _revenue_between(start: datetime, end: datetime, status: str = PAID_STATUS) -> float:
    total = (
        db.session.query(func.coalesce(func.sum(PaymentHistory.amount), 0))
        .filter(PaymentHistory.status == status, PaymentHistory.currency == "BRL", _paid_at() >= start, _paid_at() < end)
        .scalar()
    )
    return _num(total)


def _user_ref(user: User | None) -> dict:
    if not user:
        return {"id": None, "name": "Usuário removido", "email": ""}
    return {"id": str(user.id), "name": user.name or user.email.split("@")[0], "email": user.email}


@admin_bp.route("/finance/summary", methods=["GET"])
def finance_summary():
    """KPIs, monthly revenue series and breakdowns for the finance dashboard."""
    months = min(max(request.args.get("months", 6, type=int), 1), 24)
    now = datetime.utcnow()
    this_month = _month_start(now)
    last_month = _add_months(this_month, -1)
    thirty_days_ago = now - timedelta(days=30)

    # Free trials (price 0) are not paying subscribers; only BRL is summed (no FX conversion).
    paying = Subscription.query.filter(
        Subscription.status == "active", Subscription.plan_type != "free",
        Subscription.price_monthly > 0, Subscription.currency == "BRL",
    )
    paying_count = paying.count()
    mrr = _num(paying.with_entities(func.coalesce(func.sum(Subscription.price_monthly), 0)).scalar())

    revenue_this = _revenue_between(this_month, _add_months(this_month, 1))
    revenue_last = _revenue_between(last_month, this_month)
    refunded_this = _revenue_between(this_month, _add_months(this_month, 1), "refunded")
    delta_pct = round((revenue_this - revenue_last) / revenue_last * 100, 1) if revenue_last else None

    cancelled_30d = Subscription.query.filter(Subscription.cancelled_at >= thirty_days_ago).count()
    new_30d = Subscription.query.filter(
        Subscription.plan_type != "free", Subscription.start_date >= thirty_days_ago
    ).count()
    churn_base = paying_count + cancelled_30d
    churn_rate = round(cancelled_30d / churn_base * 100, 1) if churn_base else 0.0

    # Monthly series (zero-filled)
    first_month = _add_months(this_month, -(months - 1))
    series = {}
    cursor = first_month
    while cursor <= this_month:
        series[cursor.strftime("%Y-%m")] = {"month": cursor.strftime("%Y-%m"), "revenue": 0.0, "refunds": 0.0, "payments": 0}
        cursor = _add_months(cursor, 1)
    month_expr = func.date_trunc("month", _paid_at())
    rows = (
        db.session.query(month_expr, PaymentHistory.status, func.sum(PaymentHistory.amount), func.count(PaymentHistory.id))
        .filter(PaymentHistory.status.in_([PAID_STATUS, "refunded"]), PaymentHistory.currency == "BRL", _paid_at() >= first_month)
        .group_by(month_expr, PaymentHistory.status)
        .all()
    )
    for month, status, amount, count in rows:
        bucket = series.get(month.strftime("%Y-%m"))
        if not bucket:
            continue
        if status == PAID_STATUS:
            bucket["revenue"] = _num(amount)
            bucket["payments"] = int(count)
        else:
            bucket["refunds"] = _num(amount)

    by_plan = [
        {"plan": plan or "free", "subscribers": int(count), "mrr": _num(total)}
        for plan, count, total in db.session.query(
            Subscription.plan_type, func.count(Subscription.id), func.coalesce(func.sum(Subscription.price_monthly), 0)
        )
        .filter(Subscription.status == "active")
        .group_by(Subscription.plan_type)
        .all()
    ]
    by_status = {status: int(count) for status, count in db.session.query(Subscription.status, func.count(Subscription.id)).group_by(Subscription.status).all()}

    by_method = [
        {"method": method or "outro", "payments": int(count), "revenue": _num(total)}
        for method, count, total in db.session.query(
            PaymentHistory.payment_method, func.count(PaymentHistory.id), func.coalesce(func.sum(PaymentHistory.amount), 0)
        )
        .filter(PaymentHistory.status == PAID_STATUS, PaymentHistory.currency == "BRL", _paid_at() >= first_month)
        .group_by(PaymentHistory.payment_method)
        .order_by(func.sum(PaymentHistory.amount).desc())
        .all()
    ]

    renewals_q = Subscription.query.filter(
        Subscription.status == "active",
        Subscription.next_billing_date.isnot(None),
        Subscription.next_billing_date >= now,
        Subscription.next_billing_date < now + timedelta(days=30),
    )
    upcoming = [
        {
            "user": _user_ref(User.query.get(s.user_id)),
            "amount": _num(s.price_monthly),
            "date": s.next_billing_date.isoformat(),
            "plan": s.plan_type,
        }
        for s in renewals_q.order_by(Subscription.next_billing_date).limit(8).all()
    ]
    upcoming_total = _num(renewals_q.with_entities(func.coalesce(func.sum(Subscription.price_monthly), 0)).scalar())

    past_due_q = Subscription.query.filter(Subscription.status == "past_due")
    at_risk = [
        {
            "user": _user_ref(User.query.get(s.user_id)),
            "amount": _num(s.price_monthly),
            "since": (s.next_billing_date or s.updated_at or s.created_at).isoformat(),
            "plan": s.plan_type,
        }
        for s in past_due_q.order_by(Subscription.next_billing_date).limit(8).all()
    ]
    past_due_total = _num(past_due_q.with_entities(func.coalesce(func.sum(Subscription.price_monthly), 0)).scalar())

    return jsonify({
        "currency": "BRL",
        "kpis": {
            "mrr": mrr,
            "arr": round(mrr * 12, 2),
            "paying_subscribers": paying_count,
            "arpu": round(mrr / paying_count, 2) if paying_count else 0.0,
            "revenue_this_month": revenue_this,
            "revenue_last_month": revenue_last,
            "revenue_delta_pct": delta_pct,
            "refunded_this_month": refunded_this,
            "new_subscribers_30d": new_30d,
            "cancelled_30d": cancelled_30d,
            "churn_rate_30d": churn_rate,
            "past_due_count": past_due_q.count(),
            "past_due_amount": past_due_total,
        },
        "revenue_by_month": list(series.values()),
        "by_plan": by_plan,
        "by_status": by_status,
        "by_method": by_method,
        "upcoming_renewals": {"count": renewals_q.count(), "amount": upcoming_total, "items": upcoming},
        "at_risk": at_risk,
    })


@admin_bp.route("/finance/payments", methods=["GET"])
def finance_payments():
    """Paginated payments ledger (CSV with ?export=true)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 15, type=int), 100)
    status = request.args.get("status", "all")
    method = request.args.get("method", "all")
    export = request.args.get("export", "false").lower() == "true"

    query = (
        db.session.query(PaymentHistory, Subscription, User)
        .join(Subscription, PaymentHistory.subscription_id == Subscription.id)
        .join(User, Subscription.user_id == User.id)
    )
    if status != "all":
        query = query.filter(PaymentHistory.status == status)
    if method != "all":
        query = query.filter(PaymentHistory.payment_method == method)
    query = query.order_by(_paid_at().desc())

    def serialize(payment: PaymentHistory, sub: Subscription, user: User) -> dict:
        when = payment.payment_date or payment.created_at
        return {
            "id": str(payment.id),
            "user": _user_ref(user),
            "plan": sub.plan_type,
            "amount": _num(payment.amount),
            "currency": payment.currency or "BRL",
            "status": payment.status,
            "method": payment.payment_method,
            "date": when.isoformat() if when else None,
            "external_id": payment.external_payment_id,
            "notes": payment.notes,
        }

    if export:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["data", "usuario", "email", "plano", "valor", "moeda", "status", "metodo", "id_externo"])
        for payment, sub, user in query.all():
            row = serialize(payment, sub, user)
            writer.writerow([row["date"], row["user"]["name"], row["user"]["email"], row["plan"], f'{row["amount"]:.2f}',
                             row["currency"], row["status"], row["method"] or "", row["external_id"] or ""])
        response = make_response(buffer.getvalue())
        response.headers["Content-Type"] = "text/csv; charset=utf-8"
        response.headers["Content-Disposition"] = "attachment; filename=pagamentos.csv"
        return response

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    methods = [m for (m,) in db.session.query(PaymentHistory.payment_method).distinct().all() if m]
    return jsonify({
        "items": [serialize(*row) for row in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
        "methods": sorted(methods),
    })
