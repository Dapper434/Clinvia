"""Seeds demo facilities, patients, staff/admin accounts, and activity data for local development.

Run with: python seed.py
"""
import random
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv

# Load .env relative to this file, not the caller's working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

from app import create_app  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import DoseLog, Facility, LabResult, Patient, Profile, User  # noqa: E402

DEMO_FACILITIES = [
    ("Thika Level 5 Hospital", "Kiambu", "Thika", -1.0332, 37.0693, "+254700000001"),
    ("Kiambu County Referral Hospital", "Kiambu", "Kiambu Town", -1.1741, 36.8356, "+254700000002"),
    ("Kenyatta National Hospital", "Nairobi", "Nairobi", -1.2921, 36.8219, "+254700000003"),
    ("Machakos Level 5 Hospital", "Machakos", "Machakos", -1.5177, 37.2634, "+254700000004"),
    ("Nakuru Level 5 Hospital", "Nakuru", "Nakuru", -0.2833, 36.0667, "+254700000005"),
]

DEMO_PATIENTS = [
    ("James Mwangi", 34, "male", "pulmonary", "HRZE", "2026-01-10", "active", "Thika Level 5 Hospital", -1.0332, 37.0693),
    ("Faith Wanjiru", 27, "female", "pulmonary", "HRZE", "2026-02-01", "active", "Kiambu County Referral Hospital", -1.1741, 36.8356),
    ("Peter Otieno", 45, "male", "extra-pulmonary", "HRE", "2025-12-15", "active", "Kenyatta National Hospital", -1.2921, 36.8219),
    ("Grace Achieng", 31, "female", "pulmonary", "HRZE", "2026-02-10", "active", "Nakuru Level 5 Hospital", -0.2833, 36.0667),
    ("David Kiprop", 52, "male", "pulmonary", "HRZE", "2026-01-20", "active", "Machakos Level 5 Hospital", -1.5177, 37.2634),
]

# Demo credentials for local development only — change these before any real deployment.
DEMO_ADMIN = {
    "email": "admin@clinvia.local",
    "password": "AdminDemo123!",
    "fullName": "System Administrator",
}

DEMO_STAFF = {
    "email": "staff@clinvia.local",
    "password": "StaffDemo123!",
    "fullName": "Demo Clinician",
}

# Linked to the "James Mwangi" demo patient below so logging in shows a
# populated treatment record and dose history instead of an empty one.
DEMO_PATIENT = {
    "email": "patient@clinvia.local",
    "password": "PatientDemo123!",
    "linked_patient_name": "James Mwangi",
}

LAB_RESULT_OPTIONS = ["positive", "negative", "pending"]


def run_seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        if Facility.query.count() == 0:
            for name, county, sub_county, lat, lng, phone in DEMO_FACILITIES:
                db.session.add(Facility(name=name, county=county, sub_county=sub_county, lat=lat, lng=lng, phone=phone))

        if Patient.query.count() == 0:
            for name, age, gender, tb_type, regimen, start, status, facility, lat, lng in DEMO_PATIENTS:
                db.session.add(
                    Patient(
                        name=name,
                        age=age,
                        gender=gender,
                        tb_type=tb_type,
                        regimen=regimen,
                        treatment_start=date.fromisoformat(start),
                        status=status,
                        facility=facility,
                        lat=lat,
                        lng=lng,
                    )
                )
            db.session.flush()

        # A week of dose logs per patient and one lab result each, so the admin/
        # hospital dashboards have real data to chart. Checked per-patient (not
        # globally) so re-running this after patients already exist still fills
        # in anyone missing activity data.
        today = date.today()
        for patient in Patient.query.all():
            if DoseLog.query.filter_by(patient_id=patient.id).count() == 0:
                for i in range(7):
                    db.session.add(
                        DoseLog(
                            patient_id=patient.id,
                            date=today - timedelta(days=i),
                            taken=random.random() > 0.2,
                        )
                    )
            if LabResult.query.filter_by(patient_id=patient.id).count() == 0:
                db.session.add(
                    LabResult(
                        patient_id=patient.id,
                        test_type="genexpert",
                        result=random.choice(LAB_RESULT_OPTIONS),
                        result_date=today - timedelta(days=random.randint(1, 30)),
                    )
                )

        if User.query.filter_by(email=DEMO_ADMIN["email"]).first() is None:
            admin_user = User(
                email=DEMO_ADMIN["email"],
                password_hash=hash_password(DEMO_ADMIN["password"]),
                role="admin",
                full_name=DEMO_ADMIN["fullName"],
            )
            db.session.add(admin_user)
            db.session.flush()
            db.session.merge(Profile(id=admin_user.id, full_name=admin_user.full_name, role="admin"))

        if User.query.filter_by(email=DEMO_STAFF["email"]).first() is None:
            staff_user = User(
                email=DEMO_STAFF["email"],
                password_hash=hash_password(DEMO_STAFF["password"]),
                role="hospital",
                full_name=DEMO_STAFF["fullName"],
            )
            db.session.add(staff_user)
            db.session.flush()
            db.session.merge(Profile(id=staff_user.id, full_name=staff_user.full_name, role="hospital"))

        if User.query.filter_by(email=DEMO_PATIENT["email"]).first() is None:
            linked_patient = Patient.query.filter_by(name=DEMO_PATIENT["linked_patient_name"]).first()
            patient_user = User(
                email=DEMO_PATIENT["email"],
                password_hash=hash_password(DEMO_PATIENT["password"]),
                role="patient",
                full_name=DEMO_PATIENT["linked_patient_name"],
            )
            db.session.add(patient_user)
            db.session.flush()
            db.session.merge(Profile(id=patient_user.id, full_name=patient_user.full_name, role="patient"))
            if linked_patient and linked_patient.user_id is None:
                linked_patient.user_id = patient_user.id

        db.session.commit()
        print("Database schema created and seed records inserted successfully.")
        print()
        print("Demo admin login:  ", DEMO_ADMIN["email"], "/", DEMO_ADMIN["password"])
        print("Demo staff login:  ", DEMO_STAFF["email"], "/", DEMO_STAFF["password"])
        print("Demo patient login:", DEMO_PATIENT["email"], "/", DEMO_PATIENT["password"])


if __name__ == "__main__":
    run_seed()
