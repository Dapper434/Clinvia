from flask import Blueprint, g, jsonify, request

from ..auth import authenticate_token, hash_password, require_hospital
from ..extensions import db
from ..models import Contact, DoseLog, LabResult, Patient, User
from ..utils import parse_date

bp = Blueprint("patients", __name__, url_prefix="/api/patients")


@bp.get("")
@authenticate_token
@require_hospital
def get_patients():
    search = request.args.get("search")
    status = request.args.get("status")
    facility = request.args.get("facility")

    query = Patient.query
    if status and status != "all":
        query = query.filter(Patient.status == status)
    if facility and facility != "all":
        query = query.filter(Patient.facility == facility)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            db.or_(
                db.func.lower(Patient.name).like(term),
                db.func.lower(Patient.phone).like(term),
                db.func.lower(Patient.regimen).like(term),
            )
        )

    patients = query.order_by(Patient.created_at.desc()).all()
    return jsonify([p.to_dict() for p in patients])


@bp.get("/<patient_id>")
@authenticate_token
@require_hospital
def get_patient_by_id(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    dose_logs = DoseLog.query.filter_by(patient_id=patient_id).order_by(DoseLog.date.asc()).all()
    lab_results = LabResult.query.filter_by(patient_id=patient_id).order_by(LabResult.result_date.desc()).all()
    contacts = Contact.query.filter_by(source_patient_id=patient_id).order_by(Contact.name.asc()).all()

    payload = patient.to_dict()
    payload["doseLogs"] = [d.to_dict() for d in dose_logs]
    payload["labResults"] = [l.to_dict() for l in lab_results]
    payload["contacts"] = [c.to_dict() for c in contacts]
    return jsonify(payload)


@bp.post("")
@authenticate_token
@require_hospital
def create_patient():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    treatment_start = body.get("treatment_start")

    if not name or not treatment_start:
        return jsonify({"error": "Patient name and treatment start date are required"}), 400

    user_id = None
    patient_email = body.get("patientEmail")
    patient_password = body.get("patientPassword")
    if patient_email and patient_password:
        email_clean = patient_email.lower().strip()
        existing_user = User.query.filter_by(email=email_clean).first()
        if existing_user:
            user_id = existing_user.id
        else:
            new_user = User(
                email=email_clean,
                password_hash=hash_password(patient_password),
                role="patient",
                full_name=name,
            )
            db.session.add(new_user)
            db.session.flush()
            user_id = new_user.id

    def parse_int(v):
        return None if v in (None, "") else int(v)

    def parse_float(v):
        if v in (None, ""):
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    patient = Patient(
        user_id=user_id,
        name=name,
        age=parse_int(body.get("age")),
        gender=body.get("gender") or "male",
        phone=body.get("phone"),
        address=body.get("address"),
        facility=body.get("facility"),
        tb_type=body.get("tb_type") or "pulmonary",
        regimen=body.get("regimen") or "HRZE",
        treatment_start=parse_date(treatment_start),
        status=body.get("status") or "active",
        mdr_flag=bool(body.get("mdr_flag")),
        lat=parse_float(body.get("lat")),
        lng=parse_float(body.get("lng")),
        registered_by=g.user.get("id"),
    )
    db.session.add(patient)
    db.session.commit()

    return jsonify(patient.to_dict()), 201


@bp.patch("/<patient_id>")
@bp.put("/<patient_id>")
@authenticate_token
@require_hospital
def update_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    body = request.get_json(silent=True) or {}

    def parse_int(v):
        return None if v in (None, "") else int(v)

    def parse_float(v):
        if v in (None, ""):
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    if body.get("name") is not None:
        patient.name = body["name"]
    patient.age = parse_int(body.get("age"))
    if body.get("gender") is not None:
        patient.gender = body["gender"]
    patient.phone = body.get("phone")
    patient.address = body.get("address")
    patient.facility = body.get("facility")
    if body.get("tb_type") is not None:
        patient.tb_type = body["tb_type"]
    patient.regimen = body.get("regimen")
    if body.get("treatment_start") is not None:
        patient.treatment_start = parse_date(body["treatment_start"])
    if body.get("status") is not None:
        patient.status = body["status"]
    if body.get("mdr_flag") is not None:
        patient.mdr_flag = bool(body["mdr_flag"])
    patient.lat = parse_float(body.get("lat"))
    patient.lng = parse_float(body.get("lng"))

    db.session.commit()
    return jsonify(patient.to_dict())


@bp.delete("/<patient_id>")
@authenticate_token
@require_hospital
def delete_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"message": "Patient deleted successfully", "id": patient_id})
