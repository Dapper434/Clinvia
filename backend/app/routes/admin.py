from collections import defaultdict
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request

from ..auth import HOSPITAL_ROLES, authenticate_token, hash_password, require_admin
from ..extensions import db
from ..models import DoseLog, LabResult, Patient, Profile, User

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

CREATABLE_STAFF_ROLES = HOSPITAL_ROLES  # {hospital, nurse, viewer, admin}


@bp.get("/staff")
@authenticate_token
@require_admin
def list_staff():
    staff = User.query.filter(User.role.in_(HOSPITAL_ROLES)).order_by(User.created_at.desc()).all()
    return jsonify(
        [
            {
                "id": s.id,
                "email": s.email,
                "role": s.role,
                "fullName": s.full_name,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in staff
        ]
    )


@bp.post("/staff")
@authenticate_token
@require_admin
def create_staff():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password")
    full_name = (body.get("fullName") or "").strip()
    role = body.get("role") or "hospital"

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and full name are required"}), 400

    if role not in CREATABLE_STAFF_ROLES:
        return jsonify({"error": f"Role must be one of: {', '.join(sorted(CREATABLE_STAFF_ROLES))}"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 400

    user = User(email=email, password_hash=hash_password(password), role=role, full_name=full_name)
    db.session.add(user)
    db.session.flush()

    profile = Profile(id=user.id, full_name=user.full_name, role=role)
    db.session.merge(profile)
    db.session.commit()

    return (
        jsonify(
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "fullName": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        ),
        201,
    )


@bp.get("/dashboard")
@authenticate_token
@require_admin
def admin_dashboard():
    patients = Patient.query.all()
    staff_count = User.query.filter(User.role.in_(HOSPITAL_ROLES)).count()
    dose_logs = DoseLog.query.all()
    lab_results = LabResult.query.all()

    active_patients = [p for p in patients if p.status == "active"]
    mdr_count = sum(1 for p in patients if p.mdr_flag)

    current_month_prefix = date.today().strftime("%Y-%m")
    new_this_month = sum(
        1 for p in patients if p.created_at and p.created_at.strftime("%Y-%m") == current_month_prefix
    )

    lab_status_counts = {"positive": 0, "negative": 0, "pending": 0}
    for lab in lab_results:
        if lab.result in lab_status_counts:
            lab_status_counts[lab.result] += 1

    logs_by_date = defaultdict(list)
    for log in dose_logs:
        logs_by_date[log.date].append(log)

    day_labels, day_counts = [], []
    today = date.today()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_labels.append(d.strftime("%a"))
        rows = logs_by_date.get(d, [])
        day_counts.append(sum(1 for r in rows if r.taken))

    month_labels, month_values = [], []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        prefix = f"{year:04d}-{month:02d}"
        month_labels.append(datetime(year, month, 1).strftime("%b"))
        month_values.append(
            sum(1 for p in patients if p.created_at and p.created_at.strftime("%Y-%m") == prefix)
        )

    tb_type_counts = defaultdict(int)
    for p in patients:
        if p.tb_type:
            tb_type_counts[p.tb_type] += 1

    return jsonify(
        {
            "totalPatients": len(patients),
            "activePatients": len(active_patients),
            "newThisMonth": new_this_month,
            "staffCount": staff_count,
            "mdrCount": mdr_count,
            "labStatusCounts": lab_status_counts,
            "doseLogDayLabels": day_labels,
            "doseLogDayCounts": day_counts,
            "newCasesMonthLabels": month_labels,
            "newCasesMonthValues": month_values,
            "tbTypeCounts": dict(tb_type_counts),
        }
    )
