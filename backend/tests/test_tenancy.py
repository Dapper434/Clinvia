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
    na = login(NETWORK)
    everyone = client.get("/api/dashboard", headers=na).get_json()
    codes = [a["code"] for a in everyone["attention"]]
    assert codes == ["P0005", "P0003", "P0010", "P0011", "P0024"]
    thika = client.get("/api/dashboard", headers={**na, "X-Hospital": "thika"}).get_json()
    assert [a["code"] for a in thika["attention"]] == ["P0005"]


def test_network_admin_reads_but_does_not_register_patients(client, login):
    na = login(NETWORK)
    r = client.post("/api/patients", json={"name": "Test", "age": 30}, headers={**na, "X-Hospital": "knh"})
    assert r.status_code == 403


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
