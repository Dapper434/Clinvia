"""Loads the hospital network into the database.

* Deterministic: the same people and patterns come out every run.
* Date-relative: everything is anchored to today in APP_TIMEZONE, so the pages look
  current whenever it is run. Re-run it the day before a presentation.
* Scoped: it only resets the hospitals listed in network.py (marked is_seeded). Hospitals
  registered through the app, and their staff and patients, are never touched.
"""
import hashlib
import json
import os
import secrets
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select, text, update

from app.auth import hash_password
from app.extensions import db
from app.models import (
    Admission,
    Appointment,
    Bed,
    DoseLog,
    Facility,
    LabResult,
    Medication,
    Patient,
    PatientFile,
    Profile,
    TbEpisode,
    User,
    Visit,
    Ward,
    gen_uuid,
)

from . import network as N

PEOPLE = json.loads((Path(__file__).parent / "people.json").read_text())


def h(key):
    """Stable pseudo-random 0..2^31-1 from any text key."""
    return int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], "big") & 0x7FFFFFFF


def _num(code):
    return int(code[1:])


class SeedError(RuntimeError):
    pass


def _passwords():
    keys = {"network": "SEED_PASSWORD_NETWORK", "patients": "SEED_PASSWORD_PATIENTS"}
    keys.update({hosp["slug"]: f"SEED_PASSWORD_{hosp['slug'].upper()}" for hosp in N.HOSPITALS})
    missing = [v for v in keys.values() if not os.environ.get(v)]
    if missing:
        raise SeedError("Set these in backend/.env before seeding: " + ", ".join(missing))
    # One bcrypt hash per password; every account sharing it can reuse the hash.
    return {k: hash_password(os.environ[v]) for k, v in keys.items()}


def run(log=print):
    tz = ZoneInfo(os.environ.get("APP_TIMEZONE", "Africa/Nairobi"))
    now = datetime.now(tz).replace(second=0, microsecond=0)
    today = now.date()
    hashes = _passwords()
    session = db.session

    def at(d, hh=0, mm=0):
        return datetime.combine(d, time(hh, mm), tzinfo=tz)

    # ------------------------------------------------------------------ hospitals
    fac = {}  # slug -> Facility
    for cfg in N.HOSPITALS:
        f = Facility.query.filter_by(name=cfg["name"]).first() or Facility(id=gen_uuid(), name=cfg["name"])
        f.slug = cfg["slug"]
        f.level = cfg["level"]
        f.county = cfg["county"]
        f.sub_county = cfg["sub_county"]
        f.lat, f.lng = cfg["lat"], cfg["lng"]
        f.phone = cfg["phone"]
        f.email_domain = f"{cfg['slug']}.{N.BASE_DOMAIN}"
        f.active = True
        f.is_seeded = True
        session.add(f)
        fac[cfg["slug"]] = f
    session.flush()
    seeded_ids = [f.id for f in fac.values()]

    # ------------------------------------------------------------------ reset seeded hospitals
    # Remember which patient logins pointed at a seeded record (other than accounts this seed
    # creates), so the same person can be linked again after the reload.
    relink = dict(
        session.execute(
            select(Patient.name, Patient.user_id)
            .join(User, User.id == Patient.user_id)
            .where(Patient.facility_id.in_(seeded_ids), ~User.email.like(f"%@{N.PATIENT_DOMAIN}"))
        ).all()
    )
    seeded_codes = {p["code"] for p in PEOPLE}
    clash = session.execute(
        select(Patient.patient_code).where(
            Patient.patient_code.in_(seeded_codes),
            (Patient.facility_id.notin_(seeded_ids)) | Patient.facility_id.is_(None),
        )
    ).scalars().all()
    if clash:
        raise SeedError(
            "These patient codes belong to hospitals the seed does not own: " + ", ".join(sorted(clash))
        )

    for model in (Visit, Appointment, Admission):
        session.execute(delete(model).where(model.facility_id.in_(seeded_ids)))
    session.execute(delete(Ward).where(Ward.facility_id.in_(seeded_ids)))
    session.execute(delete(Patient).where(Patient.facility_id.in_(seeded_ids)))
    session.execute(delete(User).where(User.role == "patient", User.email.like(f"%@{N.PATIENT_DOMAIN}")))
    session.flush()

    # ------------------------------------------------------------------ staff
    for old, new in N.LEGACY_EMAILS.items():
        if not User.query.filter_by(email=new).first():
            session.execute(update(User).where(User.email == old).values(email=new))

    def upsert_staff(email, name, role, specialty, duty, facility_id, pw_hash):
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(id=gen_uuid(), email=email)
            session.add(u)
        u.full_name = name
        u.role = role
        u.specialty = specialty
        u.duty_status = duty
        u.facility_id = facility_id
        u.password_hash = pw_hash
        u.is_active = True
        u.must_change_password = False
        u.phone = u.phone or "07" + str(10000000 + h("tel" + email) % 89999999)
        session.flush()
        if not u.staff_code:
            u.staff_code = session.execute(text("SELECT next_staff_code()")).scalar()
        session.merge(Profile(id=u.id, full_name=name, role=role))
        return u

    network_admin = upsert_staff(
        f"{N.NETWORK_ADMIN['local']}@{N.NETWORK_DOMAIN}", N.NETWORK_ADMIN["name"], "network_admin",
        N.NETWORK_ADMIN["specialty"], "on_duty", None, hashes["network"],
    )

    staff = {}  # slug -> list of (User, tags)
    for cfg in N.HOSPITALS:
        rows = []
        for local, name, role, specialty, duty, tags in cfg["staff"]:
            email = f"{local}@{cfg['slug']}.{N.BASE_DOMAIN}"
            rows.append((upsert_staff(email, name, role, specialty, duty, fac[cfg["slug"]].id,
                                      hashes[cfg["slug"]]), set(tags)))
        staff[cfg["slug"]] = rows

    def with_tag(slug, tag):
        return [u for u, tags in staff[slug] if tag in tags]

    def one(slug, tag):
        found = with_tag(slug, tag)
        return found[0] if found else None

    def available(u, day_offset):
        """Doctors on leave take nothing from today on; off-duty doctors are away today only."""
        if u.duty_status == "on_leave" and day_offset >= 0:
            return False
        if u.duty_status == "off_duty" and day_offset == 0:
            return False
        return True

    # ------------------------------------------------------------------ patients
    tb_by_code = {row[0]: row for row in N.TB_COHORT}
    weights = [(cfg["slug"], cfg["share"]) for cfg in N.HOSPITALS]
    total = sum(w for _, w in weights)

    def hospital_for(code):
        if code in tb_by_code:
            return tb_by_code[code][1]
        if code in N.PINNED:
            return N.PINNED[code]
        r = h("hosp" + code) % total
        for slug, w in weights:
            if r < w:
                return slug
            r -= w
        return weights[0][0]

    cfg_by_slug = {cfg["slug"]: cfg for cfg in N.HOSPITALS}
    patients = {}  # code -> dict row
    for p in PEOPLE:
        code, slug = p["code"], hospital_for(p["code"])
        cfg, f = cfg_by_slug[slug], fac[slug]
        patients[code] = {
            "id": gen_uuid(),
            "patient_code": code,
            "name": p["name"],
            "age": p["age"],
            "gender": p["gender"],
            "phone": p["phone"],
            "address": f"{cfg['sub_county']}, {cfg['county']} County",
            "facility_id": f.id,
            "lat": round(f.lat + ((h("lat" + code) % 200) - 100) / 2000.0, 5),
            "lng": round(f.lng + ((h("lng" + code) % 200) - 100) / 2000.0, 5),
            "created_at": now - timedelta(days=p["registeredDaysAgo"], hours=h("rh" + code) % 8),
            "portal_link_code": None if p["portal"] else _link_code(),
            "user_id": None,
            "assigned_doctor_id": None,
            "registered_by": None,
            "dose_time": None,
            "_slug": slug,
            "_portal": p["portal"],
        }

    # TB patients are looked after by their hospital's TB lead; about half the general
    # patients have a named doctor too (children with the paediatrician, and so on).
    antenatal = {
        c for c, p in patients.items()
        if p["gender"] == "female" and 18 <= p["age"] <= 40 and h("anc" + c) % 3 == 0
    }
    for code, p in patients.items():
        slug = p["_slug"]
        if code in tb_by_code:
            p["assigned_doctor_id"] = one(slug, "tb").id
            p["dose_time"] = time(19, 0) if h("dt" + code) % 3 == 0 else time(7, 0)
        elif h("hasdoc" + code) % 2 == 0:
            if p["age"] < 15 and one(slug, "paeds"):
                p["assigned_doctor_id"] = one(slug, "paeds").id
            elif code in antenatal and one(slug, "obgyn"):
                p["assigned_doctor_id"] = one(slug, "obgyn").id
            else:
                gens = with_tag(slug, "general")
                p["assigned_doctor_id"] = gens[h("gd" + code) % len(gens)].id
        receptionists = [u for u, _ in staff[slug] if u.role == "receptionist"]
        p["registered_by"] = receptionists[0].id if receptionists else None

    # Portal accounts for patients who use the portal.
    patient_users = []
    for code, p in patients.items():
        if not p["_portal"]:
            continue
        uid = gen_uuid()
        email = f"{p['name'].lower().replace(' ', '.')}.{code.lower()}@{N.PATIENT_DOMAIN}"
        patient_users.append({
            "id": uid, "email": email, "password_hash": hashes["patients"], "role": "patient",
            "full_name": p["name"], "phone": p["phone"], "created_at": p["created_at"],
        })
        p["user_id"] = uid
    # Logins that existed before the reload keep pointing at the same person.
    for code, p in patients.items():
        if p["name"] in relink and p["user_id"] is None:
            p["user_id"] = relink.pop(p["name"])
            p["portal_link_code"] = None

    if patient_users:
        session.execute(User.__table__.insert(), patient_users)
        session.execute(
            Profile.__table__.insert(),
            [{"id": u["id"], "full_name": u["full_name"], "role": "patient"} for u in patient_users],
        )
    session.execute(
        Patient.__table__.insert(),
        [{k: v for k, v in p.items() if not k.startswith("_")} for p in patients.values()],
    )

    # ------------------------------------------------------------------ TB episodes + doses
    episodes = {}
    for code, slug, tb_type, start_ago, mdr, adherence, streak, outcome in N.TB_COHORT:
        start = today - timedelta(days=start_ago)
        if outcome == "active":
            phase = "intensive" if (mdr or start_ago < 56) else "continuation"
            outcome_date = None
        else:
            phase = "closed"
            outcome_date = start + timedelta(
                days={"died": 95, "lost_to_follow_up": 70}.get(outcome, 182)
            )
        episodes[code] = {
            "id": gen_uuid(), "patient_id": patients[code]["id"], "tb_type": tb_type,
            "regimen": "BPaLM" if mdr else "2HRZE/4HR", "treatment_start": start, "phase": phase,
            "status": outcome, "mdr_flag": mdr, "outcome_date": outcome_date,
            "created_at": at(start, 10, 0),
        }
    session.execute(TbEpisode.__table__.insert(), list(episodes.values()))

    doses = []
    for code, slug, _type, start_ago, _mdr, adherence, streak, outcome in N.TB_COHORT:
        if outcome != "active":
            continue
        p, e, nurse = patients[code], episodes[code], one(slug, "dot")
        # Every second patient has already been logged today, so the dose log has work left.
        last = today if int(code[-1]) % 2 == 0 else today - timedelta(days=1)
        d = e["treatment_start"]
        while d <= last:
            # The streak runs back from the last logged day, and the dose before it was taken,
            # so "missed N days in a row" is exactly N.
            in_streak = d > last - timedelta(days=streak)
            before_streak = streak and d == last - timedelta(days=streak)
            taken = before_streak or (not in_streak and h(code + d.isoformat()) % 100 < adherence)
            # A missed dose is always recorded by staff; patients only ever check in a taken one.
            by_patient = taken and p["_portal"] and h("src" + code + d.isoformat()) % 10 < 8
            doses.append({
                "id": gen_uuid(), "patient_id": p["id"], "episode_id": e["id"], "date": d,
                "taken": taken, "source": "patient_portal" if by_patient else "clinic_dot",
                "logged_by": p["user_id"] if by_patient else nurse.id,
                "created_at": at(d, 9, 15) + timedelta(minutes=h("lt" + code + d.isoformat()) % 180),
            })
            d += timedelta(days=1)
    session.execute(DoseLog.__table__.insert(), doses)

    # ------------------------------------------------------------------ medications
    meds = []
    first_line = [("Isoniazid", "300 mg"), ("Rifampicin", "600 mg"), ("Pyrazinamide", "1500 mg"),
                  ("Ethambutol", "1100 mg"), ("Pyridoxine (vitamin B6)", "25 mg")]
    bpalm = [("Bedaquiline", "200 mg", "3 times weekly"), ("Pretomanid", "200 mg", "Once daily"),
             ("Linezolid", "600 mg", "Once daily"), ("Moxifloxacin", "400 mg", "Once daily")]
    for code, e in episodes.items():
        doctor = patients[code]["assigned_doctor_id"]
        closed = e["status"] != "active"
        if e["mdr_flag"]:
            for drug, dose, freq in bpalm:
                meds.append(_med(patients[code]["id"], drug, dose, freq, e["treatment_start"],
                                 e["outcome_date"] if closed else None, doctor, not closed))
        else:
            for drug, dose in first_line:
                stops = e["phase"] == "continuation" and drug in ("Pyrazinamide", "Ethambutol")
                end = e["treatment_start"] + timedelta(days=56) if stops else (e["outcome_date"] if closed else None)
                meds.append(_med(patients[code]["id"], drug, dose, "Once daily", e["treatment_start"],
                                 end, doctor, not closed and not stops))
    general_meds = [("Amoxicillin", "500 mg", "8 hourly", 7), ("Paracetamol", "1 g", "6 hourly", 5),
                    ("Metformin", "500 mg", "12 hourly", None), ("Amlodipine", "5 mg", "Once daily", None),
                    ("Ceftriaxone", "1 g", "12 hourly", 7), ("Omeprazole", "20 mg", "Once daily", 14)]
    for code, p in patients.items():
        if _num(code) <= 18 or h("onmed" + code) % 3:
            continue
        drug, dose, freq, days = general_meds[h("med" + code) % 6]
        start = today - timedelta(days=h("ms" + code) % 20)
        end = start + timedelta(days=days) if days else None
        gens = with_tag(p["_slug"], "general")
        meds.append(_med(p["id"], drug, dose, freq, start, end,
                         p["assigned_doctor_id"] or gens[0].id, end is None or end >= today))
    session.execute(Medication.__table__.insert(), meds)

    # ------------------------------------------------------------------ lab results
    labs = []
    tb_rows = {row[0]: row for row in N.TB_COHORT}
    for code, e in episodes.items():
        pid, start, mdr = patients[code]["id"], e["treatment_start"], e["mdr_flag"]
        tests = [("xray", "abnormal", 3, 0)]
        if e["tb_type"] == "pulmonary":
            tests = [("genexpert", "positive", 4, 1), ("sputum_smear", "positive", 4, 2)] + tests
        for test, result, before, tat in tests:
            note = None
            if test == "genexpert":
                note = ("MTB detected, rifampicin resistance detected" if mdr
                        else "MTB detected, rifampicin resistance not detected")
            labs.append(_lab(pid, test, result, start - timedelta(days=before),
                             start - timedelta(days=before) + timedelta(days=tat), note, mdr and test == "genexpert"))
        # Month-2 follow-up smear converts to negative when adherence is good.
        if e["tb_type"] == "pulmonary" and start + timedelta(days=58) <= today:
            ok = tb_rows[code][5] >= 80
            labs.append(_lab(pid, "sputum_smear", "negative" if ok else "positive",
                             start + timedelta(days=56), start + timedelta(days=58),
                             "Sputum converted at month 2" if ok else "Not converted at month 2 — review adherence"))
    routine = ["fbc", "malaria_rdt", "urinalysis", "rbs", "lft"]
    for code, p in patients.items():
        if _num(code) <= 18 or h("haslab" + code) % 2:
            continue
        ago = h("lc" + code) % 45
        pending = ago <= 1  # only samples from the last 2 days can still be waiting
        result = "pending" if pending else ("abnormal" if h("res" + code) % 4 == 0 else "normal")
        collected = today - timedelta(days=ago)
        labs.append(_lab(p["id"], routine[h("lt" + code) % 5], result, collected,
                         None if pending else collected + timedelta(days=1)))
    labs.append(_lab(patients["P0024"]["id"], "genexpert", "pending", today - timedelta(days=1), None,
                     "Presumptive TB — cough > 2 weeks"))
    session.execute(LabResult.__table__.insert(), labs)

    # ------------------------------------------------------------------ files
    files = []
    for code, e in episodes.items():
        p = patients[code]
        for name, kind, who, offs in (("chest-xray", "xray", "staff", -3), ("genexpert-report", "lab_report", "staff", -2),
                                      ("tb-prescription", "prescription", "staff", 0), ("referral-letter", "referral", "patient", -6)):
            if who == "patient" and not p["_portal"]:
                continue
            files.append({
                "id": gen_uuid(), "patient_id": p["id"], "file_name": f"{name}-{code.lower()}.pdf",
                "file_type": kind, "content_type": "application/pdf", "uploaded_by": who,
                "uploaded_by_user": p["user_id"] if who == "patient" else p["assigned_doctor_id"],
                "uploaded_at": at(e["treatment_start"] + timedelta(days=offs), 11, 0), "content": None,
            })
    session.execute(PatientFile.__table__.insert(), files)

    # ------------------------------------------------------------------ wards and beds
    beds = {}  # (slug, label) -> bed row
    wards = {}  # (slug, kind) -> ward row
    ward_rows, bed_rows = [], []
    for cfg in N.HOSPITALS:
        for order, (name, kind, prefix, capacity, _target) in enumerate(cfg["wards"]):
            ward_type = {"male": "general", "female": "general", "mixed": "general"}.get(kind, kind)
            w = {"id": gen_uuid(), "facility_id": fac[cfg["slug"]].id, "name": name, "ward_type": ward_type,
                 "bed_prefix": prefix, "capacity": capacity, "sort_order": order}
            ward_rows.append(w)
            wards[(cfg["slug"], kind)] = w
            for n in range(1, capacity + 1):
                b = {"id": gen_uuid(), "ward_id": w["id"], "bed_label": f"{prefix}-{n:02d}", "status": "available"}
                bed_rows.append(b)
                beds[(cfg["slug"], b["bed_label"])] = b

    def ward_kind_for(slug, p):
        kinds = {k for (s, k) in wards if s == slug}
        if p["age"] < 15:
            return "paediatric" if "paediatric" in kinds else None
        if p["patient_code"] in antenatal and "maternity" in kinds and h("mat" + p["patient_code"]) % 2 == 0:
            return "maternity"
        if "mixed" in kinds:
            return "mixed"
        return "female" if p["gender"] == "female" else "male"

    admissions = []
    reasons = {
        "paediatric": ["Severe pneumonia", "Severe malaria", "Acute gastroenteritis with dehydration"],
        "maternity": ["Labour and delivery"],
        "general": ["Uncontrolled diabetes", "Hypertensive emergency", "Severe malaria",
                    "Acute gastroenteritis", "Community-acquired pneumonia"],
    }
    past_reasons = ["Severe malaria", "Acute gastroenteritis", "Dehydration", "Pneumonia",
                    "Post-operative observation", "Hypertensive emergency"]
    admitted_now = set()
    for cfg in N.HOSPITALS:
        slug = cfg["slug"]
        candidates = [p for c, p in sorted(patients.items()) if p["_slug"] == slug and _num(c) > 18 and c != "P0024"]
        filled = {}
        for p in candidates:
            kind = ward_kind_for(slug, p)
            if not kind:
                continue
            ward = wards[(slug, kind)]
            target = next(t for (n, k, _px, _c, t) in cfg["wards"] if k == kind)
            n = filled.get(kind, 0)
            if n >= target:
                continue
            filled[kind] = n + 1
            bed = beds[(slug, f"{ward['bed_prefix']}-{n + 1:02d}")]
            bed["status"] = "occupied"
            doctor = (one(slug, "paeds") if kind == "paediatric" else one(slug, "obgyn") if kind == "maternity"
                      else with_tag(slug, "general")[h("ad" + p["patient_code"]) % len(with_tag(slug, "general"))])
            pool = reasons["paediatric" if kind == "paediatric" else "maternity" if kind == "maternity" else "general"]
            admissions.append({
                "id": gen_uuid(), "facility_id": fac[slug].id, "patient_id": p["id"], "ward_id": ward["id"],
                "bed_id": bed["id"], "admitting_doctor_id": doctor.id if doctor else None,
                "reason": pool[h("rsn" + p["patient_code"]) % len(pool)],
                "admitted_at": now - timedelta(hours=6 + h("adm" + p["patient_code"]) % 480),
                "discharged_at": None,
            })
            admitted_now.add(p["patient_code"])
        for label in cfg["cleaning"]:
            beds[(slug, label)]["status"] = "cleaning"
        for label in cfg["reserved"]:
            beds[(slug, label)]["status"] = "reserved"

    for code, slug, bed_label, days, reason in N.ISOLATED:
        bed = beds[(slug, bed_label)]
        bed["status"] = "occupied"
        admissions.append({
            "id": gen_uuid(), "facility_id": fac[slug].id, "patient_id": patients[code]["id"],
            "ward_id": wards[(slug, "isolation")]["id"], "bed_id": bed["id"],
            "admitting_doctor_id": one(slug, "tb").id, "reason": reason,
            "admitted_at": now - timedelta(days=days), "discharged_at": None,
        })
        admitted_now.add(code)

    # Past stays over the last 60 days feed the admitted-vs-discharged chart.
    for code, p in sorted(patients.items()):
        if _num(code) <= 18 or code in admitted_now or h("wasadm" + code) % 10 >= 7:
            continue
        kind = ward_kind_for(p["_slug"], p)
        if not kind:
            continue
        admitted = now - timedelta(days=5 + h("dad" + code) % 55, hours=h("dah" + code) % 12)
        discharged = min(admitted + timedelta(days=2 + h("los" + code) % 8), now - timedelta(hours=2))
        gens = with_tag(p["_slug"], "general")
        admissions.append({
            "id": gen_uuid(), "facility_id": p["facility_id"], "patient_id": p["id"],
            "ward_id": wards[(p["_slug"], kind)]["id"], "bed_id": None,
            "admitting_doctor_id": gens[h("dd" + code) % len(gens)].id,
            "reason": past_reasons[h("drs" + code) % 6], "admitted_at": admitted, "discharged_at": discharged,
        })
    session.execute(Ward.__table__.insert(), ward_rows)
    session.execute(Bed.__table__.insert(), bed_rows)
    session.execute(Admission.__table__.insert(), admissions)

    # ------------------------------------------------------------------ appointments
    active_tb = {c for c, e in episodes.items() if e["status"] == "active"}
    dead = {c for c, e in episodes.items() if e["status"] == "died"}
    appts = []
    for cfg in N.HOSPITALS:
        slug = cfg["slug"]
        pool = sorted(c for c, p in patients.items() if p["_slug"] == slug and c not in dead)
        receptionist = next((u for u, _ in staff[slug] if u.role == "receptionist"), None)
        for day in range(-30, 15):
            d = today + timedelta(days=day)
            if d.isoweekday() >= 6:
                continue
            count = cfg["appointments"]["today" if day == 0 else "past" if day < 0 else "future"]
            for s in range(1, count + 1):
                key = f"{slug}{day}-{s}"
                code = pool[h("ap" + key) % len(pool)]
                p = patients[code]
                if code in active_tb:
                    kind, doctor = "tb", one(slug, "tb")
                elif p["age"] < 15:
                    kind, doctor = "child", one(slug, "paeds")
                elif code in antenatal:
                    kind, doctor = "antenatal", one(slug, "obgyn")
                else:
                    kind, doctor = "general", None
                if doctor is None or not available(doctor, day):
                    gens = [g for g in with_tag(slug, "general") if available(g, day)] or with_tag(slug, "tb")
                    doctor = gens[h("gd" + key) % len(gens)]
                if kind == "tb":
                    reason = "TB treatment review"
                elif kind == "child":
                    reason = ["Child wellness review", "Immunisation", "Paediatric follow-up"][h("cr" + key) % 3]
                elif kind == "antenatal":
                    reason = "Antenatal visit"
                elif p["age"] >= 40:
                    reason = ["Hypertension review", "Diabetes follow-up", "Post-discharge review",
                              "General consultation"][h("gr" + key) % 4]
                else:
                    reason = ["General consultation", "Follow-up review", "Post-discharge review"][h("gr" + key) % 3]
                slot = at(d, 8, 0) + timedelta(minutes=(s - 1) * 40)
                if slot > now:
                    status = "scheduled"
                else:
                    status = {0: "no_show", 1: "cancelled"}.get(h("as" + key) % 10, "completed")
                online = p["_portal"] and h("bv" + key) % 2 == 0
                appts.append({
                    "id": gen_uuid(), "facility_id": fac[slug].id, "patient_id": p["id"], "doctor_id": doctor.id,
                    "scheduled_at": slot, "duration_min": 30, "reason": reason, "status": status,
                    "booked_via": "patient_portal" if online else "reception",
                    "booked_by": p["user_id"] if online else (receptionist.id if receptionist else None),
                    "created_at": slot - timedelta(days=1 + h("ca" + key) % 10),
                })
    session.execute(Appointment.__table__.insert(), appts)

    # ------------------------------------------------------------------ today's walk-in queue
    visits = []
    minutes_today = (now - at(today)).total_seconds() / 60
    for cfg in N.HOSPITALS:
        slug, n = cfg["slug"], cfg["queue"]
        pool = sorted(c for c, p in patients.items()
                      if p["_slug"] == slug and _num(c) > 18 and c not in admitted_now and c not in dead)
        stride = max(1, len(pool) // n)
        chosen = [pool[(i * stride + h("qo" + slug) % stride) % len(pool)] for i in range(n)]
        doctors = [u for u, _ in staff[slug] if u.role == "doctor" and available(u, 0)]
        waiting = max(2, round(n * 0.25))
        in_consult = min(3, max(0, len(doctors) - 1))
        spacing = min(14.0, max(1.0, (minutes_today - 5) / (n + 1)))
        for i, code in enumerate(chosen, start=1):
            arrived = now - timedelta(minutes=(n + 1 - i) * spacing)
            waited = now - arrived
            status = ("waiting" if i > n - waiting else "in_consultation" if i > n - waiting - in_consult
                      else "completed")
            doctor = None
            if status == "in_consultation":
                doctor = doctors[(i - (n - waiting - in_consult) - 1) % len(doctors)]
            elif status == "completed":
                doctor = doctors[i % len(doctors)]
            visits.append({
                "id": gen_uuid(), "facility_id": fac[slug].id, "patient_id": patients[code]["id"],
                "doctor_id": doctor.id if doctor else None,
                "priority": "urgent" if i % 7 == 3 else "moderate" if i % 3 == 0 else "low",
                "status": status, "arrived_at": arrived,
                "started_at": arrived + waited * 0.3 if status != "waiting" else None,
                "completed_at": arrived + waited * 0.6 if status == "completed" else None,
            })
    session.execute(Visit.__table__.insert(), visits)

    # ------------------------------------------------------------------ finish
    # New registrations continue after the highest code in use; codes are never reused.
    session.execute(text(
        "SELECT setval('patient_code_seq', GREATEST((SELECT max(substr(patient_code, 2)::bigint) FROM patients), 1))"
    ))
    session.execute(text(
        "SELECT setval('staff_code_seq', GREATEST((SELECT max(substr(staff_code, 2)::bigint) "
        "FROM users WHERE staff_code IS NOT NULL), 1))"
    ))

    admin = User.query.filter_by(email=network_admin.email, role="network_admin", is_active=True).first()
    if not admin:
        raise SeedError("The network admin account is missing after seeding; nothing was saved.")
    session.commit()

    summary = {
        "hospitals": len(fac), "staff": sum(len(v) for v in staff.values()) + 1,
        "patients": len(patients), "portal accounts": len(patient_users), "TB episodes": len(episodes),
        "doses": len(doses), "medications": len(meds), "lab results": len(labs), "files": len(files),
        "wards": len(ward_rows), "beds": len(bed_rows), "admissions": len(admissions),
        "appointments": len(appts), "walk-ins today": len(visits),
    }
    for k, v in summary.items():
        log(f"  {k:<16} {v}")
    per = session.execute(
        select(Facility.name, func.count(Patient.id))
        .join(Patient, Patient.facility_id == Facility.id)
        .where(Facility.is_seeded)
        .group_by(Facility.name)
        .order_by(Facility.name)
    ).all()
    for name, n in per:
        log(f"  {name:<34} {n} patients")
    return summary


_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _link_code():
    raw = "".join(secrets.choice(_ALPHABET) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def _med(patient_id, drug, dose, freq, start, end, doctor, active):
    return {"id": gen_uuid(), "patient_id": patient_id, "drug_name": drug, "dose": dose, "frequency": freq,
            "start_date": start, "end_date": end, "prescribed_by": doctor, "active": active}


def _lab(patient_id, test, result, collected, reported, notes=None, mdr=False):
    return {"id": gen_uuid(), "patient_id": patient_id, "test_type": test, "result": result,
            "collected_at": collected, "reported_at": reported, "notes": notes, "mdr_detected": bool(mdr)}
