import re
from datetime import timedelta

from flask import Blueprint, abort, g, jsonify

from ..auth import authenticate_token, require, scope_ids, single_scope
from ..clinical import clinic_now, clinic_today, day_bounds, local, monday, short_facility
from ..extensions import db
from ..lookups import body, names_by_id, patient_brief, patient_or_404
from ..models import Admission, Bed, Facility, Patient, User, Ward

bp = Blueprint("admissions", __name__, url_prefix="/api")

WARD_TYPES = ("general", "isolation", "paediatric", "maternity", "surgical", "icu")


def _days(since, now):
    return (now.date() - local(since).date()).days


@bp.get("/admissions")
@authenticate_token
@require("admissions.view")
def overview():
    scope = scope_ids()
    now = clinic_now()
    today = now.date()
    facilities = {f.id: f.name for f in Facility.query.all()}
    multi = len(scope) > 1
    wards = (Ward.query.filter(Ward.facility_id.in_(scope)).join(Facility, Facility.id == Ward.facility_id)
             .order_by(Facility.name, Ward.sort_order, Ward.name).all())
    open_rows = (
        db.session.query(Admission, Patient).join(Patient, Patient.id == Admission.patient_id)
        .filter(Admission.facility_id.in_(scope), Admission.discharged_at.is_(None))
        .order_by(Admission.admitted_at).all()
    )
    by_bed = {a.bed_id: (a, p) for a, p in open_rows if a.bed_id}
    staff = names_by_id(a.admitting_doctor_id for a, _ in open_rows)
    ward_names = {w.id: w.name for w in wards}
    bed_labels = {b.id: b.bed_label for w in wards for b in w.beds}

    ward_out = []
    for w in wards:
        beds = []
        for b in w.beds:
            occ = by_bed.get(b.id)
            beds.append({
                "id": b.id, "label": b.bed_label, "status": b.status,
                "occupant": ({"code": occ[1].patient_code, "name": occ[1].name, "day": _days(occ[0].admitted_at, now) + 1}
                             if occ and b.status == "occupied" else None),
            })
        ward_out.append({
            "id": w.id, "name": (f"{short_facility(facilities[w.facility_id])}: " if multi else "") + w.name,
            "type": w.ward_type, "prefix": w.bed_prefix, "capacity": len(w.beds), "beds": beds,
            "hospital": facilities[w.facility_id],
        })

    all_beds = [b for w in ward_out for b in w["beds"]]
    week_start = day_bounds(monday(today))[0]
    month_ago = day_bounds(today - timedelta(days=30))[0]
    recent = (
        db.session.query(Admission, Patient).join(Patient, Patient.id == Admission.patient_id)
        .filter(Admission.facility_id.in_(scope), Admission.discharged_at >= month_ago).all()
    )
    stays = [(a.discharged_at - a.admitted_at).days for a, _ in recent]
    week_ago = day_bounds(today - timedelta(days=7))[0]
    recent_week = sorted(((a, p) for a, p in recent if a.discharged_at >= week_ago),
                         key=lambda r: r[0].discharged_at, reverse=True)
    all_wards = {w.id: w.name for w in Ward.query.filter(Ward.facility_id.in_(scope))}
    return jsonify({
        "hospital": facilities[scope[0]] if len(scope) == 1 else None,
        "stats": {
            "occupied": sum(1 for b in all_beds if b["status"] == "occupied"),
            "beds": len(all_beds),
            "free": sum(1 for b in all_beds if b["status"] == "available"),
            "cleaning": sum(1 for b in all_beds if b["status"] == "cleaning"),
            "reserved": sum(1 for b in all_beds if b["status"] == "reserved"),
            "thisWeek": Admission.query.filter(Admission.facility_id.in_(scope), Admission.admitted_at >= week_start).count(),
            "averageStay": round(sum(stays) / len(stays), 1) if stays else None,
        },
        "wards": ward_out,
        "open": [
            {
                "id": a.id, "patient": patient_brief(p), "ward": ward_names.get(a.ward_id), "bed": bed_labels.get(a.bed_id),
                "reason": a.reason, "doctor": staff[a.admitting_doctor_id].full_name if a.admitting_doctor_id in staff else None,
                "admitted": local(a.admitted_at).date().isoformat(), "day": _days(a.admitted_at, now) + 1,
            }
            for a, p in open_rows
        ],
        "recentDischarges": [
            {
                "id": a.id, "patient": patient_brief(p), "ward": all_wards.get(a.ward_id), "reason": a.reason,
                "stay": (a.discharged_at - a.admitted_at).days, "discharged": local(a.discharged_at).date().isoformat(),
            }
            for a, p in recent_week[:10]
        ],
        "recentDischargeCount": len(recent_week),
    })


@bp.post("/admissions")
@authenticate_token
@require("admissions.admit")
def admit():
    data = body()
    facility_id = single_scope()
    p = patient_or_404(data.get("patientCode"))
    reason = (data.get("reason") or "").strip()
    bed = db.session.get(Bed, data.get("bedId") or "")
    problems = []
    if not bed or bed.ward.facility_id != facility_id:
        problems.append("choose a free bed")
    if not reason:
        problems.append("add the reason for admission")
    if problems:
        return jsonify({"error": ", ".join(problems).capitalize() + "."}), 400
    if Admission.query.filter_by(patient_id=p.id, discharged_at=None).first():
        return jsonify({"error": f"{p.name} is already admitted."}), 400
    # Lock the bed row so two people can't admit into it at once.
    bed = db.session.query(Bed).filter_by(id=bed.id).with_for_update().one()
    if bed.status != "available":
        return jsonify({"error": f"Bed {bed.bed_label} is no longer free."}), 409
    doctor = None
    if data.get("doctorCode"):
        doctor = User.query.filter_by(staff_code=data["doctorCode"].upper(), facility_id=facility_id, role="doctor").first()
    a = Admission(facility_id=facility_id, patient_id=p.id, ward_id=bed.ward_id, bed_id=bed.id,
                  admitting_doctor_id=doctor.id if doctor else None, reason=reason, admitted_at=clinic_now())
    bed.status = "occupied"
    db.session.add(a)
    db.session.commit()
    return jsonify({"id": a.id, "patient": p.name, "bed": bed.bed_label}), 201


@bp.patch("/admissions/<adm_id>/discharge")
@authenticate_token
@require("admissions.discharge")
def discharge(adm_id):
    a = db.session.get(Admission, adm_id)
    if not a or a.facility_id not in scope_ids():
        abort(404, description="There is no such admission here.")
    if a.discharged_at:
        return jsonify({"error": "This patient has already been discharged."}), 400
    a.discharged_at = max(clinic_now(), a.admitted_at + timedelta(minutes=1))
    if a.bed_id:
        db.session.get(Bed, a.bed_id).status = "cleaning"
    p = db.session.get(Patient, a.patient_id)
    db.session.commit()
    return jsonify({"id": a.id, "patient": p.name})


@bp.patch("/beds/<bed_id>")
@authenticate_token
@require("beds.ready")
def bed_ready(bed_id):
    b = db.session.get(Bed, bed_id)
    if not b or b.ward.facility_id not in scope_ids():
        abort(404, description="There is no such bed here.")
    status = body().get("status")
    allowed = {"cleaning": {"available"}, "available": {"reserved"}, "reserved": {"available"}}
    if status not in allowed.get(b.status, set()):
        return jsonify({"error": f"Bed {b.bed_label} can't go from {b.status} to {status}."}), 400
    b.status = status
    db.session.commit()
    return jsonify({"id": b.id, "label": b.bed_label, "status": b.status})


# ---------------------------------------------------------------- ward setup
@bp.post("/wards")
@authenticate_token
@require("wards.manage")
def add_ward():
    facility_id = single_scope()
    data = body()
    name = (data.get("name") or "").strip()
    prefix = re.sub(r"[^A-Z0-9]", "", (data.get("prefix") or "").upper())[:4]
    ward_type = data.get("type") if data.get("type") in WARD_TYPES else "general"
    try:
        capacity = int(data.get("capacity"))
        assert 1 <= capacity <= 60
    except (TypeError, ValueError, AssertionError):
        return jsonify({"error": "A ward can have between 1 and 60 beds."}), 400
    if not name or not prefix:
        return jsonify({"error": "Add the ward's name and a short bed prefix such as GMW."}), 400
    if Ward.query.filter_by(facility_id=facility_id, name=name).first():
        return jsonify({"error": "This hospital already has a ward with that name."}), 400
    if Ward.query.filter_by(facility_id=facility_id, bed_prefix=prefix).first():
        return jsonify({"error": "Another ward already uses that bed prefix."}), 400
    order = (db.session.query(db.func.max(Ward.sort_order)).filter_by(facility_id=facility_id).scalar() or 0) + 1
    w = Ward(facility_id=facility_id, name=name, ward_type=ward_type, bed_prefix=prefix, capacity=capacity, sort_order=order)
    db.session.add(w)
    db.session.flush()
    for n in range(1, capacity + 1):
        db.session.add(Bed(ward_id=w.id, bed_label=f"{prefix}-{n:02d}", status="available"))
    db.session.commit()
    return jsonify({"id": w.id, "name": w.name, "capacity": capacity}), 201


@bp.patch("/wards/<ward_id>")
@authenticate_token
@require("wards.manage")
def update_ward(ward_id):
    w = db.session.get(Ward, ward_id)
    if not w or w.facility_id not in scope_ids():
        abort(404, description="There is no such ward here.")
    data = body()
    if data.get("name"):
        w.name = data["name"].strip()
    if data.get("capacity") is not None:
        try:
            capacity = int(data["capacity"])
            assert 1 <= capacity <= 60
        except (TypeError, ValueError, AssertionError):
            return jsonify({"error": "A ward can have between 1 and 60 beds."}), 400
        beds = sorted(w.beds, key=lambda b: b.bed_label)
        if capacity > len(beds):
            for n in range(len(beds) + 1, capacity + 1):
                db.session.add(Bed(ward_id=w.id, bed_label=f"{w.bed_prefix}-{n:02d}", status="available"))
        elif capacity < len(beds):
            extra = beds[capacity:]
            if any(b.status != "available" for b in extra):
                return jsonify({"error": "Only free beds can be removed. Discharge or move patients first."}), 400
            for b in extra:
                db.session.delete(b)
        w.capacity = capacity
    db.session.commit()
    return jsonify({"id": w.id, "name": w.name, "capacity": w.capacity})
