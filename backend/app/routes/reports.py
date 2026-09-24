import csv
import io
from datetime import date, timedelta

from flask import Blueprint, Response, abort, g, jsonify, request
from sqlalchemy import select

from ..auth import authenticate_token, can, is_network_view, require, scope_ids
from ..clinical import (
    active_episodes,
    adherence,
    band,
    clinic_today,
    day_bounds,
    dose_maps,
    local,
)
from ..extensions import db
from ..lookups import names_by_id
from ..models import Admission, Appointment, Bed, DoseLog, Facility, Patient, TbEpisode, Ward

bp = Blueprint("reports", __name__, url_prefix="/api")

SETS = {"active": lambda e: e.status == "active", "all": lambda e: True, "mdr": lambda e: e.mdr_flag}


@bp.get("/map/tb")
@authenticate_token
@require("map.view")
def tb_map():
    scope = scope_ids()
    today = clinic_today()
    named = can(g.current_user.role, "patients.view")
    rows = (
        db.session.query(TbEpisode, Patient).join(Patient, Patient.id == TbEpisode.patient_id)
        .filter(Patient.facility_id.in_(scope)).all()
    )
    chosen = request.args.get("set") if request.args.get("set") in SETS else "active"
    counts = {k: sum(1 for e, _ in rows if f(e)) for k, f in SETS.items()}
    logs = dose_maps([p.id for e, p in rows if e.status == "active"], since=today - timedelta(days=31))
    facilities = Facility.query.filter(Facility.id.in_(scope)).order_by(Facility.name).all()
    fac_names = {f.id: f.name for f in facilities}
    points, per_fac = [], {}
    for e, p in rows:
        if not SETS[chosen](e) or p.lat is None:
            continue
        adh = adherence(logs.get(p.id, {}), today) if e.status == "active" else None
        per_fac[p.facility_id] = per_fac.get(p.facility_id, 0) + 1
        point = {"lat": p.lat, "lng": p.lng, "status": e.status, "mdr": e.mdr_flag, "adherence": adh,
                 "band": "closed" if e.status != "active" else ("poor" if e.mdr_flag and (adh or 0) < 80 else band(adh)),
                 "hospital": fac_names.get(p.facility_id)}
        if named:
            point.update({"code": p.patient_code, "name": p.name})
        points.append(point)
    return jsonify({
        "set": chosen, "counts": counts, "points": points,
        "facilities": [{**{k: f.to_dict()[k] for k in ("name", "level", "county", "lat", "lng")},
                        "count": per_fac.get(f.id, 0)} for f in facilities],
    })


def _months(today, n=12):
    out, y, m = [], today.year, today.month
    for _ in range(n):
        out.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


@bp.get("/reports")
@authenticate_token
@require("reports.view")
def reports():
    scope = scope_ids()
    today = clinic_today()
    episodes = (
        db.session.query(TbEpisode).join(Patient, Patient.id == TbEpisode.patient_id)
        .filter(Patient.facility_id.in_(scope)).all()
    )
    closed = [e for e in episodes if e.status != "active"]
    ok = sum(1 for e in closed if e.status in ("cured", "completed"))
    tb_rows = []
    for y, m in _months(today):
        started = [e for e in episodes if e.treatment_start.year == y and e.treatment_start.month == m]
        if started:
            c = lambda s: sum(1 for e in started if e.status == s)  # noqa: E731
            tb_rows.append({"month": f"{y}-{m:02d}", "started": len(started), "active": c("active"), "cured": c("cured"),
                            "completed": c("completed"), "lost": c("lost_to_follow_up"), "died": c("died")})

    lo = day_bounds(today - timedelta(days=30))[0]
    hi = day_bounds(today)[1]
    appts = Appointment.query.filter(Appointment.facility_id.in_(scope), Appointment.scheduled_at >= lo,
                                     Appointment.scheduled_at < hi, Appointment.status != "scheduled").all()
    a_by = lambda s: sum(1 for a in appts if a.status == s)  # noqa: E731

    multi = len(scope) > 1
    facilities = {f.id: f.name for f in Facility.query.all()}
    wards = (Ward.query.filter(Ward.facility_id.in_(scope)).join(Facility, Facility.id == Ward.facility_id)
             .order_by(Facility.name, Ward.sort_order).all())
    adms = Admission.query.filter(Admission.facility_id.in_(scope), Admission.admitted_at >= lo).all()
    ward_rows = []
    for w in wards:
        ad = [a for a in adms if a.ward_id == w.id]
        dis = [a for a in ad if a.discharged_at]
        ward_rows.append({
            "ward": (facilities[w.facility_id] + ": " if multi else "") + w.name,
            "admissions": len(ad),
            "averageStay": round(sum((a.discharged_at - a.admitted_at).days for a in dis) / len(dis), 1) if dis else None,
            "occupied": sum(1 for b in w.beds if b.status == "occupied"), "capacity": len(w.beds),
        })
    return jsonify({
        "today": today.isoformat(),
        "success": {"ok": ok, "closed": len(closed), "pct": round(100 * ok / len(closed)) if closed else None},
        "appointments": {"due": len(appts), "kept": a_by("completed"), "noShow": a_by("no_show"),
                         "online": sum(1 for a in appts if a.booked_via == "patient_portal")},
        "tbByMonth": tb_rows,
        "wards": ward_rows,
        "totals": {
            "patients": Patient.query.filter(Patient.facility_id.in_(scope)).count(),
            "appointments": Appointment.query.filter(Appointment.facility_id.in_(scope)).count(),
            "episodes": len(episodes),
        },
        "canExport": can(g.current_user.role, "reports.export"),
    })


def _csv(filename, header, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@bp.get("/exports/<kind>.csv")
@authenticate_token
@require("reports.export")
def export(kind):
    scope = scope_ids()
    today = clinic_today()
    facilities = {f.id: f.name for f in Facility.query.all()}
    patients = Patient.query.filter(Patient.facility_id.in_(scope)).order_by(Patient.patient_code).all()
    by_id = {p.id: p for p in patients}
    stamp = today.isoformat()

    if kind == "patients":
        eps = {e.patient_id: e for e in TbEpisode.query.filter(TbEpisode.patient_id.in_(list(by_id))).order_by(TbEpisode.treatment_start)}
        docs = names_by_id(p.assigned_doctor_id for p in patients)
        return _csv(f"clinvia-patients-{stamp}.csv",
                    ["Code", "Name", "Age", "Sex", "Phone", "Hospital", "Doctor", "TB status", "Portal account", "Registered"],
                    [[p.patient_code, p.name, p.age, p.gender, p.phone, facilities.get(p.facility_id),
                      docs[p.assigned_doctor_id].full_name if p.assigned_doctor_id in docs else "",
                      eps[p.id].status if p.id in eps else "", "yes" if p.user_id else "no",
                      local(p.created_at).date().isoformat()] for p in patients])
    if kind == "tb":
        eps = TbEpisode.query.filter(TbEpisode.patient_id.in_(list(by_id))).order_by(TbEpisode.treatment_start).all()
        logs = dose_maps([e.patient_id for e in eps if e.status == "active"], since=today - timedelta(days=31))
        return _csv(f"clinvia-tb-cohort-{stamp}.csv",
                    ["Code", "Name", "Hospital", "TB type", "Regimen", "MDR", "Started", "Status", "Outcome date", "Adherence 30d"],
                    [[by_id[e.patient_id].patient_code, by_id[e.patient_id].name, facilities.get(by_id[e.patient_id].facility_id),
                      e.tb_type.replace("_", "-"), e.regimen, "yes" if e.mdr_flag else "no", e.treatment_start.isoformat(),
                      e.status, e.outcome_date.isoformat() if e.outcome_date else "",
                      f"{adherence(logs.get(e.patient_id, {}), today)}%" if e.status == "active" else ""] for e in eps])
    if kind == "appointments":
        appts = Appointment.query.filter(Appointment.facility_id.in_(scope)).order_by(Appointment.scheduled_at).all()
        docs = names_by_id(a.doctor_id for a in appts)
        return _csv(f"clinvia-appointments-{stamp}.csv",
                    ["Date", "Time", "Patient code", "Patient", "Hospital", "Doctor", "Reason", "Status", "Booked by"],
                    [[local(a.scheduled_at).date().isoformat(), local(a.scheduled_at).strftime("%H:%M"),
                      by_id[a.patient_id].patient_code, by_id[a.patient_id].name, facilities.get(a.facility_id),
                      docs[a.doctor_id].full_name if a.doctor_id in docs else "", a.reason, a.status,
                      "patient (portal)" if a.booked_via == "patient_portal" else "reception"]
                     for a in appts if a.patient_id in by_id])
    if kind == "doses":
        logs = DoseLog.query.filter(DoseLog.patient_id.in_(list(by_id))).order_by(DoseLog.date, DoseLog.patient_id).all()
        return _csv(f"clinvia-dose-log-{stamp}.csv",
                    ["Date", "Patient code", "Patient", "Hospital", "Status", "Logged by"],
                    [[d.date.isoformat(), by_id[d.patient_id].patient_code, by_id[d.patient_id].name,
                      facilities.get(by_id[d.patient_id].facility_id), "taken" if d.taken else "missed",
                      "patient (portal)" if d.source == "patient_portal" else "staff (DOT)"] for d in logs])
    abort(404, description="Choose patients, tb, appointments or doses.")
