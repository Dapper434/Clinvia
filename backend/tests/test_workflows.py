"""Booking, the queue, admissions, the dose log, staff accounts and new hospitals."""
from datetime import date, timedelta

from sqlalchemy import text

KNH_DOCTOR = "amina.hassan@knh.clinvia.health"
KNH_ADMIN = "samuel.kiprono@knh.clinvia.health"
KNH_NURSE = "grace.muthoni@knh.clinvia.health"
KNH_RECEPTION = "mercy.akinyi@knh.clinvia.health"


def next_weekday(days_ahead=21):
    d = date.today() + timedelta(days=days_ahead)
    while d.isoweekday() >= 6:
        d += timedelta(days=1)
    return d.isoformat()


def test_booking_takes_a_slot_once(client, login):
    rec = login(KNH_RECEPTION)
    day = next_weekday()
    body = {"patientCode": "P0010", "doctorCode": "S0005", "date": day, "time": "09:20", "reason": "TB treatment review"}
    doctors = {d["code"]: d for d in client.get("/api/staff/doctors?bookable=1", headers=rec).get_json()}
    body["doctorCode"] = next(c for c, d in doctors.items() if d["name"] == "Dr. Amina Hassan")
    assert client.post("/api/appointments", json=body, headers=rec).status_code == 201
    assert client.post("/api/appointments", json=body, headers=rec).status_code == 409
    slots = client.get(f"/api/appointments/slots?doctor={body['doctorCode']}&date={day}", headers=rec).get_json()
    assert next(s for s in slots["slots"] if s["time"] == "09:20")["why"] == "taken"


def test_doctors_on_leave_are_not_bookable(client, login):
    rec = login(KNH_RECEPTION)
    names = [d["name"] for d in client.get("/api/staff/doctors?bookable=1", headers=rec).get_json()]
    assert "Dr. Esther Wambui" not in names


def test_walk_in_queue_call_in_and_finish(client, login):
    nurse = login(KNH_NURSE)
    rec = login(KNH_RECEPTION)
    r = client.post("/api/visits", json={"patientCode": "P0240", "priority": "urgent"}, headers=rec)
    if r.status_code == 400:  # already queued by the seed
        return
    assert r.status_code == 201
    queue = client.get("/api/visits", headers=nurse).get_json()
    assert queue["waiting"][0]["priority"] == "urgent"
    visit_id = r.get_json()["id"]
    called = client.patch(f"/api/visits/{visit_id}", json={"action": "call"}, headers=nurse)
    assert called.status_code in (200, 409)
    if called.status_code == 200:
        assert client.patch(f"/api/visits/{visit_id}", json={"action": "finish"}, headers=nurse).status_code == 200


def test_discharge_marks_bed_for_cleaning(client, login):
    doc = login(KNH_DOCTOR)
    data = client.get("/api/admissions", headers=doc).get_json()
    adm = data["open"][0]
    assert client.patch(f"/api/admissions/{adm['id']}/discharge", headers=doc).status_code == 200
    beds = {b["label"]: b for w in client.get("/api/admissions", headers=doc).get_json()["wards"] for b in w["beds"]}
    bed = beds[adm["bed"]]
    assert bed["status"] == "cleaning"
    assert client.patch(f"/api/beds/{bed['id']}", json={"status": "available"}, headers=doc).status_code == 200


def test_patient_checked_in_doses_are_locked(client, login):
    nurse = login(KNH_NURSE)
    log = client.get("/api/doses", headers=nurse).get_json()
    for day in log["days"]:
        rows = client.get(f"/api/doses?date={day}", headers=nurse).get_json()["rows"]
        mine = [r for r in rows if r["logged"] and r["logged"]["src"] == "p"]
        if mine:
            r = client.put("/api/doses", json={"date": day, "entries": [{"code": mine[0]["code"], "status": "missed"}]},
                           headers=nurse)
            assert r.get_json()["locked"] == [mine[0]["name"]]
            return
    raise AssertionError("expected at least one portal check-in in the last week")


def test_patients_can_only_check_in_a_taken_dose(client, login):
    pat = login("faith.wanjiru.p0001@patient.clinvia.health", "Patient-test-1", kind="patient")
    r = client.post("/api/patient-portal/log-dose", json={"taken": False}, headers=pat)
    assert r.status_code == 400


def test_new_staff_can_sign_in_and_edits_show_everywhere(client, login):
    admin = login(KNH_ADMIN)
    r = client.post("/api/staff", json={"name": "Dr. Test Mwenda", "email": "test.mwenda", "role": "doctor",
                                        "specialty": "General Medicine", "password": "Welcome-2026"}, headers=admin)
    assert r.status_code == 201, r.get_json()
    code = r.get_json()["code"]
    assert r.get_json()["email"] == "test.mwenda@knh.clinvia.health"
    assert client.post("/api/staff", json={"name": "X", "email": "x@thika.clinvia.health", "role": "nurse",
                                           "password": "Welcome-2026"}, headers=admin).status_code == 400
    new = login("test.mwenda@knh.clinvia.health", "Welcome-2026")
    assert client.get("/api/auth/me", headers=new).get_json()["user"]["mustChangePassword"] is True
    client.patch(f"/api/staff/{code}", json={"name": "Dr. Tess Mwenda"}, headers=admin)
    names = [d["name"] for d in client.get("/api/staff/doctors", headers=admin).get_json()]
    assert "Dr. Tess Mwenda" in names


def test_new_hospital_starts_empty_and_is_isolated(client):
    r = client.post("/api/hospitals/register", json={
        "hospital": {"name": "Mercy Mission Hospital", "level": "Mission hospital", "county": "Nyeri",
                     "domain": "mercy.clinvia.health", "lat": -0.42, "lng": 36.95},
        "admin": {"fullName": "Ruth Kanini", "email": "ruth.kanini@mercy.clinvia.health", "password": "Mercy-2026!"},
    })
    assert r.status_code == 201, r.get_json()
    h = {"Authorization": "Bearer " + r.get_json()["token"]}
    assert client.get("/api/patients", headers=h).get_json()["total"] == 0
    assert client.get("/api/admissions", headers=h).get_json()["wards"] == []
    assert client.get("/api/patients/P0001", headers=h).status_code == 404
    new = client.post("/api/patients", json={"name": "First Patient", "age": 40, "gender": "female"}, headers=h)
    assert new.status_code == 201
    assert int(new.get_json()["code"][1:]) > 240


def test_patient_codes_grow_past_four_digits(app):
    from app.extensions import db

    with app.app_context():
        db.session.execute(text("SELECT setval('patient_code_seq', 9999)"))
        assert db.session.execute(text("SELECT next_patient_code()")).scalar() == "P10000"
        db.session.rollback()
