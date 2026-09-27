"""Escalations: what a patient told the portal companion that their doctor should see.

One open escalation per patient per day: a second report within ESCALATION_WINDOW is added to
the open one instead of creating another, so a worried patient doesn't flood the doctor's list.
The doctor is sent a push notification when an escalation is raised or becomes urgent.
"""
import logging
from datetime import timedelta

from .clinical import clinic_now, local
from .extensions import db
from .lookups import names_by_id
from .models import Escalation, Patient, User
from .reminders import _deliver_to_user, push_enabled

log = logging.getLogger(__name__)

ESCALATION_WINDOW = timedelta(hours=24)
MAX_MESSAGE_CHARS = 4000


def _doctors_to_notify(patient):
    d = patient.assigned_doctor
    if d and d.is_active:
        return [d]
    return User.query.filter_by(
        facility_id=patient.facility_id, role="doctor", duty_status="on_duty", is_active=True
    ).all()


def _notify(esc, patient):
    if not push_enabled():
        return
    title = "Urgent: patient reported a danger sign" if esc.severity == "urgent" else "A patient needs your attention"
    # Only the patient code on a lock screen, never the name.
    body = f"{patient.patient_code}: {esc.reason}"
    summary = {"sent": 0, "failed": 0, "pruned": 0}
    try:
        for doctor in _doctors_to_notify(patient):
            _deliver_to_user(doctor.id, title, body, summary,
                             url=f"/patients/{patient.patient_code}", tag=f"escalation-{esc.id}")
    except Exception:  # a failed notification must never lose the escalation itself
        log.exception("escalation push failed for %s", esc.id)


def raise_escalation(patient, severity, reason, message, source):
    """Record (or add to) an open escalation and notify the doctor. Returns what the model may tell the patient."""
    if not patient.facility_id:
        return {"notified": False, "note": "The patient isn't linked to a clinic, so tell them to contact one."}
    now = clinic_now()
    esc = (
        Escalation.query.filter(
            Escalation.patient_id == patient.id,
            Escalation.status == "open",
            Escalation.created_at >= now - ESCALATION_WINDOW,
        )
        .order_by(Escalation.created_at.desc())
        .first()
    )
    notify = True
    if esc:
        esc.patient_message = f"{esc.patient_message}\n\n{message}"[-MAX_MESSAGE_CHARS:]
        esc.updated_at = now
        # Tell the doctor again only when it has become more serious.
        notify = severity == "urgent" and esc.severity != "urgent"
        if notify:
            esc.severity, esc.reason = "urgent", reason
    else:
        esc = Escalation(
            patient_id=patient.id, facility_id=patient.facility_id, doctor_id=patient.assigned_doctor_id,
            severity=severity, reason=reason, patient_message=message[:MAX_MESSAGE_CHARS], source=source,
            created_at=now, updated_at=now,
        )
        db.session.add(esc)
    db.session.commit()
    if notify:
        _notify(esc, patient)
        db.session.commit()  # stale push subscriptions pruned while notifying
    doctor = patient.assigned_doctor
    return {"notified": True, "doctor": doctor.full_name if doctor else "the doctors at your clinic"}


def escalation_dict(esc, patient, names):
    doctor = names.get(esc.doctor_id)
    handler = names.get(esc.acknowledged_by)
    return {
        "id": esc.id,
        "patient": {"code": patient.patient_code, "name": patient.name, "age": patient.age, "gender": patient.gender},
        "severity": esc.severity,
        "reason": esc.reason,
        "message": esc.patient_message,
        "source": esc.source,
        "status": esc.status,
        "raised": local(esc.created_at).strftime("%Y-%m-%dT%H:%M"),
        "updated": local(esc.updated_at).strftime("%Y-%m-%dT%H:%M"),
        "doctor": doctor.full_name if doctor else None,
        "acknowledgedBy": handler.full_name if handler else None,
        "acknowledged": local(esc.acknowledged_at).strftime("%Y-%m-%dT%H:%M") if esc.acknowledged_at else None,
        "note": esc.note,
    }


def escalations_for(scope, status="open", doctor_id=None, patient_id=None, limit=100):
    """Escalations in these hospitals, urgent first then newest."""
    q = db.session.query(Escalation, Patient).join(Patient, Patient.id == Escalation.patient_id).filter(
        Escalation.facility_id.in_(scope)
    )
    if status != "all":
        q = q.filter(Escalation.status == status)
    if doctor_id:
        q = q.filter(Escalation.doctor_id == doctor_id)
    if patient_id:
        q = q.filter(Escalation.patient_id == patient_id)
    rows = q.order_by(Escalation.created_at.desc()).limit(limit).all()
    if status == "open":
        rows.sort(key=lambda r: r[0].severity != "urgent")
    names = names_by_id([e.doctor_id for e, _ in rows] + [e.acknowledged_by for e, _ in rows])
    return [escalation_dict(e, p, names) for e, p in rows]
