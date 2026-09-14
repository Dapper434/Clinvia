from flask import Blueprint, jsonify, request

from ..auth import authenticate_token, require_hospital
from ..extensions import db
from ..models import LabResult, Patient
from ..utils import parse_date

bp = Blueprint("labs", __name__, url_prefix="/api/labs")


@bp.get("")
@authenticate_token
@require_hospital
def get_labs():
    patient_id = request.args.get("patient_id")
    query = LabResult.query
    if patient_id:
        query = query.filter(LabResult.patient_id == patient_id)
    results = query.order_by(LabResult.result_date.desc()).all()
    return jsonify([r.to_dict() for r in results])


@bp.post("")
@authenticate_token
@require_hospital
def create_lab():
    body = request.get_json(silent=True) or {}
    patient_id = body.get("patient_id")
    test_type = body.get("test_type")
    result = body.get("result")
    result_date = body.get("result_date")

    if not patient_id or not test_type or not result or not result_date:
        return jsonify({"error": "Patient ID, test type, result, and result date are required"}), 400

    lab = LabResult(
        patient_id=patient_id,
        test_type=test_type,
        result=result,
        result_date=parse_date(result_date),
        lab_ref=body.get("lab_ref"),
        notes=body.get("notes"),
        mdr_detected=bool(body.get("mdr_detected")),
    )
    db.session.add(lab)

    if body.get("mdr_detected"):
        patient = Patient.query.get(patient_id)
        if patient:
            patient.mdr_flag = True

    db.session.commit()
    return jsonify(lab.to_dict()), 201
