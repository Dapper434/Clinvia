import re

from flask import Blueprint, current_app, g, jsonify
from sqlalchemy import func, select

from ..auth import (
    authenticate_token,
    hash_password,
    password_problem,
    require,
    scope_ids,
)
from ..clinical import attention, clinic_today, day_bounds
from ..extensions import db
from ..lookups import body
from ..models import Appointment, Bed, Facility, Patient, Profile, TbEpisode, User, Visit, Ward
from .auth_routes import session_payload

bp = Blueprint("hospitals", __name__, url_prefix="/api/hospitals")

DOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$")
LEVELS = ("National Referral", "Level 6", "Level 5", "Level 4", "Level 3", "Private hospital", "Mission hospital")


def _slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "hospital"


def _float(v):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


@bp.get("/levels")
def levels():
    return jsonify({"levels": LEVELS, "networkDomain": current_app.config["NETWORK_EMAIL_DOMAIN"]})


@bp.post("/register")
def register_hospital():
    """A new hospital signs itself up. It starts with no records, and its first account is
    the hospital administrator, who then adds staff at the hospital's own email domain."""
    data = body()
    h = data.get("hospital") or {}
    a = data.get("admin") or {}
    name = (h.get("name") or "").strip()
    domain = (h.get("domain") or "").strip().lower().lstrip("@")
    admin_name = (a.get("fullName") or "").strip()
    admin_email = (a.get("email") or "").strip().lower()
    password = a.get("password") or ""
    network = current_app.config["NETWORK_EMAIL_DOMAIN"]

    problems = []
    if len(name) < 3:
        problems.append("the hospital's name")
    if not DOMAIN_RE.match(domain):
        problems.append("a staff email domain such as mercy.clinvia.health")
    if not admin_name:
        problems.append("the administrator's full name")
    if problems:
        return jsonify({"error": "Add " + ", ".join(problems) + "."}), 400
    if domain == network or domain.endswith("." + "patient." + network) or domain == f"patient.{network}":
        return jsonify({"error": "That domain is reserved. Choose one for your hospital."}), 400
    if not admin_email.endswith("@" + domain):
        return jsonify({"error": f"The administrator's email must end in @{domain}."}), 400
    problem = password_problem(password)
    if problem:
        return jsonify({"error": problem}), 400
    if Facility.query.filter(func.lower(Facility.name) == name.lower()).first():
        return jsonify({"error": "A hospital with this name is already registered."}), 400
    if Facility.query.filter_by(email_domain=domain).first():
        return jsonify({"error": "Another hospital already uses that email domain."}), 400
    if User.query.filter_by(email=admin_email).first():
        return jsonify({"error": "An account with that email already exists."}), 400

    slug = base = _slugify(domain.split(".")[0] if domain.endswith("." + network) else name)
    n = 2
    while Facility.query.filter_by(slug=slug).first():
        slug, n = f"{base}-{n}", n + 1

    f = Facility(
        name=name, slug=slug, level=(h.get("level") or None), county=(h.get("county") or "").strip() or None,
        sub_county=(h.get("subCounty") or "").strip() or None, phone=(h.get("phone") or "").strip() or None,
        lat=_float(h.get("lat")), lng=_float(h.get("lng")), email_domain=domain, active=True, is_seeded=False,
    )
    db.session.add(f)
    db.session.flush()
    admin = User(
        email=admin_email, password_hash=hash_password(password), role="admin", full_name=admin_name,
        facility_id=f.id, phone=(a.get("phone") or "").strip() or None, specialty="Hospital administration",
    )
    db.session.add(admin)
    db.session.flush()
    admin.staff_code = db.session.execute(select(func.next_staff_code())).scalar()
    db.session.merge(Profile(id=admin.id, full_name=admin_name, role="admin"))
    db.session.commit()
    return jsonify({**session_payload(admin), "hospital": f.to_dict()}), 201


@bp.get("")
@authenticate_token
def list_hospitals():
    """Hospitals the caller can see: all of them for the network admin, their own otherwise."""
    user = g.current_user
    q = Facility.query.order_by(Facility.name)
    if user.role != "network_admin":
        q = q.filter(Facility.id == user.facility_id)
    return jsonify([f.to_dict() for f in q.all()])


@bp.get("/overview")
@authenticate_token
@require("network.view")
def overview():
    """One row per hospital for the network admin: people, beds, TB and today's activity."""
    today = clinic_today()
    lo, hi = day_bounds(today)
    rows = []
    for f in Facility.query.order_by(Facility.name).all():
        sid = [f.id]
        beds = db.session.execute(
            select(Bed.status, func.count()).join(Ward, Ward.id == Bed.ward_id)
            .where(Ward.facility_id == f.id).group_by(Bed.status)
        ).all()
        bed_counts = dict(beds)
        staff = dict(db.session.execute(
            select(User.role, func.count()).where(User.facility_id == f.id, User.is_active).group_by(User.role)
        ).all())
        doctors_on = User.query.filter_by(facility_id=f.id, role="doctor", duty_status="on_duty", is_active=True).count()
        tb = db.session.execute(
            select(func.count(), func.count().filter(TbEpisode.mdr_flag))
            .select_from(TbEpisode).join(Patient, Patient.id == TbEpisode.patient_id)
            .where(Patient.facility_id == f.id, TbEpisode.status == "active")
        ).one()
        rows.append({
            **f.to_dict(),
            "patients": Patient.query.filter_by(facility_id=f.id).count(),
            "staff": sum(staff.values()),
            "doctors": staff.get("doctor", 0),
            "doctorsOnDuty": doctors_on,
            "activeTb": tb[0],
            "mdr": tb[1],
            "attention": len(attention(sid, today)),
            "bedsOccupied": bed_counts.get("occupied", 0),
            "beds": sum(bed_counts.values()),
            "appointmentsToday": Appointment.query.filter(
                Appointment.facility_id == f.id, Appointment.scheduled_at >= lo, Appointment.scheduled_at < hi
            ).count(),
            "waiting": Visit.query.filter(
                Visit.facility_id == f.id, Visit.status == "waiting", Visit.arrived_at >= lo, Visit.arrived_at < hi
            ).count(),
        })
    return jsonify(rows)


@bp.patch("/<slug>")
@authenticate_token
@require("hospital.settings")
def update_hospital(slug):
    user = g.current_user
    f = Facility.query.filter_by(slug=slug).first()
    if not f or (user.role != "network_admin" and f.id != user.facility_id):
        return jsonify({"error": "There is no hospital called that here."}), 404
    data = body()
    if "name" in data:
        name = (data.get("name") or "").strip()
        if len(name) < 3:
            return jsonify({"error": "Add the hospital's name."}), 400
        clash = Facility.query.filter(func.lower(Facility.name) == name.lower(), Facility.id != f.id).first()
        if clash:
            return jsonify({"error": "Another hospital already has this name."}), 400
        f.name = name
    for key, attr in (("level", "level"), ("county", "county"), ("subCounty", "sub_county"), ("phone", "phone")):
        if key in data:
            setattr(f, attr, (data.get(key) or "").strip() or None)
    for key in ("lat", "lng"):
        if key in data:
            setattr(f, key, _float(data.get(key)))
    if "active" in data:
        if user.role != "network_admin":
            return jsonify({"error": "Only the network admin can suspend a hospital."}), 403
        f.active = bool(data["active"])
    db.session.commit()
    return jsonify(f.to_dict())


@bp.get("/scope")
@authenticate_token
def current_scope():
    """Which hospitals this request covers (resolves the X-Hospital header)."""
    ids = scope_ids()
    return jsonify([f.to_dict() for f in Facility.query.filter(Facility.id.in_(ids)).order_by(Facility.name)])
