from flask import Blueprint, g, jsonify, request

from ..auth import authenticate_token, is_hospital_role
from ..extensions import db
from ..models import DoseLog, Patient
from ..utils import parse_date

bp = Blueprint("dose_logs", __name__, url_prefix="/api/dose-logs")


def _own_patient_id(user_id):
    patient = Patient.query.filter_by(user_id=user_id).first()
    return patient.id if patient else None


@bp.get("")
@authenticate_token
def get_dose_logs():
    patient_id = request.args.get("patient_id")
    date = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    role = g.user.get("role")
    if role == "patient":
        own_patient_id = _own_patient_id(g.user["id"])
        if not own_patient_id:
            return jsonify({"error": "No patient record linked to your account"}), 404
        if patient_id and patient_id != own_patient_id:
            return jsonify({"error": "You may only view your own dose logs"}), 403
        patient_id = own_patient_id
    elif not is_hospital_role(role):
        return jsonify({"error": "Access denied"}), 403

    query = DoseLog.query
    if patient_id:
        query = query.filter(DoseLog.patient_id == patient_id)
    if date:
        query = query.filter(DoseLog.date == parse_date(date))
    if start_date:
        query = query.filter(DoseLog.date >= parse_date(start_date))
    if end_date:
        query = query.filter(DoseLog.date <= parse_date(end_date))

    logs = query.order_by(DoseLog.date.asc()).all()
    return jsonify([log.to_dict() for log in logs])


def _upsert_dose_log():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "No dose logs provided"}), 400

    rows = payload if isinstance(payload, list) else [payload]
    if not rows:
        return jsonify({"error": "No dose logs provided"}), 400

    logged_by = g.user.get("id")
    role = g.user.get("role")

    own_patient_id = None
    if role == "patient":
        own_patient_id = _own_patient_id(g.user["id"])
        if not own_patient_id:
            return jsonify({"error": "No patient record linked to your account"}), 404
    elif not is_hospital_role(role):
        return jsonify({"error": "Access denied"}), 403

    results = []
    for row in rows:
        patient_id = own_patient_id or row.get("patient_id")
        date = parse_date(row.get("date"))
        if not patient_id or not date:
            continue

        existing = DoseLog.query.filter_by(patient_id=patient_id, date=date).first()
        if existing:
            existing.taken = bool(row.get("taken"))
            if row.get("notes") is not None:
                existing.notes = row.get("notes")
            existing.logged_by = logged_by
            log = existing
        else:
            log = DoseLog(
                patient_id=patient_id,
                date=date,
                taken=bool(row.get("taken")),
                notes=row.get("notes"),
                logged_by=logged_by,
            )
            db.session.add(log)

        db.session.flush()
        results.append(log.to_dict())

    db.session.commit()
    return jsonify({"message": f"Successfully logged {len(results)} dose record(s)", "data": results})


@bp.post("")
@authenticate_token
def upsert_dose_log_root():
    return _upsert_dose_log()


@bp.post("/upsert")
@authenticate_token
def upsert_dose_log():
    return _upsert_dose_log()
