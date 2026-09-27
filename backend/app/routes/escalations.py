"""What patients told the portal companion that a doctor should see (doctor, TB representative)."""
from flask import Blueprint, abort, g, jsonify, request

from ..auth import authenticate_token, require, scope_ids
from ..clinical import clinic_now
from ..escalations import escalation_dict, escalations_for
from ..extensions import db
from ..lookups import body, names_by_id
from ..models import Escalation, Patient

bp = Blueprint("escalations", __name__, url_prefix="/api")


@bp.get("/escalations")
@authenticate_token
@require("escalations.view")
def list_escalations():
    status = request.args.get("status") or "open"
    if status not in ("open", "acknowledged", "all"):
        return jsonify({"error": "Status is open, acknowledged or all."}), 400
    user = g.current_user
    mine = user.role == "doctor" and request.args.get("mine") in ("1", "true")
    return jsonify(escalations_for(scope_ids(), status, doctor_id=user.id if mine else None))


@bp.patch("/escalations/<esc_id>")
@authenticate_token
@require("escalations.handle")
def acknowledge(esc_id):
    esc = db.session.get(Escalation, esc_id)
    if not esc or esc.facility_id not in scope_ids():
        abort(404, description="There is no such escalation here.")
    if esc.status != "open":
        return jsonify({"error": "This has already been handled."}), 409
    esc.status = "acknowledged"
    esc.acknowledged_by = g.current_user.id
    esc.acknowledged_at = clinic_now()
    esc.note = (body().get("note") or "").strip()[:1000] or None
    db.session.commit()
    patient = db.session.get(Patient, esc.patient_id)
    return jsonify(escalation_dict(esc, patient, names_by_id([esc.doctor_id, esc.acknowledged_by])))
