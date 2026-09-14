from collections import defaultdict

from flask import Blueprint, jsonify, request
from sqlalchemy import extract

from ..auth import authenticate_token, require_hospital
from ..models import DoseLog, Patient

bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@bp.get("")
@authenticate_token
@require_hospital
def get_reports():
    tb_type = request.args.get("tb_type")
    status = request.args.get("status")
    facility = request.args.get("facility")
    year = request.args.get("year")

    query = Patient.query
    if tb_type and tb_type != "all":
        query = query.filter(Patient.tb_type == tb_type)
    if status and status != "all":
        query = query.filter(Patient.status == status)
    if facility and facility != "all":
        query = query.filter(Patient.facility == facility)
    if year and year != "all":
        query = query.filter(extract("year", Patient.treatment_start) == int(year))

    patients = query.order_by(Patient.treatment_start.desc()).all()
    dose_logs = DoseLog.query.all()

    logs_by_patient = defaultdict(list)
    for log in dose_logs:
        logs_by_patient[log.patient_id].append(log)

    enriched = []
    for p in patients:
        logs = logs_by_patient.get(p.id, [])
        taken_count = sum(1 for log in logs if log.taken)
        row = p.to_dict()
        row["dosesLogged"] = len(logs)
        row["dosesTaken"] = taken_count
        enriched.append(row)

    return jsonify(enriched)
