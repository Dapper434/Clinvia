from flask import Blueprint, jsonify, request

from ..auth import authenticate_token, optional_auth, require_hospital
from ..extensions import db
from ..models import Facility

bp = Blueprint("facilities", __name__, url_prefix="/api/facilities")


@bp.get("")
@optional_auth
def get_facilities():
    facilities = Facility.query.order_by(Facility.name.asc()).all()
    return jsonify([f.to_dict() for f in facilities])


@bp.post("")
@authenticate_token
@require_hospital
def create_facility():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Facility name is required"}), 400

    def parse_float(v):
        if v in (None, ""):
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    facility = Facility(
        name=name,
        county=body.get("county"),
        sub_county=body.get("sub_county"),
        lat=parse_float(body.get("lat")),
        lng=parse_float(body.get("lng")),
        phone=body.get("phone"),
    )
    db.session.add(facility)
    db.session.commit()
    return jsonify(facility.to_dict()), 201
