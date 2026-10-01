"""Registering a patient with their contact details, classifying the TB, and prescribing.

The regimen is derived from the classification and the doses from the weight, so these
tests pin both the derivation itself and what the endpoints do with it.
"""
from app.prescribing import regimen_for, regimen_plan, weight_band

KNH_DOCTOR = "amina.hassan@knh.clinvia.health"
KNH_RECEPTION = "mercy.akinyi@knh.clinvia.health"


def register(client, headers, **over):
    body = {"name": "Test Patient", "age": 30, "gender": "female", "phone": "0722000111",
            "email": "test.patient@example.com", "weight": 54}
    body.update(over)
    r = client.post("/api/patients", json=body, headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["code"]


# ---------------------------------------------------------------- the rules themselves
def test_weight_bands_have_no_gaps():
    """A weight with a decimal must still land in a band."""
    for kg in (4, 7.9, 8, 24.9, 25, 37.5, 38, 54.5, 55, 70.9, 71, 120):
        assert weight_band(kg) is not None, kg
    assert weight_band(54.5)["tablets"] == 3
    assert weight_band(55)["tablets"] == 4
    assert weight_band(3.5) is None
    assert weight_band(None) is None
    # Under 25 kg a child is dosed on the dispersible paediatric chart.
    assert weight_band(20)["paediatric"] is True
    assert weight_band(30)["paediatric"] is False


def test_regimen_follows_the_classification():
    assert regimen_for("pulmonary")[0] == "2HRZE/4HR"
    assert regimen_for("extra_pulmonary", "pleural")[0] == "2HRZE/4HR"
    # TB of the brain or spine is treated for a year.
    assert regimen_for("extra_pulmonary", "meningeal")[0] == "2HRZE/10HR"
    assert regimen_for("extra_pulmonary", "spine_bone")[0] == "2HRZE/10HR"
    assert regimen_for("pulmonary", resistance="mdr")[0] == "BPaLM"
    assert regimen_for("pulmonary", resistance="rr")[0] == "BPaLM"
    # Fluoroquinolone resistance drops the moxifloxacin.
    assert regimen_for("pulmonary", resistance="pre_xdr")[0] == "BPaL"
    assert regimen_for("pulmonary", resistance="xdr")[0] == "individualised"


def test_drug_resistant_children_are_not_dosed_automatically():
    code, warnings = regimen_for("pulmonary", resistance="mdr", age=9)
    assert code == "individualised"
    assert any("14 years" in w for w in warnings)


def test_plan_doses_by_weight_band():
    plan = regimen_plan(site="pulmonary", weight_kg=60, age=30)
    lines = {l["drug"]: l for l in plan["lines"]}
    assert lines["RHZE 150/75/400/275 (FDC)"]["dose"] == "4 tablets"
    assert lines["RHZE 150/75/400/275 (FDC)"]["days"] == 56
    # The continuation phase picks up where the intensive one stops.
    assert lines["RH 150/75 (FDC)"]["from"] == 56
    assert plan["totalDays"] == 182

    child = regimen_plan(site="pulmonary", weight_kg=12, age=3)
    drugs = [l["drug"] for l in child["lines"]]
    assert "RHZ 75/50/150 dispersible (FDC)" in drugs
    assert "Pyridoxine (vitamin B6)" in drugs

    meningitis = regimen_plan(site="extra_pulmonary", eptb_site="meningeal", weight_kg=60, age=30)
    assert meningitis["totalDays"] == 364


def test_plan_asks_for_a_weight_instead_of_guessing():
    plan = regimen_plan(site="pulmonary", age=30)
    assert plan["lines"] == []
    assert any("weight" in w for w in plan["warnings"])


def test_bedaquiline_loads_before_it_drops_to_three_times_weekly():
    lines = [l for l in regimen_plan(site="pulmonary", resistance="mdr", weight_kg=60, age=30)["lines"]
             if l["drug"] == "Bedaquiline"]
    assert [(l["dose"], l["freq"], l["days"]) for l in lines] == [
        ("400 mg", "Once daily", 14), ("200 mg", "3 times weekly", 168),
    ]


# ---------------------------------------------------------------- through the API
def test_register_keeps_contact_email_and_weight(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc, name="Faith Njeri", email="Faith.Njeri@Gmail.com ", weight="61.4")
    p = client.get(f"/api/patients/{code}", headers=doc).get_json()["patient"]
    assert p["email"] == "faith.njeri@gmail.com"
    assert p["weight"] == 61.4
    assert p["weightTakenOn"]


def test_register_rejects_a_bad_email_or_weight(client, login):
    doc = login(KNH_DOCTOR)
    for bad in ({"email": "not-an-email"}, {"weight": "heavy"}, {"weight": 900}):
        r = client.post("/api/patients", json={"name": "X", "age": 20, **bad}, headers=doc)
        assert r.status_code == 400, bad


def test_classification_picks_the_regimen_on_registration(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc, weight=60, tb={
        "type": "extra_pulmonary", "eptbSite": "meningeal", "diagnosis": "clinical",
        "history": "relapse", "resistance": "susceptible", "start": "2026-09-01",
    })
    e = client.get(f"/api/patients/{code}", headers=doc).get_json()["episode"]
    assert e["regimen"] == "2HRZE/10HR"
    assert (e["eptbSite"], e["diagnosis"], e["history"]) == ("meningeal", "clinical", "relapse")
    assert e["mdr"] is False


def test_resistance_sets_the_drug_resistant_flag_the_dashboard_reads(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc, weight=60, tb={"type": "pulmonary", "resistance": "pre_xdr"})
    e = client.get(f"/api/patients/{code}", headers=doc).get_json()["episode"]
    assert (e["regimen"], e["resistance"], e["mdr"]) == ("BPaL", "pre_xdr", True)


def test_extra_pulmonary_needs_an_organ(client, login):
    doc = login(KNH_DOCTOR)
    r = client.post("/api/patients", json={"name": "X", "age": 30, "tb": {"type": "extra_pulmonary"}},
                    headers=doc)
    assert r.status_code == 400
    assert "organ" in r.get_json()["error"]


def test_regimen_endpoint_prescribes_every_line_at_once(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc, weight=60, tb={"type": "pulmonary", "start": "2026-09-01"})
    plan = client.get(f"/api/patients/{code}/regimen", headers=doc).get_json()
    assert plan["regimen"] == "2HRZE/4HR"
    assert plan["band"]["tablets"] == 4

    r = client.post(f"/api/patients/{code}/regimen", json={"lines": plan["lines"]}, headers=doc)
    assert r.status_code == 201, r.get_json()
    meds = r.get_json()["medications"]
    assert "RHZE 150/75/400/275 (FDC)" in [m["drug"] for m in meds]
    assert all(m["fromRegimen"] for m in meds)
    # The continuation phase is written now but only becomes current when it starts.
    assert not any(m["drug"] == "RH 150/75 (FDC)" for m in meds)


def test_re_dosing_replaces_the_regimen_but_not_other_prescriptions(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc, weight=54, tb={"type": "pulmonary", "start": "2026-09-01"})
    plan = client.get(f"/api/patients/{code}/regimen", headers=doc).get_json()
    client.post(f"/api/patients/{code}/regimen", json={"lines": plan["lines"]}, headers=doc)
    client.post(f"/api/patients/{code}/medications",
                json={"drug": "Amoxicillin", "dose": "500 mg", "freq": "8 hourly"}, headers=doc)

    # The patient gains weight and moves up a band, so the regimen is written again.
    client.patch(f"/api/patients/{code}", json={"weight": 62}, headers=doc)
    again = client.get(f"/api/patients/{code}/regimen", headers=doc).get_json()
    assert again["band"]["tablets"] == 4
    r = client.post(f"/api/patients/{code}/regimen", json={"lines": again["lines"]}, headers=doc)
    meds = r.get_json()["medications"]
    fdc = [m for m in meds if m["drug"] == "RHZE 150/75/400/275 (FDC)"]
    assert [m["dose"] for m in fdc] == ["4 tablets"]
    # The antibiotic the doctor typed in by hand is untouched.
    assert any(m["drug"] == "Amoxicillin" for m in meds)


def test_a_dose_has_to_be_an_amount_and_a_unit(client, login):
    doc = login(KNH_DOCTOR)
    code = register(client, doc)
    bad = client.post(f"/api/patients/{code}/medications",
                      json={"drug": "Amoxicillin", "dose": "as directed", "freq": "8 hourly"}, headers=doc)
    assert bad.status_code == 400
    assert "amount and a unit" in bad.get_json()["error"]
    ok = client.post(f"/api/patients/{code}/medications",
                     json={"drug": "Amoxicillin", "dose": "500mg", "freq": "8 hourly"}, headers=doc)
    assert ok.status_code == 201


def test_receptionists_register_contact_details_but_not_treatment(client, login):
    rec = login(KNH_RECEPTION)
    code = register(client, rec, name="Walk In", email="walk.in@example.com", weight=70)
    r = client.post("/api/patients", json={"name": "No", "age": 20, "tb": {"type": "pulmonary"}}, headers=rec)
    assert r.status_code == 403
    # A receptionist may not prescribe either.
    assert client.post(f"/api/patients/{code}/medications",
                       json={"drug": "Amoxicillin", "dose": "500 mg", "freq": "8 hourly"},
                       headers=rec).status_code == 403
