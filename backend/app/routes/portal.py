from datetime import date

from flask import Blueprint, g, jsonify, request

from ..auth import authenticate_token
from ..extensions import db
from ..models import DoseLog, LabResult, Patient, User
from ..utils import parse_date

bp = Blueprint("portal", __name__, url_prefix="/api/patient-portal")


@bp.get("/my-treatment")
@authenticate_token
def get_my_treatment():
    user_id = g.user["id"]
    patient = Patient.query.filter_by(user_id=user_id).first()

    if not patient:
        user = User.query.get(user_id)
        default_name = (user.full_name if user else None) or (
            user.email.split("@")[0] if user and user.email else "Patient"
        )
        patient = Patient(
            user_id=user_id,
            name=default_name,
            tb_type="pulmonary",
            regimen="HRZE",
            treatment_start=date.today(),
            status="active",
        )
        db.session.add(patient)
        db.session.commit()

    dose_logs = DoseLog.query.filter_by(patient_id=patient.id).order_by(DoseLog.date.asc()).all()
    lab_results = LabResult.query.filter_by(patient_id=patient.id).order_by(LabResult.result_date.desc()).all()

    return jsonify(
        {
            "patient": patient.to_dict(),
            "doseLogs": [d.to_dict() for d in dose_logs],
            "labResults": [l.to_dict() for l in lab_results],
        }
    )


@bp.post("/log-dose")
@authenticate_token
def log_my_dose():
    user_id = g.user["id"]
    body = request.get_json(silent=True) or {}
    log_date = parse_date(body.get("date")) or date.today()
    taken = bool(body.get("taken"))
    notes = body.get("notes")

    patient = Patient.query.filter_by(user_id=user_id).first()
    if not patient:
        return jsonify({"error": "No patient record linked to your account"}), 404

    existing = DoseLog.query.filter_by(patient_id=patient.id, date=log_date).first()
    if existing:
        existing.taken = taken
        existing.notes = notes if notes is not None else existing.notes
        existing.logged_by = user_id
        log = existing
    else:
        log = DoseLog(patient_id=patient.id, date=log_date, taken=taken, notes=notes, logged_by=user_id)
        db.session.add(log)

    db.session.commit()
    return jsonify({"message": "Dose logged successfully", "data": log.to_dict()})
