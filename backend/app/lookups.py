"""Resolve readable codes to records inside the caller's hospital scope, and shape rows
for JSON. A code from another hospital is reported as not found, never as forbidden."""
import re

from flask import abort, g

from .auth import scope_ids
from .extensions import db
from .models import Patient, User

CODE_RE = re.compile(r"^[PS]\d{4,}$", re.I)


def patient_or_404(code):
    code = (code or "").strip().upper()
    p = None
    if CODE_RE.match(code):
        p = Patient.query.filter(Patient.patient_code == code, Patient.facility_id.in_(scope_ids())).first()
    if not p:
        abort(404, description=f"There is no patient with the code {code} here.")
    return p


def staff_or_404(code):
    code = (code or "").strip().upper()
    q = User.query.filter(User.staff_code == code)
    if g.current_user.role != "network_admin":
        q = q.filter(User.facility_id == g.current_user.facility_id)
    u = q.first()
    if not u:
        abort(404, description=f"There is no staff member with the code {code} here.")
    return u


def names_by_id(ids):
    ids = [i for i in set(ids) if i]
    if not ids:
        return {}
    return {u.id: u for u in User.query.filter(User.id.in_(ids)).all()}


def doctor_brief(u):
    if not u:
        return None
    return {"code": u.staff_code, "name": u.full_name, "specialty": u.specialty, "duty": u.duty_status}


def patient_brief(p):
    return {
        "code": p.patient_code,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "phone": p.phone,
        "portal": p.user_id is not None,
    }


def body():
    from flask import request

    return request.get_json(silent=True) or {}


def commit():
    db.session.commit()
