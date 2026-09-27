"""Per-hospital numbers and percentages for the TB representative.

Nothing here names a patient or a staff member: every value is a count or a percentage,
so it is safe to show to the Ministry of Health, counties and NGO partners.
"""
from datetime import timedelta

from sqlalchemy import func, select

from .clinical import adherence, attention, day_bounds, dose_maps
from .extensions import db
from .models import Admission, Appointment, Bed, Patient, TbEpisode, User, Visit, Ward


def pct(part, whole):
    return round(100 * part / whole) if whole else None


def hospital_metrics(f, today):
    fid = f.id
    lo, hi = day_bounds(today)
    month_ago = day_bounds(today - timedelta(days=30))[0]

    beds = dict(db.session.execute(
        select(Bed.status, func.count()).join(Ward, Ward.id == Bed.ward_id)
        .where(Ward.facility_id == fid).group_by(Bed.status)
    ).all())
    bed_total = sum(beds.values())

    staff = dict(db.session.execute(
        select(User.role, func.count()).where(User.facility_id == fid, User.is_active).group_by(User.role)
    ).all())
    doctors_on = User.query.filter_by(facility_id=fid, role="doctor", duty_status="on_duty", is_active=True).count()

    episodes = (
        db.session.query(TbEpisode).join(Patient, Patient.id == TbEpisode.patient_id)
        .filter(Patient.facility_id == fid).all()
    )
    active = [e for e in episodes if e.status == "active"]
    closed = [e for e in episodes if e.status != "active"]
    logs = dose_maps([e.patient_id for e in active], since=today - timedelta(days=31))
    rates = [v for v in (adherence(logs.get(e.patient_id, {}), today) for e in active) if v is not None]

    appts = Appointment.query.filter(
        Appointment.facility_id == fid, Appointment.scheduled_at >= month_ago,
        Appointment.scheduled_at < hi, Appointment.status != "scheduled",
    ).all()
    visits_today = Visit.query.filter(Visit.facility_id == fid, Visit.arrived_at >= lo, Visit.arrived_at < hi).all()

    return {
        "patients": Patient.query.filter_by(facility_id=fid).count(),
        "activeTb": len(active),
        "mdr": sum(1 for e in active if e.mdr_flag),
        "attention": len(attention([fid], today)),
        "adherenceAvg": round(sum(rates) / len(rates)) if rates else None,
        "adherenceBelow80": sum(1 for v in rates if v < 80),
        "closedEpisodes": len(closed),
        "treatmentSuccessPct": pct(sum(1 for e in closed if e.status in ("cured", "completed")), len(closed)),
        "beds": bed_total,
        "bedsOccupied": beds.get("occupied", 0),
        "occupancyPct": pct(beds.get("occupied", 0), bed_total),
        "admissions30d": Admission.query.filter(Admission.facility_id == fid, Admission.admitted_at >= month_ago).count(),
        "appointmentsToday": Appointment.query.filter(
            Appointment.facility_id == fid, Appointment.scheduled_at >= lo, Appointment.scheduled_at < hi
        ).count(),
        "appointments30d": len(appts),
        "keptPct": pct(sum(1 for a in appts if a.status == "completed"), len(appts)),
        "noShowPct": pct(sum(1 for a in appts if a.status == "no_show"), len(appts)),
        "onlinePct": pct(sum(1 for a in appts if a.booked_via == "patient_portal"), len(appts)),
        "walkInsToday": len(visits_today),
        "waiting": sum(1 for v in visits_today if v.status == "waiting"),
        "staff": sum(staff.values()),
        "doctors": staff.get("doctor", 0),
        "doctorsOnDuty": doctors_on,
        "nurses": staff.get("nurse", 0),
    }


SUMMARY_COLUMNS = [
    ("Hospital", lambda f, m: f.name),
    ("County", lambda f, m: f.county or ""),
    ("Level", lambda f, m: f.level or ""),
    ("Patients", lambda f, m: m["patients"]),
    ("On TB treatment", lambda f, m: m["activeTb"]),
    ("Drug-resistant (MDR)", lambda f, m: m["mdr"]),
    ("Average adherence, 30 days (%)", lambda f, m: m["adherenceAvg"]),
    ("Patients below 80% adherence", lambda f, m: m["adherenceBelow80"]),
    ("Need attention today", lambda f, m: m["attention"]),
    ("Closed TB episodes", lambda f, m: m["closedEpisodes"]),
    ("Treatment success (%)", lambda f, m: m["treatmentSuccessPct"]),
    ("Beds", lambda f, m: m["beds"]),
    ("Beds occupied", lambda f, m: m["bedsOccupied"]),
    ("Bed occupancy (%)", lambda f, m: m["occupancyPct"]),
    ("Admissions, 30 days", lambda f, m: m["admissions30d"]),
    ("Appointments due, 30 days", lambda f, m: m["appointments30d"]),
    ("Appointments kept (%)", lambda f, m: m["keptPct"]),
    ("No-show rate (%)", lambda f, m: m["noShowPct"]),
    ("Booked online (%)", lambda f, m: m["onlinePct"]),
    ("Walk-ins today", lambda f, m: m["walkInsToday"]),
    ("Doctors", lambda f, m: m["doctors"]),
    ("Doctors on duty", lambda f, m: m["doctorsOnDuty"]),
    ("Nurses", lambda f, m: m["nurses"]),
]
