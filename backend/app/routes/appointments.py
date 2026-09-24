from datetime import datetime, time, timedelta

from flask import Blueprint, abort, g, jsonify, request

from ..auth import authenticate_token, can, require, scope_ids, single_scope
from ..clinical import clinic_now, clinic_today, day_bounds, local, monday, tz
from ..extensions import db
from ..lookups import body, names_by_id, patient_brief, patient_or_404
from ..models import Appointment, Facility, Patient, User, Visit
from ..utils import parse_date
from .dashboard import schedule_for

bp = Blueprint("appointments", __name__, url_prefix="/api")

SLOTS = [f"{(8 * 60 + i * 40) // 60:02d}:{(8 * 60 + i * 40) % 60:02d}" for i in range(12)]  # 08:00..15:20
PRIORITY_RANK = {"urgent": 0, "moderate": 1, "low": 2}


def _doctor(code, scope):
    q = User.query.filter(User.staff_code == (code or "").upper(), User.role == "doctor", User.facility_id.in_(scope))
    d = q.first()
    if not d:
        abort(400, description="Choose a doctor from the list.")
    return d


def _day():
    return parse_date(request.args.get("date")) or clinic_today()


@bp.get("/appointments")
@authenticate_token
@require("appointments.view")
def day_schedule():
    scope = scope_ids()
    day = _day()
    doctor = _doctor(request.args["doctor"], scope) if request.args.get("doctor") else None
    rows = schedule_for(scope, day, doctor.id if doctor else None)
    by = lambda st: sum(1 for r in rows if r["status"] == st)  # noqa: E731
    return jsonify({
        "date": day.isoformat(),
        "today": clinic_today().isoformat(),
        "rows": rows,
        "stats": {
            "booked": len(rows), "seen": by("completed"), "scheduled": by("scheduled"),
            "noShow": by("no_show"), "cancelled": by("cancelled"),
            "online": sum(1 for r in rows if r["via"] == "patient_portal"),
        },
    })


@bp.get("/appointments/week")
@authenticate_token
@require("appointments.view")
def week():
    scope = scope_ids()
    start = monday(parse_date(request.args.get("start")) or clinic_today())
    doctor = _doctor(request.args["doctor"], scope) if request.args.get("doctor") else None
    lo, hi = day_bounds(start)[0], day_bounds(start + timedelta(days=7))[0]
    q = Appointment.query.filter(Appointment.facility_id.in_(scope), Appointment.scheduled_at >= lo,
                                 Appointment.scheduled_at < hi)
    if doctor:
        q = q.filter(Appointment.doctor_id == doctor.id)
    counts = {}
    for a in q.all():
        d = local(a.scheduled_at).date().isoformat()
        counts[d] = counts.get(d, 0) + 1
    days = [start + timedelta(days=i) for i in range(7)]
    return jsonify({"start": start.isoformat(), "today": clinic_today().isoformat(),
                    "days": [{"date": d.isoformat(), "count": counts.get(d.isoformat(), 0)} for d in days]})


def free_slots(doctor, day):
    now = clinic_now()
    closed = day.isoweekday() >= 6
    lo, hi = day_bounds(day)
    taken = {
        local(a.scheduled_at).strftime("%H:%M")
        for a in Appointment.query.filter(Appointment.doctor_id == doctor.id, Appointment.scheduled_at >= lo,
                                          Appointment.scheduled_at < hi, Appointment.status != "cancelled")
    }
    out = []
    for s in SLOTS:
        past = day < now.date() or (day == now.date() and s <= now.strftime("%H:%M"))
        out.append({"time": s, "free": not (closed or past or s in taken),
                    "why": "closed" if closed else "past" if past else "taken" if s in taken else None})
    return out, closed


@bp.get("/appointments/slots")
@authenticate_token
@require("appointments.view")
def slots():
    doctor = _doctor(request.args.get("doctor"), scope_ids())
    day = _day()
    out, closed = free_slots(doctor, day)
    return jsonify({"date": day.isoformat(), "doctor": doctor.full_name, "closed": closed,
                    "onLeave": doctor.duty_status == "on_leave",
                    "slots": out, "free": sum(1 for s in out if s["free"]), "total": len(out)})


@bp.post("/appointments")
@authenticate_token
@require("appointments.book")
def book():
    data = body()
    facility_id = single_scope()
    p = patient_or_404(data.get("patientCode"))
    doctor = _doctor(data.get("doctorCode"), [facility_id])
    day = parse_date(data.get("date"))
    at = data.get("time")
    if not day or at not in SLOTS:
        return jsonify({"error": "Pick a date and a time."}), 400
    if doctor.duty_status != "on_duty":
        return jsonify({"error": f"{doctor.full_name} is not taking bookings right now."}), 400
    out, closed = free_slots(doctor, day)
    slot = next(s for s in out if s["time"] == at)
    if closed:
        return jsonify({"error": "The clinic is closed at weekends."}), 400
    if not slot["free"]:
        return jsonify({"error": "That time has gone. Pick another slot."}), 409
    hh, mm = map(int, at.split(":"))
    a = Appointment(facility_id=facility_id, patient_id=p.id, doctor_id=doctor.id,
                    scheduled_at=datetime.combine(day, time(hh, mm), tzinfo=tz()), duration_min=30,
                    reason=(data.get("reason") or "").strip() or "General consultation", status="scheduled",
                    booked_via="reception", booked_by=g.current_user.id)
    db.session.add(a)
    db.session.commit()
    return jsonify({"id": a.id, "patient": p.name, "doctor": doctor.full_name, "date": day.isoformat(), "time": at}), 201


@bp.patch("/appointments/<appt_id>")
@authenticate_token
@require("appointments.book")
def set_status(appt_id):
    a = db.session.get(Appointment, appt_id)
    if not a or a.facility_id not in scope_ids():
        abort(404, description="There is no such appointment here.")
    status = body().get("status")
    if status not in ("completed", "cancelled", "no_show"):
        return jsonify({"error": "Choose seen, cancelled or did not come."}), 400
    if status in ("completed", "no_show") and local(a.scheduled_at).date() > clinic_today():
        return jsonify({"error": "This appointment hasn't happened yet."}), 400
    a.status = status
    db.session.commit()
    return jsonify({"id": a.id, "status": a.status})


# ---------------------------------------------------------------- walk-in queue
def _visit_row(v, p, staff, now, facilities):
    return {
        "id": v.id,
        "patient": patient_brief(p),
        "priority": v.priority,
        "status": v.status,
        "arrived": local(v.arrived_at).strftime("%H:%M"),
        "waitMin": int(((v.started_at or now) - v.arrived_at).total_seconds() // 60),
        "doctor": staff[v.doctor_id].full_name if v.doctor_id in staff else None,
        "hospital": facilities.get(v.facility_id),
    }


def busy_doctor_ids(scope, now):
    lo, hi = day_bounds(now.date())
    return {
        v.doctor_id for v in Visit.query.filter(Visit.facility_id.in_(scope), Visit.status == "in_consultation",
                                                 Visit.arrived_at >= lo, Visit.arrived_at < hi)
    }


def free_doctors(scope, now):
    busy = busy_doctor_ids(scope, now)
    return [d for d in User.query.filter(User.facility_id.in_(scope), User.role == "doctor", User.is_active,
                                         User.duty_status == "on_duty").order_by(User.staff_code)
            if d.id not in busy]


@bp.get("/visits")
@authenticate_token
@require("queue.view")
def queue():
    scope = scope_ids()
    now = clinic_now()
    lo, hi = day_bounds(now.date())
    rows = (
        db.session.query(Visit, Patient).join(Patient, Patient.id == Visit.patient_id)
        .filter(Visit.facility_id.in_(scope), Visit.arrived_at >= lo, Visit.arrived_at < hi).all()
    )
    staff = names_by_id(v.doctor_id for v, _ in rows)
    facilities = {f.id: f.name for f in Facility.query.all()}
    items = [_visit_row(v, p, staff, now, facilities) for v, p in rows]
    arrival = {v.id: v.arrived_at for v, _ in rows}
    waiting = sorted((r for r in items if r["status"] == "waiting"),
                     key=lambda r: (PRIORITY_RANK[r["priority"]], arrival[r["id"]]))
    in_con = sorted((r for r in items if r["status"] == "in_consultation"), key=lambda r: arrival[r["id"]])
    done = sorted((r for r in items if r["status"] == "completed"), key=lambda r: arrival[r["id"]], reverse=True)
    free = free_doctors(scope, now)
    return jsonify({
        "now": now.strftime("%H:%M"), "waiting": waiting, "inConsultation": in_con, "completed": done,
        "total": len(items), "freeDoctors": [{"code": d.staff_code, "name": d.full_name} for d in free],
    })


@bp.post("/visits")
@authenticate_token
@require("queue.add")
def add_walk_in():
    data = body()
    facility_id = single_scope()
    p = patient_or_404(data.get("patientCode"))
    now = clinic_now()
    lo, hi = day_bounds(now.date())
    if Visit.query.filter(Visit.patient_id == p.id, Visit.status != "completed", Visit.arrived_at >= lo).first():
        return jsonify({"error": f"{p.name} is already in today's queue."}), 400
    priority = data.get("priority") if data.get("priority") in PRIORITY_RANK else "low"
    v = Visit(facility_id=facility_id, patient_id=p.id, priority=priority, status="waiting", arrived_at=now)
    db.session.add(v)
    db.session.commit()
    return jsonify({"id": v.id, "patient": p.name}), 201


@bp.patch("/visits/<visit_id>")
@authenticate_token
@require("queue.call")
def update_visit(visit_id):
    v = db.session.get(Visit, visit_id)
    if not v or v.facility_id not in scope_ids():
        abort(404, description="That walk-in isn't in the queue here.")
    data = body()
    now = clinic_now()
    p = db.session.get(Patient, v.patient_id)
    if data.get("action") == "call":
        if v.status != "waiting":
            return jsonify({"error": "This patient has already been called in."}), 400
        free = free_doctors([v.facility_id], now)
        user = g.current_user
        if data.get("doctorCode"):
            doctor = next((d for d in free if d.staff_code == data["doctorCode"].upper()), None)
        else:
            # A doctor calling someone in takes them if free; otherwise the next free doctor does.
            doctor = next((d for d in free if d.id == user.id), None) or (free[0] if free else None)
        if not doctor:
            return jsonify({"error": "No doctor is free right now."}), 409
        v.status, v.doctor_id, v.started_at = "in_consultation", doctor.id, now
        db.session.commit()
        return jsonify({"id": v.id, "patient": p.name, "doctor": doctor.full_name})
    if data.get("action") == "finish":
        if v.status != "in_consultation":
            return jsonify({"error": "This patient isn't with a doctor."}), 400
        v.status, v.completed_at = "completed", now
        db.session.commit()
        return jsonify({"id": v.id, "patient": p.name})
    return jsonify({"error": "Call in or finish."}), 400
