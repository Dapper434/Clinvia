from flask import Blueprint, jsonify, request

from ..auth import authenticate_token, require_hospital
from ..extensions import db
from ..models import Contact
from ..utils import parse_date

bp = Blueprint("contacts", __name__, url_prefix="/api/contacts")


@bp.get("")
@authenticate_token
@require_hospital
def get_contacts():
    source_patient_id = request.args.get("source_patient_id")
    query = Contact.query
    if source_patient_id:
        query = query.filter(Contact.source_patient_id == source_patient_id)
    contacts = query.order_by(Contact.name.asc()).all()
    return jsonify([c.to_dict() for c in contacts])


@bp.post("")
@authenticate_token
@require_hospital
def create_contact():
    body = request.get_json(silent=True) or {}
    source_patient_id = body.get("source_patient_id")
    name = (body.get("name") or "").strip() if body.get("name") else None

    if not source_patient_id or not name:
        return jsonify({"error": "Source patient ID and contact name are required"}), 400

    age = body.get("age")
    parsed_age = None if age in (None, "") else int(age)

    contact = Contact(
        source_patient_id=source_patient_id,
        name=name,
        age=parsed_age,
        relationship=body.get("relationship") or "other",
        phone=body.get("phone"),
        screened=bool(body.get("screened")),
        screen_result=body.get("screen_result"),
        screened_date=parse_date(body.get("screened_date")),
    )
    db.session.add(contact)
    db.session.commit()
    return jsonify(contact.to_dict()), 201


@bp.patch("/<contact_id>")
@authenticate_token
@require_hospital
def update_contact(contact_id):
    contact = Contact.query.get(contact_id)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404

    body = request.get_json(silent=True) or {}

    if body.get("name") is not None:
        contact.name = body["name"]
    if "age" in body:
        age = body.get("age")
        contact.age = None if age in (None, "") else int(age)
    if body.get("relationship") is not None:
        contact.relationship = body["relationship"]
    if "phone" in body:
        contact.phone = body.get("phone")
    if body.get("screened") is not None:
        contact.screened = bool(body["screened"])
    if "screen_result" in body:
        contact.screen_result = body.get("screen_result")
    if "screened_date" in body:
        contact.screened_date = parse_date(body.get("screened_date"))

    db.session.commit()
    return jsonify(contact.to_dict())
