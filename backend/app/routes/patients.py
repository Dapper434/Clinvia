import io
import secrets
from datetime import timedelta

from flask import Blueprint, abort, g, jsonify, request, send_file
from sqlalchemy import func, or_

from ..auth import (
    authenticate_token,
    can,
    hash_password,
    password_problem,
    require,
    scope_ids,
    single_scope,
)
from ..clinical import (
    REGIMEN_DAYS,
    adherence,
    clinic_now,
    clinic_today,
    dose_maps,
    lab_label,
    last7,
    last_check_in,
    local,
    miss_streak,
    next_pickup,
    open_admissions,
)
from ..escalations import escalations_for
from ..extensions import db
from ..lookups import body, doctor_brief, names_by_id, patient_brief, patient_or_404
from ..prescribing import (
    DIAGNOSIS_BASES,
    EPTB_SITES,
    FREQUENCIES,
    REGIMENS,
    RESISTANCE_LEVELS,
    RESISTANT,
    TB_SITES,
    TREATMENT_HISTORIES,
    dose_problem,
    regimen_plan,
)
from ..models import (
    LAB_RESULTS,
    LAB_TESTS,
    Admission,
    Appointment,
    Bed,
    Contact,
    DoseLog,
    Facility,
    LabResult,
    Medication,
    MedicationPickup,
    Patient,
    PatientFile,
    Profile,
    TbEpisode,
    User,
    Ward,
)
from ..pdf import simple_pdf
from ..reminders import default_dose_time
from ..utils import parse_date, parse_time
from .auth_routes import domain_of, is_staff_domain

bp = Blueprint("patients", __name__, url_prefix="/api")

FILTERS = ("all", "tb", "admitted", "portal", "children", "mine")
DOSE_TIMES = {"before_breakfast": "07:00", "after_supper": "19:00"}
MAX_UPLOAD = 5 * 1024 * 1024
FILE_TYPES = ("prescription", "xray", "lab_report", "referral", "discharge_summary")
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_link_code():
    while True:
        raw = "".join(secrets.choice(_ALPHABET) for _ in range(8))
        code = f"{raw[:4]}-{raw[4:]}"
        if not Patient.query.filter_by(portal_link_code=code).first():
            return code


def _doctor_in_scope(code, facility_id):
    if not code:
        return None
    d = User.query.filter_by(staff_code=code.upper(), facility_id=facility_id, role="doctor").first()
    if not d:
        abort(400, description="Choose a doctor from this hospital.")
    return d


def _dose_time(value):
    value = DOSE_TIMES.get(value, value)
    try:
        return parse_time(value)
    except (ValueError, TypeError):
        abort(400, description="Use a dose time like 07:00.")


def _email(value):
    """A contact address, or None. Checked the same way the portal checks a sign-in."""
    email = (value or "").strip().lower()
    if not email:
        return None
    if "@" not in email or "." not in email.split("@")[-1]:
        abort(400, description="Use a valid email address, like name@example.com.")
    return email


def _weight(value):
    if value in (None, ""):
        return None
    try:
        kg = round(float(value), 1)
    except (TypeError, ValueError):
        abort(400, description="Write the weight in kilograms, like 54 or 54.5.")
    if not 0.5 <= kg <= 400:
        abort(400, description="Use a weight in kilograms between 0.5 and 400.")
    return kg


def _classification(tb):
    """Pull the WHO/NTLD-P classification out of a request, refusing anything unknown."""
    site = tb.get("type") if tb.get("type") in TB_SITES else "pulmonary"
    eptb_site = tb.get("eptbSite") or None
    if site == "extra_pulmonary":
        if eptb_site not in EPTB_SITES:
            abort(400, description="Choose which organ the extra-pulmonary TB affects.")
    else:
        eptb_site = None
    basis = tb.get("diagnosis") if tb.get("diagnosis") in DIAGNOSIS_BASES else "bacteriological"
    history = tb.get("history") if tb.get("history") in TREATMENT_HISTORIES else "new"
    resistance = tb.get("resistance")
    if resistance is None:
        # Older clients only knew about a rifampicin-resistant tick box.
        resistance = "mdr" if tb.get("mdr") else "susceptible"
    if resistance not in RESISTANCE_LEVELS:
        abort(400, description="Choose what drug-susceptibility testing showed.")
    return {
        "tb_type": site, "eptb_site": eptb_site, "diagnosis_basis": basis,
        "treatment_history": history, "resistance": resistance,
    }


def _plan_for(p, episode):
    """What the classification and the patient's weight say to prescribe."""
    return regimen_plan(
        site=episode.tb_type, eptb_site=episode.eptb_site, resistance=episode.resistance,
        age=p.age, weight_kg=p.weight_kg,
    )


def _filter(q, name, today):
    if name == "tb":
        return q.filter(Patient.id.in_(db.session.query(TbEpisode.patient_id).filter(TbEpisode.status == "active")))
    if name == "admitted":
        return q.filter(Patient.id.in_(db.session.query(Admission.patient_id).filter(Admission.discharged_at.is_(None))))
    if name == "portal":
        return q.filter(Patient.user_id.isnot(None))
    if name == "children":
        return q.filter(Patient.age < 15)
    if name == "mine":
        return q.filter(Patient.assigned_doctor_id == g.current_user.id)
    return q


@bp.get("/patients")
@authenticate_token
@require("patients.view")
def registry():
    role = g.current_user.role
    clinical = can(role, "patients.clinical")
    today = clinic_today()
    base = Patient.query.filter(Patient.facility_id.in_(scope_ids()))
    names = [f for f in FILTERS if f != "mine" or role == "doctor"]
    counts = {name: _filter(base, name, today).count() for name in names}

    chosen = request.args.get("filter") if request.args.get("filter") in names else "all"
    q = _filter(base, chosen, today)
    term = (request.args.get("q") or "").strip().lower()
    if term:
        like = f"%{term}%"
        q = q.filter(or_(func.lower(Patient.name).like(like), func.lower(Patient.patient_code).like(like),
                         Patient.phone.like(like)))
    total = q.count()
    per = 20
    page = max(0, int(request.args.get("page") or 0))
    pages = max(1, -(-total // per))
    page = min(page, pages - 1)
    rows = q.order_by(Patient.patient_code).offset(page * per).limit(per).all()

    ids = [p.id for p in rows]
    doctors = names_by_id(p.assigned_doctor_id for p in rows)
    episodes = {e.patient_id: e for e in TbEpisode.query.filter(TbEpisode.patient_id.in_(ids)).order_by(TbEpisode.treatment_start).all()}
    adm = open_admissions(ids)
    logs = dose_maps([pid for pid, e in episodes.items() if e.status == "active"], since=today - timedelta(days=31))
    facilities = {f.id: f.name for f in Facility.query.all()}
    out = []
    for p in rows:
        e = episodes.get(p.id)
        row = {
            **patient_brief(p),
            "facility": facilities.get(p.facility_id),
            "doctor": doctors[p.assigned_doctor_id].full_name if p.assigned_doctor_id in doctors else None,
            "admission": adm.get(p.id),
        }
        if clinical:
            row["episode"] = {"status": e.status, "phase": e.phase, "mdr": e.mdr_flag} if e else None
            if e and e.status == "active":
                log = logs.get(p.id, {})
                row["last7"] = last7(log, today)
                row["adherence"] = adherence(log, today)
        out.append(row)
    return jsonify({"rows": out, "total": total, "page": page, "pages": pages, "per": per,
                    "counts": counts, "filter": chosen})


@bp.get("/patients/lookup")
@authenticate_token
@require("patients.view")
def lookup():
    """Short list for the patient pickers in the booking, admit and walk-in drawers."""
    term = (request.args.get("q") or "").strip().lower()
    q = Patient.query.filter(Patient.facility_id.in_(scope_ids()))
    if term:
        like = f"%{term}%"
        q = q.filter(or_(func.lower(Patient.name).like(like), func.lower(Patient.patient_code).like(like),
                         Patient.phone.like(like)))
    rows = q.order_by(Patient.patient_code).limit(15).all()
    return jsonify([
        {**patient_brief(p), "doctorCode": p.assigned_doctor.staff_code if p.assigned_doctor else None}
        for p in rows
    ])


@bp.get("/patients/next-code")
@authenticate_token
@require("patients.register")
def next_code():
    """The code the next registration will most likely get (shown on the form)."""
    last = db.session.execute(db.text("SELECT last_value, is_called FROM patient_code_seq")).one()
    n = last[0] + 1 if last[1] else last[0]
    return jsonify({"code": "P" + str(n).zfill(max(4, len(str(n))))})


@bp.post("/patients")
@authenticate_token
@require("patients.register")
def register():
    data = body()
    facility_id = single_scope()
    name = (data.get("name") or "").strip()
    age = data.get("age")
    problems = []
    if not name:
        problems.append("full name")
    try:
        age = int(age)
        if not 0 <= age <= 120:
            raise ValueError
    except (TypeError, ValueError):
        problems.append("an age between 0 and 120")
    portal = data.get("portal") or None
    if portal:
        email = (portal.get("email") or "").strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            problems.append("a valid email for the portal account")
    if problems:
        return jsonify({"error": "Add " + ", ".join(problems) + " to register this patient."}), 400

    tb = data.get("tb") or None
    if tb and not can(g.current_user.role, "tb.manage"):
        return jsonify({"error": "Only doctors and clinicians can start TB treatment."}), 403
    doctor = _doctor_in_scope(data.get("doctorCode"), facility_id)
    f = db.session.get(Facility, facility_id)

    user = None
    if portal:
        if is_staff_domain(domain_of(email)):
            return jsonify({"error": "Use the patient's personal email; hospital addresses are for staff."}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "That email already has an account."}), 400
        problem = password_problem(portal.get("password") or "")
        if problem:
            return jsonify({"error": problem}), 400
        user = User(email=email, password_hash=hash_password(portal["password"]), role="patient",
                    full_name=name, phone=(data.get("phone") or "").strip() or None, must_change_password=True)
        db.session.add(user)
        db.session.flush()
        db.session.merge(Profile(id=user.id, full_name=name, role="patient"))

    weight = _weight(data.get("weight"))
    p = Patient(
        name=name, age=age, gender=data.get("gender") if data.get("gender") in ("male", "female", "other") else None,
        phone=(data.get("phone") or "").strip() or None, address=(data.get("address") or "").strip() or None,
        # A portal account's address doubles as the contact address unless another is given.
        email=_email(data.get("email")) or (email if portal else None),
        weight_kg=weight, weight_taken_on=clinic_today() if weight is not None else None,
        facility_id=facility_id, lat=f.lat, lng=f.lng, registered_by=g.current_user.id,
        assigned_doctor_id=doctor.id if doctor else None, user_id=user.id if user else None,
        portal_link_code=None if user else new_link_code(),
    )
    if tb:
        p.dose_time = _dose_time(tb.get("doseTime") or "before_breakfast")
    db.session.add(p)
    db.session.flush()
    if tb:
        _start_episode(p, tb)
    db.session.commit()
    db.session.refresh(p)
    return jsonify({"code": p.patient_code, "name": p.name}), 201


def _start_episode(p, tb):
    start = parse_date(tb.get("start")) or clinic_today()
    if TbEpisode.query.filter_by(patient_id=p.id, status="active").first():
        abort(400, description="This patient is already on TB treatment.")
    c = _classification(tb)
    # The regimen follows from the classification; a caller may only override it with one
    # of the regimens the programme actually runs.
    asked = tb.get("regimen")
    derived = regimen_plan(
        site=c["tb_type"], eptb_site=c["eptb_site"], resistance=c["resistance"], age=p.age,
    )["regimen"]
    if asked and asked not in REGIMENS:
        abort(400, description="That is not a regimen this programme runs.")
    e = TbEpisode(patient_id=p.id, **c, regimen=asked or derived, treatment_start=start,
                  phase="intensive", status="active", mdr_flag=c["resistance"] in RESISTANT)
    db.session.add(e)
    return e


def _record(p):
    role = g.current_user.role
    clinical = can(role, "patients.clinical")
    today = clinic_today()
    e = p.latest_episode
    active = e is not None and e.status == "active"
    staff_ids = []

    appts = Appointment.query.filter_by(patient_id=p.id).order_by(Appointment.scheduled_at).all()
    adms = (
        db.session.query(Admission, Ward.name, Bed.bed_label)
        .join(Ward, Ward.id == Admission.ward_id).outerjoin(Bed, Bed.id == Admission.bed_id)
        .filter(Admission.patient_id == p.id).order_by(Admission.admitted_at.desc()).all()
    )
    staff_ids += [a.doctor_id for a in appts] + [a.admitting_doctor_id for a, _, _ in adms]
    out = {
        "patient": {
            **patient_brief(p),
            "address": p.address,
            "weight": float(p.weight_kg) if p.weight_kg is not None else None,
            "weightTakenOn": p.weight_taken_on.isoformat() if p.weight_taken_on else None,
            "facility": p.facility.name if p.facility else None,
            "registered": local(p.created_at).date().isoformat(),
            "portalLinkCode": p.portal_link_code if p.user_id is None else None,
            "portalEmail": None,
            "doseTime": p.dose_time.strftime("%H:%M") if p.dose_time else None,
            "defaultDoseTime": default_dose_time().strftime("%H:%M"),
        },
        "doctor": doctor_brief(p.assigned_doctor),
        "appointments": [],
        "admissions": [
            {
                "id": a.id, "ward": ward, "bed": bed, "reason": a.reason,
                "admitted": local(a.admitted_at).strftime("%Y-%m-%dT%H:%M"),
                "discharged": local(a.discharged_at).strftime("%Y-%m-%dT%H:%M") if a.discharged_at else None,
                "doctorId": a.admitting_doctor_id,
            }
            for a, ward, bed in adms
        ],
        "today": today.isoformat(),
        "clinical": clinical,
    }
    if p.user_id and clinical:
        u = db.session.get(User, p.user_id)
        out["patient"]["portalEmail"] = u.email if u else None

    if clinical:
        out["episode"] = e.to_dict() if e else None
        out["episodes"] = [x.to_dict() for x in p.episodes]
        if active:
            log = dose_maps([p.id]).get(p.id, {})
            lc = last_check_in(log)
            vals = list(log.values())
            out["doses"] = {
                "log": {d.isoformat(): {"st": "t" if t else "m", "src": "p" if s == "patient_portal" else "c"}
                        for d, (t, s) in log.items() if d >= today - timedelta(days=45)},
                "streak": miss_streak(log, today),
                "todayLogged": today in log,
                "adherence": adherence(log, today),
                "lastCheckIn": lc.isoformat() if lc else None,
                "taken": sum(1 for t, _ in vals if t),
                "logged": len(vals),
                "byPatient": sum(1 for t, s in vals if t and s == "patient_portal"),
                "day": (today - e.treatment_start).days + 1,
                "regimenDays": REGIMENS[e.regimen]["total_days"] or REGIMEN_DAYS,
            }
            out["regimenPlan"] = _plan_for(p, e)
            pickups = MedicationPickup.query.filter_by(episode_id=e.id).order_by(MedicationPickup.picked_up_on.desc()).all()
            out["pickup"] = {"next": next_pickup(e, pickups, today), "history": [x.to_dict() for x in pickups[:6]]}
        meds = Medication.query.filter_by(patient_id=p.id, active=True).order_by(Medication.drug_name).all()
        out["medications"] = [m.to_dict() for m in meds]
        labs = LabResult.query.filter_by(patient_id=p.id).order_by(LabResult.collected_at.desc(), LabResult.created_at.desc()).all()
        out["labs"] = [{**l.to_dict(), "test": lab_label(l.test_type)} for l in labs]
        files = PatientFile.query.filter_by(patient_id=p.id).order_by(PatientFile.uploaded_at.desc()).all()
        out["files"] = [f.to_dict() for f in files]
        out["contacts"] = [c.to_dict() for c in Contact.query.filter_by(source_patient_id=p.id).order_by(Contact.name).all()]
        if can(role, "escalations.view"):
            out["escalations"] = escalations_for(scope_ids(), "all", patient_id=p.id, limit=10)
        out["alerts"] = {
            "notConverted": any((l.notes or "").startswith("Not converted") for l in labs) and active,
            "pendingLabs": [{"test": lab_label(l.test_type), "collected": l.collected_at.isoformat()}
                            for l in labs if l.result == "pending"],
        }

    staff = names_by_id(staff_ids)
    out["appointments"] = [
        {
            "id": a.id, "at": local(a.scheduled_at).strftime("%Y-%m-%dT%H:%M"), "reason": a.reason,
            "status": a.status, "via": a.booked_via,
            "doctor": staff[a.doctor_id].full_name if a.doctor_id in staff else None,
        }
        for a in appts
    ]
    for a in out["admissions"]:
        d = staff.get(a.pop("doctorId"))
        a["doctor"] = d.full_name if d else None
    return out


@bp.get("/patients/<code>")
@authenticate_token
@require("patients.view")
def record(code):
    return jsonify(_record(patient_or_404(code)))


@bp.patch("/patients/<code>")
@authenticate_token
@require("patients.edit")
def update(code):
    p = patient_or_404(code)
    data = body()
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "The patient's name can't be empty."}), 400
        p.name = name
    if "age" in data:
        try:
            age = int(data["age"])
            assert 0 <= age <= 120
        except (TypeError, ValueError, AssertionError):
            return jsonify({"error": "Use an age between 0 and 120."}), 400
        p.age = age
    if "gender" in data and data["gender"] in ("male", "female", "other"):
        p.gender = data["gender"]
    for key in ("phone", "address"):
        if key in data:
            setattr(p, key, (data.get(key) or "").strip() or None)
    if "email" in data:
        p.email = _email(data.get("email"))
    if "weight" in data:
        weight = _weight(data.get("weight"))
        # A new weight can move the patient into another dosing band, so remember when
        # it was taken; the record shows the date next to the TB doses.
        if weight != (float(p.weight_kg) if p.weight_kg is not None else None):
            p.weight_taken_on = clinic_today() if weight is not None else None
        p.weight_kg = weight
    if "doctorCode" in data or "doseTime" in data:
        if not can(g.current_user.role, "patients.care"):
            return jsonify({"error": "Only doctors, clinicians and administrators change the care team."}), 403
        if "doctorCode" in data:
            doctor = _doctor_in_scope(data.get("doctorCode"), p.facility_id)
            p.assigned_doctor_id = doctor.id if doctor else None
        if "doseTime" in data:
            p.dose_time = _dose_time(data.get("doseTime")) if data.get("doseTime") else None
    db.session.commit()
    return jsonify(_record(p))


@bp.post("/patients/<code>/link-code")
@authenticate_token
@require("patients.edit")
def regenerate_link_code(code):
    p = patient_or_404(code)
    if p.user_id:
        return jsonify({"error": "This patient already uses the portal."}), 400
    p.portal_link_code = new_link_code()
    db.session.commit()
    return jsonify({"portalLinkCode": p.portal_link_code})


# ---------------------------------------------------------------- TB treatment
@bp.post("/patients/<code>/tb")
@authenticate_token
@require("tb.manage")
def start_tb(code):
    p = patient_or_404(code)
    data = body()
    _start_episode(p, data)
    if data.get("doseTime"):
        p.dose_time = _dose_time(data["doseTime"])
    db.session.commit()
    return jsonify(_record(p)), 201


@bp.patch("/patients/<code>/tb")
@authenticate_token
@require("tb.manage")
def update_tb(code):
    p = patient_or_404(code)
    e = p.active_episode
    if not e:
        return jsonify({"error": "This patient has no active TB treatment."}), 400
    data = body()
    if data.get("phase") in ("intensive", "continuation"):
        e.phase = data["phase"]
    if data.get("outcome"):
        if data["outcome"] not in ("cured", "completed", "lost_to_follow_up", "died", "failed"):
            return jsonify({"error": "Choose a treatment outcome."}), 400
        e.status = data["outcome"]
        e.phase = "closed"
        e.outcome_date = parse_date(data.get("outcomeDate")) or clinic_today()
        Medication.query.filter_by(patient_id=p.id, active=True).filter(
            Medication.start_date >= e.treatment_start
        ).update({"active": False, "end_date": e.outcome_date}, synchronize_session=False)
    db.session.commit()
    return jsonify(_record(p))


# ---------------------------------------------------------------- labs
def _scoped(model, id_, patient_attr="patient_id"):
    row = db.session.get(model, id_)
    if row:
        p = db.session.get(Patient, getattr(row, patient_attr))
        if p and p.facility_id in scope_ids():
            return row, p
    abort(404, description="Not found.")


@bp.post("/patients/<code>/labs")
@authenticate_token
@require("labs.write")
def add_lab(code):
    p = patient_or_404(code)
    data = body()
    if data.get("test") not in LAB_TESTS:
        return jsonify({"error": "Choose which test this is."}), 400
    result = data.get("result") or "pending"
    if result not in LAB_RESULTS:
        return jsonify({"error": "Choose a result."}), 400
    collected = parse_date(data.get("collected")) or clinic_today()
    lab = LabResult(
        patient_id=p.id, test_type=data["test"], result=result, collected_at=collected,
        reported_at=None if result == "pending" else (parse_date(data.get("reported")) or clinic_today()),
        notes=(data.get("notes") or "").strip() or None, mdr_detected=bool(data.get("rifResistant")),
        lab_ref=(data.get("labRef") or "").strip() or None, recorded_by=g.current_user.id,
    )
    db.session.add(lab)
    db.session.commit()
    return jsonify({**lab.to_dict(), "test": lab_label(lab.test_type)}), 201


@bp.patch("/labs/<lab_id>")
@authenticate_token
@require("labs.write")
def update_lab(lab_id):
    lab, _ = _scoped(LabResult, lab_id)
    data = body()
    if "result" in data:
        if data["result"] not in LAB_RESULTS:
            return jsonify({"error": "Choose a result."}), 400
        lab.result = data["result"]
        lab.reported_at = None if lab.result == "pending" else (parse_date(data.get("reported")) or clinic_today())
    if "notes" in data:
        lab.notes = (data.get("notes") or "").strip() or None
    if "rifResistant" in data:
        lab.mdr_detected = bool(data["rifResistant"])
    db.session.commit()
    return jsonify({**lab.to_dict(), "test": lab_label(lab.test_type)})


# ---------------------------------------------------------------- medication
@bp.post("/patients/<code>/medications")
@authenticate_token
@require("meds.write")
def prescribe(code):
    p = patient_or_404(code)
    data = body()
    drug, dose, freq = ((data.get(k) or "").strip() for k in ("drug", "dose", "freq"))
    if not drug or not dose or not freq:
        return jsonify({"error": "Add the drug, the dose and how often it's taken."}), 400
    problem = dose_problem(dose)
    if problem:
        return jsonify({"error": problem}), 400
    start = parse_date(data.get("start")) or clinic_today()
    end = parse_date(data.get("end"))
    if end and end < start:
        return jsonify({"error": "The end date can't come before the start date."}), 400
    m = Medication(patient_id=p.id, drug_name=drug, dose=dose, frequency=freq,
                   start_date=start, end_date=end,
                   prescribed_by=g.current_user.id, active=True)
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201


@bp.post("/patients/<code>/pickups")
@authenticate_token
@require("meds.write")
def record_pickup(code):
    """The patient collected their TB drugs; the next pickup is due when this supply runs out."""
    p = patient_or_404(code)
    e = p.active_episode
    if not e:
        return jsonify({"error": "This patient isn't on TB treatment."}), 400
    data = body()
    on = parse_date(data.get("on")) or clinic_today()
    if on > clinic_today() or on < e.treatment_start:
        return jsonify({"error": "The pickup date must be between the treatment start and today."}), 400
    try:
        days = int(data.get("days"))
    except (TypeError, ValueError):
        days = 0
    if not 1 <= days <= 90:
        return jsonify({"error": "Enter how many days of medicine were handed over (1 to 90)."}), 400
    db.session.add(MedicationPickup(patient_id=p.id, episode_id=e.id, picked_up_on=on, days_supplied=days,
                                    recorded_by=g.current_user.id))
    db.session.commit()
    pickups = MedicationPickup.query.filter_by(episode_id=e.id).order_by(MedicationPickup.picked_up_on.desc()).all()
    return jsonify({"next": next_pickup(e, pickups), "history": [x.to_dict() for x in pickups[:6]]}), 201


@bp.get("/prescribing/regimen")
@authenticate_token
@require("tb.manage")
def regimen_preview():
    """What a classification would imply, for the forms that haven't saved anything yet."""
    args = request.args
    site = args.get("site") if args.get("site") in TB_SITES else "pulmonary"
    eptb_site = args.get("eptbSite") if args.get("eptbSite") in EPTB_SITES else None
    resistance = args.get("resistance") if args.get("resistance") in RESISTANCE_LEVELS else "susceptible"
    age, weight = None, None
    try:
        age = int(args["age"]) if args.get("age") else None
        weight = float(args["weight"]) if args.get("weight") else None
    except ValueError:
        pass
    plan = regimen_plan(
        site=site, eptb_site=eptb_site if site == "extra_pulmonary" else None,
        resistance=resistance, age=age, weight_kg=weight,
    )
    return jsonify({**plan, "frequencies": list(FREQUENCIES)})


@bp.get("/patients/<code>/regimen")
@authenticate_token
@require("meds.write")
def regimen(code):
    """The exact lines this patient's classification and weight call for."""
    p = patient_or_404(code)
    e = p.active_episode
    if not e:
        return jsonify({"error": "This patient has no active TB treatment."}), 400
    return jsonify({
        **_plan_for(p, e),
        "episodeRegimen": e.regimen,
        "start": e.treatment_start.isoformat(),
        "weight": float(p.weight_kg) if p.weight_kg is not None else None,
        "frequencies": list(FREQUENCIES),
    })


@bp.post("/patients/<code>/regimen")
@authenticate_token
@require("meds.write")
def prescribe_regimen(code):
    """Write the whole regimen at once, from the lines the prescriber confirmed."""
    p = patient_or_404(code)
    e = p.active_episode
    if not e:
        return jsonify({"error": "This patient has no active TB treatment."}), 400
    lines = body().get("lines")
    if not isinstance(lines, list) or not lines:
        return jsonify({"error": "There are no prescription lines to save."}), 400

    start = e.treatment_start
    saved = []
    for line in lines:
        drug, dose, freq = ((line.get(k) or "").strip() for k in ("drug", "dose", "freq"))
        if not drug or not dose or not freq:
            return jsonify({"error": "Every line needs a drug, a dose and how often it's taken."}), 400
        problem = dose_problem(dose)
        if problem:
            return jsonify({"error": f"{drug}: {problem}"}), 400
        try:
            begins = start + timedelta(days=int(line.get("from") or 0))
            days = line.get("days")
            ends = begins + timedelta(days=int(days)) if days else None
        except (TypeError, ValueError):
            return jsonify({"error": f"{drug}: the dates on this line don't make sense."}), 400
        saved.append(Medication(
            patient_id=p.id, drug_name=drug, dose=dose, frequency=freq, start_date=begins,
            end_date=ends, prescribed_by=g.current_user.id, from_regimen=True,
            # A phase that starts later is still pending, not something being taken today.
            active=begins <= clinic_today() and (ends is None or ends >= clinic_today()),
        ))
    # Re-dosing after a weight change replaces the lines the builder wrote last time;
    # prescriptions typed in one at a time are left alone.
    Medication.query.filter_by(patient_id=p.id, active=True, from_regimen=True).update(
        {"active": False, "end_date": clinic_today()}, synchronize_session=False
    )
    db.session.add_all(saved)
    db.session.commit()
    return jsonify(_record(p)), 201


@bp.patch("/medications/<med_id>")
@authenticate_token
@require("meds.write")
def stop_medication(med_id):
    m, _ = _scoped(Medication, med_id)
    if body().get("active") is False:
        m.active = False
        m.end_date = clinic_today()
    db.session.commit()
    return jsonify(m.to_dict())


# ---------------------------------------------------------------- files
@bp.post("/patients/<code>/files")
@authenticate_token
@require("files.upload")
def upload_file(code):
    p = patient_or_404(code)
    return _store_upload(p, "staff")


def _store_upload(p, by):
    upload = request.files.get("file")
    kind = request.form.get("type")
    if not upload or not upload.filename:
        return jsonify({"error": "Choose a file to upload."}), 400
    if kind not in FILE_TYPES:
        return jsonify({"error": "Say what kind of document this is."}), 400
    data = upload.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        return jsonify({"error": "Files can be up to 5 MB."}), 400
    content_type = upload.mimetype or "application/octet-stream"
    if content_type not in ("application/pdf", "image/jpeg", "image/png"):
        return jsonify({"error": "Upload a PDF, JPG or PNG."}), 400
    f = PatientFile(patient_id=p.id, file_name=upload.filename[:120], file_type=kind, content_type=content_type,
                    uploaded_by=by, uploaded_by_user=g.current_user.id, content=data, uploaded_at=clinic_now())
    db.session.add(f)
    db.session.commit()
    return jsonify(f.to_dict()), 201


FILE_TITLES = {"prescription": "Prescription", "xray": "Chest X-ray report", "lab_report": "Laboratory report",
               "referral": "Referral letter", "discharge_summary": "Discharge summary"}


def file_response(f, p):
    if f.content:
        return send_file(io.BytesIO(f.content), mimetype=f.content_type or "application/octet-stream",
                         download_name=f.file_name, as_attachment=False)
    # Records created without an attached scan are rendered from what the record holds.
    lines = [f"{p.name} ({p.patient_code})", p.facility.name if p.facility else "",
             f"Added {local(f.uploaded_at).strftime('%d %b %Y')}", ""]
    if f.file_type == "prescription":
        for m in Medication.query.filter_by(patient_id=p.id).order_by(Medication.start_date, Medication.drug_name):
            lines.append(f"{m.drug_name}  {m.dose}  {m.frequency}  from {m.start_date:%d %b %Y}")
    elif f.file_type in ("lab_report", "xray"):
        test = "xray" if f.file_type == "xray" else "genexpert"
        for l in LabResult.query.filter_by(patient_id=p.id, test_type=test).order_by(LabResult.collected_at):
            lines.append(f"{lab_label(l.test_type)}: {l.result}, collected {l.collected_at:%d %b %Y}")
            if l.notes:
                lines.append(f"  {l.notes}")
    elif f.file_type == "referral":
        lines.append("Referred for assessment of a persistent cough and weight loss.")
    pdf = simple_pdf(FILE_TITLES.get(f.file_type, "Document"), lines)
    return send_file(io.BytesIO(pdf), mimetype="application/pdf", download_name=f.file_name, as_attachment=False)


@bp.get("/files/<file_id>")
@authenticate_token
@require("patients.clinical")
def open_file(file_id):
    f, p = _scoped(PatientFile, file_id)
    return file_response(f, p)


# ---------------------------------------------------------------- household contacts
@bp.post("/patients/<code>/contacts")
@authenticate_token
@require("contacts.write")
def add_contact(code):
    p = patient_or_404(code)
    data = body()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Add the contact's name."}), 400
    rel = data.get("relationship") if data.get("relationship") in ("spouse", "child", "parent", "roommate", "other") else "other"
    try:
        age = int(data["age"]) if data.get("age") not in (None, "") else None
    except (TypeError, ValueError):
        age = None
    c = Contact(source_patient_id=p.id, name=name, age=age, relationship=rel,
                phone=(data.get("phone") or "").strip() or None)
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@bp.patch("/contacts/<contact_id>")
@authenticate_token
@require("contacts.write")
def screen_contact(contact_id):
    c, _ = _scoped(Contact, contact_id, "source_patient_id")
    data = body()
    if "screen_result" in data:
        result = data["screen_result"]
        if result not in ("negative", "referred", "confirmed_tb", None):
            return jsonify({"error": "Choose a screening result."}), 400
        c.screen_result = result
        c.screened = result is not None
        c.screened_date = clinic_today() if result else None
    db.session.commit()
    return jsonify(c.to_dict())
