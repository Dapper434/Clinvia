from datetime import date

from flask import Blueprint, g, jsonify, request

from ..auth import (
    authenticate_token,
    generate_token,
    hash_password,
    is_hospital_role,
    verify_password,
)
from ..extensions import db
from ..models import Patient, Profile, User
from ..utils import parse_date

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register/patient")
def register_patient():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password")
    full_name = (body.get("fullName") or "").strip()
    patient_fields = body.get("patientFields") or {}
    link_id = body.get("linkId")

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and full name are required"}), 400

    email = email.lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 400

    user = User(email=email, password_hash=hash_password(password), role="patient", full_name=full_name)
    db.session.add(user)
    db.session.flush()

    profile = Profile(id=user.id, full_name=user.full_name, role="patient")
    db.session.merge(profile)

    patient_id = None
    if link_id and isinstance(link_id, str) and link_id.strip():
        linked = Patient.query.get(link_id.strip())
        if linked:
            linked.user_id = user.id
            patient_id = linked.id

    if not patient_id:
        patient = Patient(
            user_id=user.id,
            name=patient_fields.get("name") or full_name,
            age=patient_fields.get("age") or None,
            gender=patient_fields.get("gender") or "male",
            phone=patient_fields.get("phone") or None,
            facility=patient_fields.get("facility") or None,
            tb_type=patient_fields.get("tb_type") or "pulmonary",
            regimen=patient_fields.get("regimen") or "HRZE",
            treatment_start=parse_date(patient_fields.get("treatment_start")) or date.today(),
            status="active",
        )
        db.session.add(patient)
        db.session.flush()
        patient_id = patient.id

    db.session.commit()

    token = generate_token(
        {"id": user.id, "email": user.email, "role": user.role, "fullName": user.full_name}
    )

    return (
        jsonify(
            {
                "token": token,
                "user": user.to_public_dict(),
                "profile": {"role": user.role, "full_name": user.full_name},
                "patientId": patient_id,
            }
        ),
        201,
    )


def _authenticate(email, password, role_check, wrong_portal_message):
    if not email or not password:
        return None, (jsonify({"error": "Email and password are required"}), 400)

    user = User.query.filter_by(email=email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        return None, (jsonify({"error": "Invalid email or password"}), 401)

    if not role_check(user.role):
        return None, (jsonify({"error": wrong_portal_message}), 403)

    return user, None


def _login_response(user):
    patient_id = None
    if user.role == "patient":
        patient = Patient.query.filter_by(user_id=user.id).first()
        if patient:
            patient_id = patient.id

    token = generate_token(
        {"id": user.id, "email": user.email, "role": user.role, "fullName": user.full_name}
    )

    return jsonify(
        {
            "token": token,
            "user": user.to_public_dict(),
            "profile": {"role": user.role, "full_name": user.full_name},
            "patientId": patient_id,
        }
    )


@bp.post("/login/hospital")
def login_hospital():
    """Unified sign-in for both clinical staff and admin accounts.

    Both audiences share one login page ("Hospital Portal"); RBAC is enforced
    by what each role can access after logging in (see require_admin/
    require_hospital), not by which login form was used to get in.
    """
    body = request.get_json(silent=True) or {}
    user, error = _authenticate(
        (body.get("email") or "").strip(),
        body.get("password"),
        is_hospital_role,
        "This sign-in is for hospital staff and admin accounts only.",
    )
    if error:
        return error
    return _login_response(user)


@bp.post("/login/patient")
def login_patient():
    body = request.get_json(silent=True) or {}
    user, error = _authenticate(
        (body.get("email") or "").strip(),
        body.get("password"),
        lambda role: role == "patient",
        "This sign-in is for patient accounts only.",
    )
    if error:
        return error
    return _login_response(user)


@bp.get("/me")
@authenticate_token
def get_me():
    user = User.query.get(g.user["id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    patient_id = None
    if user.role == "patient":
        patient = Patient.query.filter_by(user_id=user.id).first()
        if patient:
            patient_id = patient.id

    return jsonify(
        {
            "user": user.to_public_dict(),
            "profile": {"role": user.role, "full_name": user.full_name},
            "patientId": patient_id,
        }
    )
