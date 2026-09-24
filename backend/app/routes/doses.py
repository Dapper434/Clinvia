from datetime import timedelta

from flask import Blueprint, g, jsonify, request

from ..auth import authenticate_token, require, scope_ids
from ..clinical import active_episodes, clinic_today, dose_maps, last7
from ..extensions import db
from ..lookups import body
from ..models import DoseLog, Patient
from ..utils import parse_date

bp = Blueprint("doses", __name__, url_prefix="/api")


def _rows(scope, day, today):
    eps = sorted(
        ((e, p) for e, p in active_episodes(scope) if e.treatment_start <= day),
        key=lambda ep: ep[1].patient_code,
    )
    logs = dose_maps([p.id for _, p in eps], since=today - timedelta(days=8))
    out = []
    for e, p in eps:
        log = logs.get(p.id, {})
        v = log.get(day)
        out.append({
            "code": p.patient_code, "name": p.name, "portal": p.user_id is not None,
            "regimen": e.regimen, "mdr": e.mdr_flag,
            "doseTime": p.dose_time.strftime("%H:%M") if p.dose_time else None,
            "last7": last7(log, today),
            "logged": ({"st": "t" if v[0] else "m", "src": "p" if v[1] == "patient_portal" else "c"} if v else None),
        })
    return out


@bp.get("/doses")
@authenticate_token
@require("doses.view")
def day_log():
    today = clinic_today()
    day = parse_date(request.args.get("date")) or today
    rows = _rows(scope_ids(), day, today)
    return jsonify({
        "date": day.isoformat(), "today": today.isoformat(),
        "days": [(today - timedelta(days=i)).isoformat() for i in range(7)],
        "rows": rows,
    })


@bp.put("/doses")
@authenticate_token
@require("doses.log")
def save():
    """Bulk upsert for one day. A dose the patient checked in themselves is never overwritten."""
    data = body()
    today = clinic_today()
    day = parse_date(data.get("date"))
    if not day or day > today or day < today - timedelta(days=6):
        return jsonify({"error": "Doses can be recorded for today and the previous 6 days."}), 400
    entries = data.get("entries") or []
    codes = [str(e.get("code", "")).upper() for e in entries]
    by_code = {
        p.patient_code: (e, p)
        for e, p in active_episodes(scope_ids())
        if p.patient_code in codes and e.treatment_start <= day
    }
    existing = {
        d.patient_id: d
        for d in DoseLog.query.filter(DoseLog.date == day,
                                      DoseLog.patient_id.in_([p.id for _, p in by_code.values()]))
    }
    locked, saved = [], 0
    for entry in entries:
        code, status = str(entry.get("code", "")).upper(), entry.get("status")
        if code not in by_code or status not in ("taken", "missed"):
            continue
        episode, p = by_code[code]
        row = existing.get(p.id)
        if row and row.source == "patient_portal":
            locked.append(p.name)
            continue
        if row:
            row.taken, row.logged_by = status == "taken", g.current_user.id
        else:
            db.session.add(DoseLog(patient_id=p.id, episode_id=episode.id, date=day, taken=status == "taken",
                                   source="clinic_dot", logged_by=g.current_user.id))
        saved += 1
    db.session.commit()
    return jsonify({"saved": saved, "locked": locked})
