from datetime import timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select

from ..auth import authenticate_token, can, is_network_view, require, scope_ids
from ..clinical import (
    active_episodes,
    adherence,
    attention,
    clinic_now,
    clinic_today,
    day_bounds,
    dose_days,
    dose_maps,
    local,
    short_facility,
    weekly_admissions,
)
from ..extensions import db
from ..lookups import names_by_id, patient_brief
from ..models import Appointment, Bed, Facility, Patient, TbEpisode, User, Visit, Ward

bp = Blueprint("dashboard", __name__, url_prefix="/api")


def _mine():
    user = g.current_user
    return user.role == "doctor" and request.args.get("mine") in ("1", "true")


def schedule_for(scope, day, doctor_id=None):
    lo, hi = day_bounds(day)
    q = (
        db.session.query(Appointment, Patient)
        .join(Patient, Patient.id == Appointment.patient_id)
        .filter(Appointment.facility_id.in_(scope), Appointment.scheduled_at >= lo, Appointment.scheduled_at < hi)
    )
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    rows = q.order_by(Appointment.scheduled_at, Appointment.id).all()
    staff = names_by_id(a.doctor_id for a, _ in rows)
    facilities = {f.id: f.name for f in Facility.query.all()}
    return [
        {
            "id": a.id,
            "at": local(a.scheduled_at).strftime("%Y-%m-%dT%H:%M"),
            "time": local(a.scheduled_at).strftime("%H:%M"),
            "patient": patient_brief(p),
            "reason": a.reason,
            "doctor": staff[a.doctor_id].full_name if a.doctor_id in staff else None,
            "doctorCode": staff[a.doctor_id].staff_code if a.doctor_id in staff else None,
            "via": a.booked_via,
            "status": a.status,
            "hospital": facilities.get(a.facility_id),
        }
        for a, p in rows
    ]


def beds_by_ward(scope, prefix_hospital=False):
    wards = (
        Ward.query.filter(Ward.facility_id.in_(scope))
        .join(Facility, Facility.id == Ward.facility_id)
        .order_by(Facility.name, Ward.sort_order, Ward.name)
        .all()
    )
    counts = {}
    for ward_id, status, n in db.session.execute(
        select(Bed.ward_id, Bed.status, func.count()).where(Bed.ward_id.in_([w.id for w in wards])).group_by(Bed.ward_id, Bed.status)
    ):
        counts.setdefault(ward_id, {})[status] = n
    facilities = {f.id: f.name for f in Facility.query.all()}
    out = []
    for w in wards:
        c = counts.get(w.id, {})
        out.append({
            "id": w.id,
            "name": (f"{short_facility(facilities[w.facility_id])}: " if prefix_hospital else "") + w.name,
            "ward": w.name,
            "hospital": facilities[w.facility_id],
            "capacity": sum(c.values()) or w.capacity,
            "occupied": c.get("occupied", 0),
            "cleaning": c.get("cleaning", 0),
            "reserved": c.get("reserved", 0),
            "available": c.get("available", 0),
        })
    return out


def queue_summary(scope, now):
    lo, hi = day_bounds(now.date())
    visits = Visit.query.filter(Visit.facility_id.in_(scope), Visit.arrived_at >= lo, Visit.arrived_at < hi).all()
    waiting = [v for v in visits if v.status == "waiting"]
    return {
        "total": len(visits),
        "waiting": len(waiting),
        "inConsultation": sum(1 for v in visits if v.status == "in_consultation"),
        "completed": sum(1 for v in visits if v.status == "completed"),
        "longestWaitMin": max((int((now - v.arrived_at).total_seconds() // 60) for v in waiting), default=0),
        "urgentWaiting": sum(1 for v in waiting if v.priority == "urgent"),
    }


@bp.get("/dashboard")
@authenticate_token
@require("dashboard.view")
def dashboard():
    user = g.current_user
    role = user.role
    scope = scope_ids()
    now = clinic_now()
    today = now.date()
    network = is_network_view()
    doctor_id = user.id if _mine() else None
    clinical = can(role, "patients.clinical")

    schedule = schedule_for(scope, today, doctor_id)
    lo_lw, hi_lw = day_bounds(today - timedelta(days=7))
    q_lw = Appointment.query.filter(
        Appointment.facility_id.in_(scope), Appointment.scheduled_at >= lo_lw, Appointment.scheduled_at < hi_lw
    )
    if doctor_id:
        q_lw = q_lw.filter(Appointment.doctor_id == doctor_id)
    wards = beds_by_ward(scope, prefix_hospital=network)
    doctors = User.query.filter(User.facility_id.in_(scope), User.role == "doctor", User.is_active).all()
    eps = active_episodes(scope)
    queue = queue_summary(scope, now)

    payload = {
        "today": today.isoformat(),
        "now": now.strftime("%H:%M"),
        "network": network,
        "mine": bool(doctor_id),
        "stats": {
            "appointmentsToday": len(schedule),
            "sameDayLastWeek": q_lw.count(),
            "walkIns": queue["total"],
            "waiting": queue["waiting"],
            "bedsOccupied": sum(w["occupied"] for w in wards),
            "beds": sum(w["capacity"] for w in wards),
            "bedsFree": sum(w["available"] for w in wards),
            "wards": len(wards),
            "activeTb": len(eps),
            "mdr": sum(1 for e, _ in eps if e.mdr_flag),
            "doctors": len(doctors),
            "doctorsOnDuty": sum(1 for d in doctors if d.duty_status == "on_duty"),
            "doctorsOnLeave": [d.full_name for d in doctors if d.duty_status == "on_leave"],
        },
        "schedule": schedule,
        "queue": queue,
        "bedsByWard": wards,
        "weeklyAdmissions": weekly_admissions(scope, today),
    }

    if role == "receptionist":
        return jsonify(payload)
    if role == "executive":
        # Executives get today's workload per doctor, not the patient list.
        per = {}
        for row in schedule:
            d = per.setdefault(row["doctor"], {"doctor": row["doctor"], "booked": 0, "seen": 0})
            d["booked"] += 1
            d["seen"] += row["status"] == "completed"
        payload["schedule"] = []
        payload["scheduleByDoctor"] = sorted(per.values(), key=lambda d: -d["booked"])

    att = attention(scope, today, doctor_id)
    if clinical:
        payload["attention"] = att
    else:
        # Executives see how many patients need attention and why, not who they are.
        payload["attention"] = None
        payload["attentionSummary"] = {
            "total": len(att),
            "missed": sum(1 for a in att if a["kind"] == "missed"),
            "notConverted": sum(1 for a in att if a["kind"] == "not_converted"),
            "pending": sum(1 for a in att if a["kind"] == "pending_genexpert"),
        }

    payload["doseDays"] = dose_days(scope, today)
    logs = dose_maps([p.id for _, p in eps], since=today - timedelta(days=31))
    adh = sorted(
        ({"code": p.patient_code, "name": p.name, "value": adherence(logs.get(p.id, {}), today)} for _, p in eps),
        key=lambda r: (r["value"] is None, r["value"] if r["value"] is not None else 0),
    )
    if clinical:
        payload["adherence"] = adh
    else:
        vals = [r["value"] for r in adh if r["value"] is not None]
        payload["adherenceBands"] = {
            "good": sum(1 for v in vals if v >= 80),
            "watch": sum(1 for v in vals if 60 <= v < 80),
            "poor": sum(1 for v in vals if v < 60),
            "average": round(sum(vals) / len(vals)) if vals else None,
        }

    outcomes = dict(db.session.execute(
        select(TbEpisode.status, func.count())
        .join(Patient, Patient.id == TbEpisode.patient_id)
        .where(Patient.facility_id.in_(scope), TbEpisode.status != "active")
        .group_by(TbEpisode.status)
    ).all())
    payload["outcomes"] = outcomes

    if clinical:
        recent = Patient.query.filter(Patient.facility_id.in_(scope)).order_by(Patient.created_at.desc()).limit(5).all()
        payload["recent"] = [
            {**patient_brief(p), "registered": local(p.created_at).date().isoformat()} for p in recent
        ]
    return jsonify(payload)


@bp.get("/attention")
@authenticate_token
@require("patients.clinical")
def attention_list():
    doctor_id = g.current_user.id if _mine() else None
    return jsonify(attention(scope_ids(), clinic_today(), doctor_id))


@bp.get("/badges")
@authenticate_token
@require("dashboard.view")
def badges():
    """Counts for the sidebar: patients needing attention, and doses still to log today."""
    role = g.current_user.role
    scope = scope_ids()
    today = clinic_today()
    out = {"attention": None, "dosesLeft": None}
    if can(role, "patients.clinical"):
        out["attention"] = len(attention(scope, today))
    if can(role, "doses.view"):
        eps = active_episodes(scope)
        logged = dose_maps([p.id for _, p in eps], since=today)
        out["dosesLeft"] = sum(1 for e, p in eps if e.treatment_start <= today and today not in logged.get(p.id, {}))
    return jsonify(out)
