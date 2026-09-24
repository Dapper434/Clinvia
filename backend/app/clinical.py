"""Clinical rules, implemented once here; pages only display what these return.

* Adherence = taken / logged doses over the last 30 days (not since treatment start).
* Missed streak = consecutive missed logs counting back from today, or from yesterday
  if today isn't logged yet, stopping at the first taken dose.
* Needs attention, most urgent first: missed streak >= 2, then sputum not converted
  at month 2, then GeneXpert results still pending.
"""
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from flask import current_app
from sqlalchemy import select

from .extensions import db
from .models import Admission, Bed, DoseLog, Facility, LabResult, Patient, TbEpisode, Ward

REGIMEN_DAYS = 182
LAB_LABELS = {
    "genexpert": "GeneXpert MTB/RIF",
    "sputum_smear": "Sputum smear microscopy",
    "xray": "Chest X-ray",
    "culture": "TB culture",
    "fbc": "Full blood count",
    "malaria_rdt": "Malaria RDT",
    "urinalysis": "Urinalysis",
    "rbs": "Random blood sugar",
    "lft": "Liver function test",
}


def tz():
    return ZoneInfo(current_app.config["APP_TIMEZONE"])


def clinic_now():
    return datetime.now(tz())


def clinic_today():
    return clinic_now().date()


def local(dt):
    return dt.astimezone(tz()) if dt else None


def day_bounds(d):
    """[start, end) of a local calendar day as aware datetimes."""
    start = datetime.combine(d, time(0, 0), tzinfo=tz())
    return start, start + timedelta(days=1)


def monday(d):
    return d - timedelta(days=d.weekday())


def dose_maps(patient_ids, since=None):
    """patient id -> {date: (taken, source)}"""
    out = defaultdict(dict)
    if not patient_ids:
        return out
    q = select(DoseLog.patient_id, DoseLog.date, DoseLog.taken, DoseLog.source).where(
        DoseLog.patient_id.in_(list(patient_ids))
    )
    if since:
        q = q.where(DoseLog.date >= since)
    for pid, d, taken, source in db.session.execute(q):
        out[pid][d] = (taken, source)
    return out


def adherence(log, today, days=30):
    window = [v for d, v in log.items() if today - timedelta(days=days) <= d <= today]
    if not window:
        return None
    return round(100 * sum(1 for taken, _ in window if taken) / len(window))


def miss_streak(log, today):
    d = today if today in log else today - timedelta(days=1)
    n = 0
    while d in log and not log[d][0]:
        n += 1
        d -= timedelta(days=1)
    return n


def last_check_in(log):
    days = [d for d, (taken, source) in log.items() if taken and source == "patient_portal"]
    return max(days) if days else None


def last7(log, today):
    out = []
    for i in range(6, -1, -1):
        v = log.get(today - timedelta(days=i))
        out.append("n" if v is None else "t" if v[0] else "m")
    return out


def band(value):
    if value is None:
        return None
    return "good" if value >= 80 else "watch" if value >= 60 else "poor"


def active_episodes(scope):
    return (
        db.session.query(TbEpisode, Patient)
        .join(Patient, Patient.id == TbEpisode.patient_id)
        .filter(TbEpisode.status == "active", Patient.facility_id.in_(scope))
        .all()
    )


def open_admissions(patient_ids):
    if not patient_ids:
        return {}
    rows = (
        db.session.query(Admission.patient_id, Ward.name, Bed.bed_label)
        .join(Ward, Ward.id == Admission.ward_id)
        .outerjoin(Bed, Bed.id == Admission.bed_id)
        .filter(Admission.discharged_at.is_(None), Admission.patient_id.in_(list(patient_ids)))
        .all()
    )
    return {pid: {"ward": ward, "bed": bed} for pid, ward, bed in rows}


def not_converted(patient_ids):
    """patient id -> collection date of a month-2 smear that did not convert."""
    if not patient_ids:
        return {}
    rows = db.session.execute(
        select(LabResult.patient_id, LabResult.collected_at).where(
            LabResult.patient_id.in_(list(patient_ids)),
            LabResult.test_type == "sputum_smear",
            LabResult.notes.like("Not converted%"),
        )
    ).all()
    return {pid: collected for pid, collected in rows}


def short_facility(name):
    for suffix in (" County Referral Hospital", " Level 5 Hospital", " National Hospital", " National Referral Hospital"):
        if name and name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def attention(scope, today=None, doctor_id=None):
    """The needs-attention list for these hospitals, most urgent first."""
    today = today or clinic_today()
    eps = active_episodes(scope)
    if doctor_id:
        eps = [(e, p) for e, p in eps if p.assigned_doctor_id == doctor_id]
    pids = [p.id for _, p in eps]
    logs = dose_maps(pids, since=today - timedelta(days=45))
    adm = open_admissions(pids)
    nc = not_converted(pids)
    facilities = {f.id: f.name for f in Facility.query.all()}
    out = []
    for e, p in eps:
        log = logs.get(p.id, {})
        streak, adh = miss_streak(log, today), adherence(log, today)
        base = {
            "code": p.patient_code,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "mdr": e.mdr_flag,
            "hospital": facilities.get(p.facility_id),
            "where": (
                {"ward": adm[p.id]["ward"], "bed": adm[p.id]["bed"]}
                if p.id in adm
                else {"place": short_facility(facilities.get(p.facility_id))}
            ),
            "days": last7(log, today),
            "adherence": adh,
            "portal": p.user_id is not None,
        }
        if streak >= 2:
            lc = last_check_in(log)
            out.append({
                **base, "kind": "missed", "rank": 100 + streak, "streak": streak,
                "todayLogged": today in log, "notConverted": p.id in nc,
                "lastCheckIn": lc.isoformat() if lc else None,
            })
        elif p.id in nc:
            out.append({**base, "kind": "not_converted", "rank": 50, "collected": nc[p.id].isoformat()})

    pending = (
        db.session.query(LabResult, Patient)
        .join(Patient, Patient.id == LabResult.patient_id)
        .filter(
            LabResult.test_type == "genexpert",
            LabResult.result == "pending",
            Patient.facility_id.in_(scope),
        )
    )
    if doctor_id:
        pending = pending.filter(Patient.assigned_doctor_id == doctor_id)
    for lab, p in pending.all():
        out.append({
            "code": p.patient_code, "name": p.name, "age": p.age, "gender": p.gender, "mdr": False,
            "hospital": facilities.get(p.facility_id), "where": None, "days": None, "adherence": None,
            "portal": p.user_id is not None, "kind": "pending_genexpert", "rank": 10,
            "collected": lab.collected_at.isoformat(), "notes": lab.notes,
        })
    out.sort(key=lambda r: -r["rank"])
    return out


def dose_days(scope, today=None):
    """Taken, missed and expected TB doses for each of the last 7 days."""
    today = today or clinic_today()
    eps = active_episodes(scope)
    logs = dose_maps([p.id for _, p in eps], since=today - timedelta(days=7))
    out = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        expected = [(e, p) for e, p in eps if e.treatment_start <= d]
        taken = sum(1 for _, p in expected if logs[p.id].get(d, (None,))[0] is True)
        missed = sum(1 for _, p in expected if logs[p.id].get(d, (None,))[0] is False)
        out.append({
            "date": d.isoformat(), "label": "Today" if i == 0 else d.strftime("%a"),
            "taken": taken, "missed": missed, "expected": len(expected),
        })
    return out


def weekly_admissions(scope, today=None, weeks=8):
    """Monday-start weeks; the last one is this (partial) week."""
    today = today or clinic_today()
    start = monday(today) - timedelta(weeks=weeks - 1)
    lo, _ = day_bounds(start)
    rows = db.session.execute(
        select(Admission.admitted_at, Admission.discharged_at).where(
            Admission.facility_id.in_(scope),
            (Admission.admitted_at >= lo) | (Admission.discharged_at >= lo),
        )
    ).all()
    out = []
    for i in range(weeks):
        wk = start + timedelta(weeks=i)
        a, b = day_bounds(wk)[0], day_bounds(wk + timedelta(days=7))[0]
        out.append({
            "week": wk.isoformat(),
            "admitted": sum(1 for ad, _ in rows if a <= ad < b),
            "discharged": sum(1 for _, dis in rows if dis and a <= dis < b),
            "partial": i == weeks - 1,
        })
    return out


def lab_label(test_type):
    return LAB_LABELS.get(test_type, test_type)


def age_band(age):
    return age is not None and age < 15


def iso(d):
    return d.isoformat() if isinstance(d, (date, datetime)) else d
