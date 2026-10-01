from datetime import datetime, time, timedelta

from flask import Blueprint, g, jsonify, request

from .. import assistant
from ..auth import authenticate_token, require_patient
from ..clinical import adherence, best_taken_streak, clinic_today, lab_label, local, miss_streak, taken_streak, tz
from ..extensions import db
from ..lookups import body, doctor_brief
from ..models import Appointment, DoseLog, LabResult, Medication, Patient, PatientFile, User
from ..reminder_messages import STYLES, normalise_style
from ..reminders import build_reminder, effective_dose_time, push_enabled
from ..utils import parse_date
from .appointments import SLOTS, free_slots
from .patients import _store_upload, file_response

bp = Blueprint("portal", __name__, url_prefix="/api/patient-portal")


def _me():
    return Patient.query.filter_by(user_id=g.current_user.id).first()


def _reminder_payload(patient, today, streak):
    preview = build_reminder(patient, today, streak)
    return {
        "doseTime": effective_dose_time(patient).strftime("%H:%M"),
        "setByDoctor": patient.dose_time is not None,
        "pushConfigured": push_enabled(),
        "style": normalise_style(patient.reminder_style),
        "styles": [{"id": k, "label": v} for k, v in STYLES.items()],
        "preview": {"title": preview["title"], "body": preview["body"]},
    }


@bp.get("/my-treatment")
@authenticate_token
@require_patient
def get_my_treatment():
    patient = _me()
    if not patient:
        return jsonify({"patient": None, "needsLink": True})
    today = clinic_today()
    e = patient.active_episode
    dose_logs = DoseLog.query.filter_by(patient_id=patient.id).order_by(DoseLog.date.asc()).all()
    log = {d.date: (d.taken, d.source) for d in dose_logs}
    labs = LabResult.query.filter_by(patient_id=patient.id).order_by(LabResult.collected_at.desc()).all()
    meds = Medication.query.filter_by(patient_id=patient.id, active=True).order_by(Medication.drug_name).all()
    appts = Appointment.query.filter_by(patient_id=patient.id).order_by(Appointment.scheduled_at).all()
    files = PatientFile.query.filter_by(patient_id=patient.id).order_by(PatientFile.uploaded_at.desc()).all()
    doctors = {u.id: u for u in User.query.filter(User.id.in_([a.doctor_id for a in appts])).all()} if appts else {}
    data = patient.to_dict()
    data["treatment_start"] = e.treatment_start.isoformat() if e else None
    data["tb_type"] = e.tb_type if e else None
    data["regimen"] = e.regimen if e else None
    data["mdr_flag"] = e.mdr_flag if e else False
    data["status"] = e.status if e else None
    return jsonify({
        "patient": data,
        "onTreatment": e is not None,
        "doseLogs": [d.to_dict() for d in dose_logs],
        "adherence": adherence(log, today) if e else None,
        "streak": miss_streak(log, today) if e else 0,
        "labResults": [{**l.to_dict(), "test": lab_label(l.test_type), "result_date": l.collected_at.isoformat()} for l in labs],
        "medications": [m.to_dict() for m in meds],
        "appointments": [
            {"id": a.id, "at": local(a.scheduled_at).strftime("%Y-%m-%dT%H:%M"), "reason": a.reason, "status": a.status,
             "via": a.booked_via, "doctor": doctors[a.doctor_id].full_name if a.doctor_id in doctors else None}
            for a in appts
        ],
        "files": [f.to_dict() for f in files],
        "doctors": [doctor_brief(d) for d in User.query.filter_by(
            facility_id=patient.facility_id, role="doctor", duty_status="on_duty", is_active=True
        ).order_by(User.staff_code)] if patient.facility_id else [],
        "reminder": _reminder_payload(patient, today, taken_streak(log, today) if e else 0),
        "checkInStreak": {"current": taken_streak(log, today), "best": best_taken_streak(log)} if e else None,
        "today": today.isoformat(),
    })


@bp.post("/link")
@authenticate_token
@require_patient
def link_record():
    if _me():
        return jsonify({"error": "Your account is already linked to your record."}), 400
    code = (body().get("code") or "").strip().upper()
    p = Patient.query.filter_by(portal_link_code=code, user_id=None).first() if code else None
    if not p:
        return jsonify({"error": "That link code isn't valid. Check it with your clinic."}), 400
    p.user_id = g.current_user.id
    p.portal_link_code = None
    db.session.commit()
    return jsonify({"code": p.patient_code})


@bp.post("/log-dose")
@authenticate_token
@require_patient
def log_my_dose():
    """Patients check in a dose they took. A missed dose is always recorded by staff."""
    patient = _me()
    if not patient:
        return jsonify({"error": "No patient record linked to your account"}), 404
    e = patient.active_episode
    if not e:
        return jsonify({"error": "You aren't on TB treatment, so there are no doses to log."}), 400
    data = body()
    today = clinic_today()
    log_date = parse_date(data.get("date")) or today
    if log_date > today or log_date < today - timedelta(days=1):
        return jsonify({"error": "You can check in today's or yesterday's dose."}), 400
    if data.get("taken") is False:
        return jsonify({"error": "If you missed a dose, tell your clinic — they'll record it."}), 400
    existing = DoseLog.query.filter_by(patient_id=patient.id, date=log_date).first()
    if existing and existing.source == "clinic_dot":
        return jsonify({"error": "Your clinic has already recorded this dose."}), 409
    if existing:
        existing.taken = True
        log = existing
    else:
        log = DoseLog(patient_id=patient.id, episode_id=e.id, date=log_date, taken=True, source="patient_portal",
                      notes=data.get("notes"), logged_by=g.current_user.id)
        db.session.add(log)
    db.session.commit()
    return jsonify({"message": "Dose logged successfully", "data": log.to_dict()})


@bp.get("/slots")
@authenticate_token
@require_patient
def my_slots():
    patient = _me()
    doctor = User.query.filter_by(staff_code=(request.args.get("doctor") or "").upper(), role="doctor",
                                  facility_id=patient.facility_id if patient else None).first()
    day = parse_date(request.args.get("date"))
    if not doctor or not day:
        return jsonify({"error": "Choose a doctor and a date."}), 400
    out, closed = free_slots(doctor, day)
    return jsonify({"slots": out, "closed": closed})


@bp.post("/appointments")
@authenticate_token
@require_patient
def book_my_appointment():
    patient = _me()
    if not patient or not patient.facility_id:
        return jsonify({"error": "Link your account to your clinic record first."}), 400
    data = body()
    doctor = User.query.filter_by(staff_code=(data.get("doctorCode") or "").upper(), role="doctor",
                                  facility_id=patient.facility_id, duty_status="on_duty").first()
    day = parse_date(data.get("date"))
    at = data.get("time")
    if not doctor or not day or at not in SLOTS:
        return jsonify({"error": "Choose a doctor, a date and a time."}), 400
    out, closed = free_slots(doctor, day)
    if closed or not next(s for s in out if s["time"] == at)["free"]:
        return jsonify({"error": "That time isn't available. Pick another."}), 409
    hh, mm = map(int, at.split(":"))
    a = Appointment(facility_id=patient.facility_id, patient_id=patient.id, doctor_id=doctor.id,
                    scheduled_at=datetime.combine(day, time(hh, mm), tzinfo=tz()),
                    reason=(data.get("reason") or "").strip() or "General consultation",
                    status="scheduled", booked_via="patient_portal", booked_by=g.current_user.id)
    db.session.add(a)
    db.session.commit()
    return jsonify({"id": a.id, "doctor": doctor.full_name, "date": day.isoformat(), "time": at}), 201


@bp.patch("/appointments/<appt_id>")
@authenticate_token
@require_patient
def cancel_my_appointment(appt_id):
    patient = _me()
    a = db.session.get(Appointment, appt_id)
    if not patient or not a or a.patient_id != patient.id:
        return jsonify({"error": "There is no such appointment."}), 404
    if a.status != "scheduled":
        return jsonify({"error": "Only upcoming appointments can be cancelled."}), 400
    a.status = "cancelled"
    db.session.commit()
    return jsonify({"id": a.id, "status": a.status})


@bp.post("/files")
@authenticate_token
@require_patient
def upload_my_file():
    patient = _me()
    if not patient:
        return jsonify({"error": "Link your account to your clinic record first."}), 400
    return _store_upload(patient, "patient")


@bp.get("/files/<file_id>")
@authenticate_token
@require_patient
def open_my_file(file_id):
    patient = _me()
    f = db.session.get(PatientFile, file_id)
    if not patient or not f or f.patient_id != patient.id:
        return jsonify({"error": "There is no such file."}), 404
    return file_response(f, patient)


# A patient may ask the assistant at most this many questions in this window (per server process).
ASSISTANT_LIMIT = 20
ASSISTANT_WINDOW = timedelta(minutes=10)
_asked = {}


def _over_limit(user_id, now):
    recent = [t for t in _asked.get(user_id, []) if now - t < ASSISTANT_WINDOW]
    _asked[user_id] = recent + [now]
    return len(recent) >= ASSISTANT_LIMIT


def _treatment_facts(patient):
    """The only patient data the assistant sees: treatment state, never identity."""
    e = patient.active_episode
    if not e:
        return {"on_treatment": False}
    today = clinic_today()
    logs = DoseLog.query.filter_by(patient_id=patient.id).all()
    log = {d.date: (d.taken, d.source) for d in logs}
    return {
        "on_treatment": True,
        "regimen": e.regimen,
        "day_of_treatment": (today - e.treatment_start).days + 1,
        "adherence": adherence(log, today),
        "missed_streak": miss_streak(log, today),
        "dose_time": effective_dose_time(patient).strftime("%H:%M"),
        "logged_today": today in log,
    }


@bp.post("/assistant")
@authenticate_token
@require_patient
def ask_assistant():
    patient = _me()
    if not patient:
        return jsonify({"error": "Connect your clinic record first."}), 400
    if _over_limit(g.current_user.id, datetime.now()):
        return jsonify({"error": "You've asked a lot of questions. Please wait a few minutes, or contact your clinic."}), 429
    return jsonify(assistant.answer(_treatment_facts(patient), body().get("messages")))


@bp.patch("/reminder-style")
@authenticate_token
@require_patient
def set_reminder_style():
    patient = _me()
    if not patient:
        return jsonify({"error": "Connect your clinic record first."}), 400
    style = body().get("style")
    if style not in STYLES:
        return jsonify({"error": "Pick one of the reminder styles."}), 400
    patient.reminder_style = style
    db.session.commit()
    return jsonify(_reminder_payload(patient, clinic_today(), 0))
