"""Each hospital sees only its own records; sign-in follows the email domain."""

KNH_DOCTOR = "amina.hassan@knh.clinvia.health"
THIKA_CEO = "anne.wangui@thika.clinvia.health"
KNH_RECEPTION = "mercy.akinyi@knh.clinvia.health"
NETWORK = "admin@clinvia.health"


def test_staff_sign_in_must_use_their_hospitals_domain(client):
    r = client.post("/api/auth/login/hospital", json={"email": "amina.hassan@thika.clinvia.health",
                                                      "password": "Knh-test-1"})
    assert r.status_code == 401


def test_hospital_domain_lookup(client):
    assert client.get("/api/auth/domain?email=x@thika.clinvia.health").get_json()["name"] == "Thika Level 5 Hospital"
    assert client.get("/api/auth/domain?email=x@clinvia.health").get_json()["kind"] == "network"


def test_patient_account_cannot_use_staff_sign_in(client):
    r = client.post("/api/auth/login/hospital", json={
        "email": "faith.wanjiru.p0001@patient.clinvia.health", "password": "Patient-test-1"})
    assert r.status_code == 403


def test_a_hospital_cannot_open_another_hospitals_patient(client, login):
    knh = login(KNH_DOCTOR)
    assert client.get("/api/patients/P0010", headers=knh).status_code == 200  # KNH patient
    r = client.get("/api/patients/P0005", headers=knh)  # Thika patient
    assert r.status_code == 404
    assert "P0005" in r.get_json()["error"]


def test_registry_and_staff_are_limited_to_own_hospital(client, login):
    knh = login(KNH_DOCTOR)
    rows = client.get("/api/staff", headers=knh).get_json()["rows"]
    assert {r["hospital"] for r in rows} == {"Kenyatta National Hospital"}
    listed = client.get("/api/patients?q=james", headers=knh).get_json()["rows"]
    assert all(r["facility"] == "Kenyatta National Hospital" for r in listed)


def test_network_admin_sees_every_hospital_or_one(client, login):
    """Actor: TB representative. Counts for every hospital, or one; never who the patients are."""
    na = login(NETWORK)
    everyone = client.get("/api/dashboard", headers=na).get_json()
    assert everyone["attention"] is None
    assert everyone["attentionSummary"] == {"total": 5, "missed": 3, "notConverted": 1, "pending": 1}
    thika = client.get("/api/dashboard", headers={**na, "X-Hospital": "thika"}).get_json()
    assert thika["attentionSummary"]["total"] == 1


def test_network_admin_reads_but_does_not_register_patients(client, login):
    na = login(NETWORK)
    r = client.post("/api/patients", json={"name": "Test", "age": 30}, headers={**na, "X-Hospital": "knh"})
    assert r.status_code == 403


PATIENT_NAMES = ["James Mwangi", "Grace Achieng", "Brenda Kariuki", "George Rotich", "Naomi Maina", "Faith Wanjiru"]
STAFF_NAMES = ["Amina Hassan", "Esther Wambui", "Titus Kioko", "Lucy Wairimu", "Mercy Akinyi"]


def test_tb_representative_sees_no_names(client, login):
    """Actor: TB representative. Dashboard, overview, map and reports carry no patient or staff names."""
    na = login(NETWORK)
    for path in ("/api/dashboard", "/api/hospitals/overview", "/api/map/tb?set=all", "/api/reports",
                 "/api/exports/summary.csv", "/api/badges"):
        r = client.get(path, headers=na)
        assert r.status_code == 200, path
        text = r.get_data(as_text=True)
        for name in PATIENT_NAMES + STAFF_NAMES:
            assert name not in text, f"{name} shown on {path}"
        assert "P0005" not in text, path
    dash = client.get("/api/dashboard", headers=na).get_json()
    assert dash["schedule"] == [] and "scheduleByHospital" in dash  # empty at weekends
    assert dash["stats"]["doctorsOnLeave"] == [] and dash["stats"]["doctorsOnLeaveCount"] == 2


def test_tb_representative_cannot_open_lists_of_people(client, login):
    na = login(NETWORK)
    for path in ("/api/patients", "/api/patients/P0005", "/api/patients/lookup?q=gr", "/api/staff", "/api/doses",
                 "/api/appointments", "/api/visits", "/api/admissions", "/api/exports/tb.csv", "/api/staff/S0003"):
        assert client.get(path, headers=na).status_code == 403, path
    assert client.get("/api/directory", headers=na).status_code == 404


def test_tb_representative_edits_only_their_own_profile(client, login):
    na = login(NETWORK)
    me = client.get("/api/staff/me", headers=na).get_json()
    assert me["organisation"] == "Ministry of Health, National TB Programme"
    assert client.patch("/api/staff/me", json={"phone": "0700000001"}, headers=na).status_code == 200


def test_county_representative_sees_only_their_county(client, login):
    """Actor: TB representative with a county: Kiambu County covers Kiambu and Thika hospitals."""
    rep = login("kiambu.tb@clinvia.health")
    names = {h["name"] for h in client.get("/api/hospitals/overview", headers=rep).get_json()}
    assert names == {"Kiambu County Referral Hospital", "Thika Level 5 Hospital"}
    assert client.get("/api/dashboard", headers={**rep, "X-Hospital": "knh"}).status_code == 400
    assert client.get("/api/dashboard", headers=rep).get_json()["attentionSummary"]["total"] == 1
    csv_rows = client.get("/api/exports/summary.csv", headers=rep).get_data(as_text=True).strip().splitlines()
    assert len(csv_rows) == 3  # header + two hospitals


def test_hospitals_are_not_suspended_from_above(client, login):
    na = login(NETWORK)
    assert client.patch("/api/hospitals/knh", json={"active": False}, headers=na).status_code == 403


def test_summary_export_is_open_to_hospital_leaders_but_not_clinicians(client, login):
    assert client.get("/api/exports/summary.csv", headers=login(THIKA_CEO)).status_code == 200
    assert client.get("/api/exports/summary.csv", headers=login(KNH_DOCTOR)).status_code == 403


def test_executive_sees_totals_not_names(client, login):
    ceo = login(THIKA_CEO)
    dash = client.get("/api/dashboard", headers=ceo).get_json()
    assert dash["attention"] is None
    assert dash["attentionSummary"]["missed"] == 1
    assert "adherence" not in dash
    assert client.get("/api/patients", headers=ceo).status_code == 403


def test_receptionist_record_has_no_clinical_detail(client, login):
    rec = login(KNH_RECEPTION)
    record = client.get("/api/patients/P0010", headers=rec).get_json()
    for key in ("labs", "medications", "doses", "episode", "files"):
        assert key not in record
    dash = client.get("/api/dashboard", headers=rec).get_json()
    assert "attention" not in dash and "doseDays" not in dash
