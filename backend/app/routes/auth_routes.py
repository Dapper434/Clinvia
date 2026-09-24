from flask import Blueprint, current_app, g, jsonify, request

from ..auth import (
    authenticate_token,
    generate_token,
    hash_password,
    password_problem,
    permissions_for,
    verify_password,
)
from ..clinical import clinic_now
from ..extensions import db
from ..models import Facility, Patient, Profile, User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

BAD_LOGIN = "That email and password don't match an account."


def network_domain():
    return current_app.config["NETWORK_EMAIL_DOMAIN"]


def domain_of(email):
    return email.rsplit("@", 1)[-1].lower() if "@" in email else ""


def is_staff_domain(domain):
    return domain == network_domain() or Facility.query.filter_by(email_domain=domain).first() is not None


def session_payload(user):
    patient_code = None
    if user.role == "patient":
        patient = Patient.query.filter_by(user_id=user.id).first()
        patient_code = patient.patient_code if patient else None
    token = generate_token({"id": user.id, "email": user.email, "role": user.role, "fullName": user.full_name})
    return {
        "token": token,
        "user": user.to_public_dict(),
        "profile": {"role": user.role, "full_name": user.full_name},
        "permissions": permissions_for(user.role),
        "patientCode": patient_code,
    }


@bp.get("/domain")
def which_hospital():
    """Tells the sign-in page which hospital an email address belongs to, as the user types."""
    domain = domain_of((request.args.get("email") or "").strip())
    if not domain:
        return jsonify({"kind": "unknown"})
    if domain == network_domain():
        return jsonify({"kind": "network", "name": "Clinvia network"})
    f = Facility.query.filter_by(email_domain=domain, active=True).first()
    if f:
        return jsonify({"kind": "hospital", "name": f.name})
    return jsonify({"kind": "unknown"})


@bp.post("/login/hospital")
def login_hospital():
    """Staff sign-in. The email's domain decides which hospital the person is signing in to,
    and it must be the hospital their account belongs to (network admins use the network domain)."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Enter your work email and password."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": BAD_LOGIN}), 401
    if user.role == "patient":
        return jsonify({"error": "This is a patient account. Use patient sign-in instead."}), 403
    if not user.is_active:
        return jsonify({"error": "This account has been deactivated. Ask your hospital administrator."}), 403

    domain = domain_of(email)
    if user.role == "network_admin":
        if domain != network_domain():
            return jsonify({"error": BAD_LOGIN}), 401
    else:
        if not user.facility or user.facility.email_domain != domain:
            return jsonify({"error": BAD_LOGIN}), 401
        if not user.facility.active:
            return jsonify({"error": "This hospital's account is suspended. Contact the Clinvia network."}), 403

    user.last_login_at = clinic_now()
    db.session.commit()
    return jsonify(session_payload(user))


@bp.post("/login/patient")
def login_patient():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Enter your email and password."}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": BAD_LOGIN}), 401
    if user.role != "patient":
        return jsonify({"error": "This is a staff account. Use hospital staff sign-in instead."}), 403
    if not user.is_active:
        return jsonify({"error": "This account has been deactivated."}), 403
    user.last_login_at = clinic_now()
    db.session.commit()
    return jsonify(session_payload(user))


@bp.post("/register/patient")
def register_patient():
    """Patients create their own portal account. With the link code their clinic gave them,
    the account is joined to their record straight away; without it they can add it later."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    full_name = (body.get("fullName") or "").strip()
    link_code = (body.get("linkCode") or "").strip().upper()

    if not email or not full_name or "@" not in email:
        return jsonify({"error": "Enter your full name and a valid email."}), 400
    problem = password_problem(password)
    if problem:
        return jsonify({"error": problem}), 400
    if is_staff_domain(domain_of(email)):
        return jsonify({"error": "Use a personal email address; hospital addresses are for staff."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists. Sign in instead."}), 400

    patient = None
    if link_code:
        patient = Patient.query.filter_by(portal_link_code=link_code, user_id=None).first()
        if not patient:
            return jsonify({"error": "That link code isn't valid. Check it with your clinic, or leave it blank."}), 400

    user = User(email=email, password_hash=hash_password(password), role="patient", full_name=full_name,
                phone=(body.get("phone") or "").strip() or None)
    db.session.add(user)
    db.session.flush()
    db.session.merge(Profile(id=user.id, full_name=full_name, role="patient"))
    if patient:
        patient.user_id = user.id
        patient.portal_link_code = None
    db.session.commit()
    return jsonify(session_payload(user)), 201


@bp.get("/me")
@authenticate_token
def get_me():
    user = g.current_user
    payload = session_payload(user)
    payload.pop("token")
    return jsonify(payload)


@bp.post("/password")
@authenticate_token
def change_password():
    user = g.current_user
    body = request.get_json(silent=True) or {}
    current, new = body.get("current") or "", body.get("new") or ""
    if not verify_password(current, user.password_hash):
        return jsonify({"error": "Your current password is not right."}), 400
    problem = password_problem(new)
    if problem:
        return jsonify({"error": problem}), 400
    if current == new:
        return jsonify({"error": "Choose a password different from the current one."}), 400
    user.password_hash = hash_password(new)
    user.must_change_password = False
    db.session.commit()
    return jsonify({"message": "Password changed."})
