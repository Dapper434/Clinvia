from flask import Blueprint, abort, g, jsonify, request
from sqlalchemy import func, or_, select

from ..auth import (
    STAFF_ROLES,
    authenticate_token,
    can,
    hash_password,
    password_problem,
    require,
    scope_ids,
    single_scope,
)
from ..clinical import clinic_today, day_bounds, local
from ..extensions import db
from ..lookups import body, patient_brief, staff_or_404
from ..models import Appointment, Facility, Patient, Profile, TbEpisode, User

bp = Blueprint("staff", __name__, url_prefix="/api")

ROLE_ORDER = ["admin", "executive", "doctor", "clinician", "nurse", "receptionist"]


def _patients_per(ids):
    if not ids:
        return {}
    return dict(db.session.execute(
        select(Patient.assigned_doctor_id, func.count()).where(Patient.assigned_doctor_id.in_(ids))
        .group_by(Patient.assigned_doctor_id)
    ).all())


@bp.get("/staff")
@authenticate_token
@require("staff.view")
def list_staff():
    scope = scope_ids()
    q = User.query.filter(User.facility_id.in_(scope), User.role.in_(STAFF_ROLES))
    rows = q.all()
    rows.sort(key=lambda u: (u.facility.name if u.facility else "", ROLE_ORDER.index(u.role), u.staff_code or ""))
    counts = _patients_per([u.id for u in rows])
    manage = can(g.current_user.role, "staff.manage")
    doctors = [u for u in rows if u.role == "doctor" and u.is_active]
    nc = [u for u in rows if u.role in ("nurse", "clinician") and u.is_active]
    assigned = sum(counts.get(d.id, 0) for d in doctors)
    out = []
    for u in rows:
        d = u.to_staff_dict()
        d["patients"] = counts.get(u.id, 0)
        if not manage:
            d.pop("lastLogin", None)
        out.append(d)
    return jsonify({
        "rows": out,
        "canManage": manage,
        "stats": {
            "doctors": len(doctors),
            "doctorsOnDuty": sum(1 for d in doctors if d.duty_status == "on_duty"),
            "onLeave": sum(1 for u in rows if u.duty_status == "on_leave" and u.is_active),
            "nursesClinicians": len(nc),
            "nursesCliniciansOnDuty": sum(1 for u in nc if u.duty_status == "on_duty"),
            "patientsPerDoctor": round(assigned / len(doctors)) if doctors else 0,
        },
        "domain": (db.session.get(Facility, scope[0]).email_domain if len(scope) == 1 else None),
    })


@bp.get("/staff/doctors")
@authenticate_token
@require("staff.view")
def doctors():
    q = User.query.filter(User.facility_id.in_(scope_ids()), User.role == "doctor", User.is_active)
    if request.args.get("bookable") in ("1", "true"):
        q = q.filter(User.duty_status == "on_duty")
    return jsonify([
        {"code": u.staff_code, "name": u.full_name, "specialty": u.specialty, "duty": u.duty_status,
         "hospital": u.facility.name if u.facility else None}
        for u in q.order_by(User.staff_code).all()
    ])


@bp.get("/staff/next-code")
@authenticate_token
@require("staff.manage")
def next_staff_code():
    last = db.session.execute(db.text("SELECT last_value, is_called FROM staff_code_seq")).one()
    n = last[0] + 1 if last[1] else last[0]
    return jsonify({"code": "S" + str(n).zfill(max(4, len(str(n))))})


@bp.get("/staff/<code>")
@authenticate_token
@require("staff.view")
def profile(code):
    u = g.current_user if code == "me" else staff_or_404(code)
    today = clinic_today()
    data = u.to_staff_dict()
    patients = Patient.query.filter_by(assigned_doctor_id=u.id).order_by(Patient.patient_code).all()
    eps = {e.patient_id: e for e in TbEpisode.query.filter(TbEpisode.patient_id.in_([p.id for p in patients]))
           .order_by(TbEpisode.treatment_start)}
    show_patients = can(g.current_user.role, "patients.view")
    data["patients"] = [
        {**patient_brief(p), "tb": eps[p.id].status if p.id in eps else None} for p in patients
    ] if show_patients else []
    data["patientCount"] = len(patients)
    lo, hi = day_bounds(today)
    appts = (
        db.session.query(Appointment, Patient).join(Patient, Patient.id == Appointment.patient_id)
        .filter(Appointment.doctor_id == u.id, Appointment.scheduled_at >= lo, Appointment.scheduled_at < hi)
        .order_by(Appointment.scheduled_at).all()
    )
    data["today"] = [
        {"time": local(a.scheduled_at).strftime("%H:%M"), "reason": a.reason, "status": a.status,
         "patient": patient_brief(p) if show_patients else None}
        for a, p in appts
    ]
    data["isMe"] = u.id == g.current_user.id
    data["canEdit"] = data["isMe"] or _can_manage(u)
    data["email_domain"] = u.facility.email_domain if u.facility else None
    return jsonify(data)


def _can_manage(u):
    me = g.current_user
    if not can(me.role, "staff.manage"):
        return False
    return me.role == "network_admin" or (u.facility_id == me.facility_id)


@bp.post("/staff")
@authenticate_token
@require("staff.manage")
def create_staff():
    data = body()
    facility = db.session.get(Facility, single_scope())
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    if email and "@" not in email:
        email = f"{email}@{facility.email_domain}"
    role = data.get("role")
    problems = []
    if not name:
        problems.append("a full name")
    if not email or not email.endswith("@" + facility.email_domain):
        problems.append(f"an email ending in @{facility.email_domain}")
    if role not in STAFF_ROLES:
        problems.append("a role")
    if problems:
        return jsonify({"error": "Add " + " and ".join(problems) + "."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "That email is already in use."}), 400
    problem = password_problem(data.get("password") or "")
    if problem:
        return jsonify({"error": problem}), 400
    duty = data.get("duty") if data.get("duty") in ("on_duty", "off_duty", "on_leave") else "on_duty"
    u = User(email=email, password_hash=hash_password(data["password"]), role=role, full_name=name,
             facility_id=facility.id, phone=(data.get("phone") or "").strip() or None,
             specialty=(data.get("specialty") or "").strip() or None, duty_status=duty,
             must_change_password=True)
    db.session.add(u)
    db.session.flush()
    u.staff_code = db.session.execute(select(func.next_staff_code())).scalar()
    db.session.merge(Profile(id=u.id, full_name=name, role=role))
    db.session.commit()
    return jsonify(u.to_staff_dict()), 201


@bp.patch("/staff/<code>")
@authenticate_token
@require("staff.view")
def update_staff(code):
    me = g.current_user
    u = me if code == "me" else staff_or_404(code)
    manage = _can_manage(u)
    if not manage and u.id != me.id:
        return jsonify({"error": "Only your hospital's administrator can change other people's accounts."}), 403
    data = body()
    was_admin = u.role == "admin" and u.is_active

    # Anyone can correct their own name and phone; the rest is for administrators.
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "The name can't be empty."}), 400
        u.full_name = name
    if "phone" in data:
        u.phone = (data.get("phone") or "").strip() or None
    admin_fields = {"email", "role", "specialty", "duty", "active", "password"} & set(data)
    if admin_fields and not manage:
        return jsonify({"error": "Ask your hospital administrator to change that."}), 403
    if "email" in data:
        email = (data.get("email") or "").strip().lower()
        domain = u.facility.email_domain if u.facility else None
        if domain and not email.endswith("@" + domain):
            return jsonify({"error": f"The email must end in @{domain}."}), 400
        if User.query.filter(User.email == email, User.id != u.id).first():
            return jsonify({"error": "That email is already in use."}), 400
        u.email = email
    if "role" in data:
        if data["role"] not in STAFF_ROLES:
            return jsonify({"error": "Choose a role."}), 400
        if u.id == me.id and data["role"] != u.role:
            return jsonify({"error": "You can't change your own role."}), 400
        u.role = data["role"]
    if "specialty" in data:
        u.specialty = (data.get("specialty") or "").strip() or None
    if "duty" in data:
        if data["duty"] not in ("on_duty", "off_duty", "on_leave"):
            return jsonify({"error": "Choose a duty status."}), 400
        u.duty_status = data["duty"]
    if "active" in data:
        if u.id == me.id and not data["active"]:
            return jsonify({"error": "You can't deactivate your own account."}), 400
        u.is_active = bool(data["active"])
    if "password" in data:
        problem = password_problem(data.get("password") or "")
        if problem:
            return jsonify({"error": problem}), 400
        u.password_hash = hash_password(data["password"])
        u.must_change_password = u.id != me.id
    if was_admin and not (u.role == "admin" and u.is_active):
        others = User.query.filter(User.facility_id == u.facility_id, User.role == "admin", User.is_active,
                                   User.id != u.id).count()
        if others == 0:
            db.session.rollback()
            return jsonify({"error": "A hospital needs at least one active administrator."}), 400
    profile_row = db.session.get(Profile, u.id)
    if profile_row:
        profile_row.full_name, profile_row.role = u.full_name, u.role
    db.session.commit()
    return jsonify(u.to_staff_dict())


@bp.get("/directory")
@authenticate_token
@require("network.view")
def directory():
    """Search people across every hospital: staff by name, code, email or role; patients by
    name, code or phone."""
    term = (request.args.get("q") or "").strip().lower()
    kind = request.args.get("type") or "all"
    role = request.args.get("role")
    scope = scope_ids()
    facilities = {f.id: f.name for f in Facility.query.all()}
    out = {"staff": [], "patients": []}
    like = f"%{term}%"
    if kind in ("all", "staff"):
        q = User.query.filter(or_(User.facility_id.in_(scope), User.role == "network_admin"), User.role != "patient")
        if role:
            q = q.filter(User.role == role)
        if term:
            q = q.filter(or_(func.lower(User.full_name).like(like), func.lower(User.email).like(like),
                             func.lower(User.staff_code).like(like), func.lower(User.specialty).like(like)))
        out["staff"] = [u.to_staff_dict() for u in q.order_by(User.full_name).limit(50).all()]
    if kind in ("all", "patients") and not role:
        q = Patient.query.filter(Patient.facility_id.in_(scope))
        if term:
            q = q.filter(or_(func.lower(Patient.name).like(like), func.lower(Patient.patient_code).like(like),
                             Patient.phone.like(like)))
        rows = q.order_by(Patient.name).limit(50).all()
        eps = {e.patient_id: e.status for e in TbEpisode.query.filter(TbEpisode.patient_id.in_([p.id for p in rows]))}
        out["patients"] = [
            {**patient_brief(p), "hospital": facilities.get(p.facility_id), "hospitalSlug": p.facility.slug if p.facility else None,
             "tb": eps.get(p.id), "doctor": p.assigned_doctor.full_name if p.assigned_doctor else None}
            for p in rows
        ]
    return jsonify(out)
