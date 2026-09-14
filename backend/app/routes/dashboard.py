from collections import defaultdict
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify

from ..auth import authenticate_token, require_hospital
from ..models import DoseLog, Patient

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _calc_pct(logs, treatment_start):
    if not treatment_start:
        return 0
    diff_days = (date.today() - treatment_start).days + 1
    window_days = min(max(1, diff_days), 180)
    if window_days <= 0:
        return 0
    taken_count = sum(1 for log in logs if log.taken)
    return min(100, round((taken_count / window_days) * 100))


def _check_ltfu(logs):
    if not logs:
        return True
    last = max(log.date for log in logs)
    return (date.today() - last).days >= 14


def _missed_in_window(logs, days=3):
    by_date = {log.date: log for log in logs}
    missed = 0
    for i in range(days):
        d = date.today() - timedelta(days=i)
        log = by_date.get(d)
        if not log or not log.taken:
            missed += 1
    return missed


@bp.get("/stats")
@authenticate_token
@require_hospital
def get_dashboard_stats():
    patients = Patient.query.order_by(Patient.created_at.desc()).all()
    dose_logs = DoseLog.query.order_by(DoseLog.date.asc()).all()

    logs_by_patient = defaultdict(list)
    for log in dose_logs:
        logs_by_patient[log.patient_id].append(log)

    active = [p for p in patients if p.status == "active"]

    current_month_prefix = date.today().strftime("%Y-%m")
    new_this_month = sum(
        1 for p in patients if p.created_at and p.created_at.strftime("%Y-%m") == current_month_prefix
    )

    adherence_sum = 0
    adherence_n = 0
    high_risk = 0
    ltfu = 0
    alerts = []

    for patient in active:
        logs = logs_by_patient.get(patient.id, [])
        pct = _calc_pct(logs, patient.treatment_start)
        adherence_sum += pct
        adherence_n += 1
        if pct < 80:
            high_risk += 1
        if _check_ltfu(logs):
            ltfu += 1
        missed = _missed_in_window(logs, 3)
        if missed > 0:
            alerts.append({"patientId": patient.id, "name": patient.name, "missed": missed})

    alerts.sort(key=lambda a: a["missed"], reverse=True)
    avg_adherence = round(adherence_sum / adherence_n) if adherence_n else 0

    outcome_counts = {"active": 0, "completed": 0, "lost": 0, "died": 0}
    for patient in patients:
        if patient.status in outcome_counts:
            outcome_counts[patient.status] += 1

    today = date.today()
    bar_labels, bar_values = [], []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        prefix = f"{year:04d}-{month:02d}"
        label = datetime(year, month, 1).strftime("%b %Y")
        bar_labels.append(label)
        bar_values.append(
            sum(1 for p in patients if p.created_at and p.created_at.strftime("%Y-%m") == prefix)
        )

    day_labels, day_ratios = [], []
    logs_by_date = defaultdict(list)
    for log in dose_logs:
        logs_by_date[log.date].append(log)
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        day_labels.append(d.strftime("%b %-d"))
        rows = logs_by_date.get(d, [])
        if not rows:
            day_ratios.append(0)
        else:
            taken = sum(1 for r in rows if r.taken)
            day_ratios.append(round((taken / len(rows)) * 100))

    return jsonify(
        {
            "activeCount": len(active),
            "newThisMonth": new_this_month,
            "avgAdherence": avg_adherence,
            "highRisk": high_risk,
            "ltfu": ltfu,
            "alerts": alerts,
            "outcomeCounts": outcome_counts,
            "barLabels": bar_labels,
            "barValues": bar_values,
            "dayLabels": day_labels,
            "dayRatios": day_ratios,
            "patients": [p.to_dict() for p in patients],
            "doseLogs": [d.to_dict() for d in dose_logs],
        }
    )
