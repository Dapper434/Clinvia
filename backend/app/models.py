import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from .extensions import db


def gen_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False, default="hospital")
    full_name = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "role IN ('hospital', 'nurse', 'admin', 'viewer', 'patient')", name="users_role_check"
        ),
    )

    def to_public_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "fullName": self.full_name,
        }


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = db.Column(db.Text)
    role = db.Column(db.Text, nullable=False, default="hospital")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "role IN ('hospital', 'nurse', 'admin', 'viewer', 'patient')", name="profiles_role_check"
        ),
    )


class Facility(db.Model):
    __tablename__ = "facilities"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.Text, nullable=False)
    county = db.Column(db.Text)
    sub_county = db.Column(db.Text)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    phone = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "county": self.county,
            "sub_county": self.sub_county,
            "lat": self.lat,
            "lng": self.lng,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    name = db.Column(db.Text, nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.Text)
    phone = db.Column(db.Text)
    address = db.Column(db.Text)
    facility = db.Column(db.Text)
    tb_type = db.Column(db.Text)
    regimen = db.Column(db.Text)
    treatment_start = db.Column(db.Date, nullable=False)
    status = db.Column(db.Text, nullable=False, default="active")
    mdr_flag = db.Column(db.Boolean, nullable=False, default=False)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    registered_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"))
    assigned_doctor_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    # Local wall-clock time (APP_TIMEZONE) the doctor wants the daily dose taken; null = default.
    dose_time = db.Column(db.Time)
    last_reminder_sent_on = db.Column(db.Date)

    assigned_doctor = db.relationship("User", foreign_keys=[assigned_doctor_id])

    __table_args__ = (
        db.CheckConstraint("gender IN ('male', 'female', 'other')", name="patients_gender_check"),
        db.CheckConstraint("tb_type IN ('pulmonary', 'extra-pulmonary')", name="patients_tb_type_check"),
        db.CheckConstraint(
            "status IN ('active', 'completed', 'lost', 'died')", name="patients_status_check"
        ),
        db.Index("patients_user_id_idx", "user_id"),
        db.Index("patients_status_idx", "status"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "phone": self.phone,
            "address": self.address,
            "facility": self.facility,
            "tb_type": self.tb_type,
            "regimen": self.regimen,
            "treatment_start": self.treatment_start.isoformat() if self.treatment_start else None,
            "status": self.status,
            "mdr_flag": self.mdr_flag,
            "lat": self.lat,
            "lng": self.lng,
            "registered_by": self.registered_by,
            "assigned_doctor_id": self.assigned_doctor_id,
            "dose_time": self.dose_time.strftime("%H:%M") if self.dose_time else None,
            "assigned_doctor": (
                {
                    "id": self.assigned_doctor.id,
                    "fullName": self.assigned_doctor.full_name,
                    "email": self.assigned_doctor.email,
                }
                if self.assigned_doctor
                else None
            ),
        }


class DoseLog(db.Model):
    __tablename__ = "dose_logs"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    taken = db.Column(db.Boolean, nullable=False)
    notes = db.Column(db.Text)
    logged_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.UniqueConstraint("patient_id", "date", name="dose_logs_patient_id_date_key"),
        db.Index("dose_logs_patient_date_idx", "patient_id", "date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "date": self.date.isoformat() if self.date else None,
            "taken": self.taken,
            "notes": self.notes,
            "logged_by": self.logged_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LabResult(db.Model):
    __tablename__ = "lab_results"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    test_type = db.Column(db.Text, nullable=False)
    result = db.Column(db.Text, nullable=False)
    result_date = db.Column(db.Date, nullable=False)
    lab_ref = db.Column(db.Text)
    notes = db.Column(db.Text)
    mdr_detected = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "test_type IN ('sputum_smear', 'genexpert', 'xray', 'culture')", name="lab_results_test_type_check"
        ),
        db.CheckConstraint("result IN ('positive', 'negative', 'pending')", name="lab_results_result_check"),
        db.Index("lab_results_patient_idx", "patient_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "test_type": self.test_type,
            "result": self.result,
            "result_date": self.result_date.isoformat() if self.result_date else None,
            "lab_ref": self.lab_ref,
            "notes": self.notes,
            "mdr_detected": self.mdr_detected,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Contact(db.Model):
    __tablename__ = "contacts"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_patient_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    name = db.Column(db.Text, nullable=False)
    age = db.Column(db.Integer)
    relationship = db.Column(db.Text)
    phone = db.Column(db.Text)
    screened = db.Column(db.Boolean, nullable=False, default=False)
    screen_result = db.Column(db.Text)
    screened_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "relationship IN ('spouse', 'child', 'parent', 'roommate', 'other')",
            name="contacts_relationship_check",
        ),
        db.CheckConstraint(
            "screen_result IS NULL OR screen_result IN ('negative', 'referred', 'confirmed_tb')",
            name="contacts_screen_result_check",
        ),
        db.Index("contacts_source_patient_idx", "source_patient_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "source_patient_id": self.source_patient_id,
            "name": self.name,
            "age": self.age,
            "relationship": self.relationship,
            "phone": self.phone,
            "screened": self.screened,
            "screen_result": self.screen_result,
            "screened_date": self.screened_date.isoformat() if self.screened_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PushSubscription(db.Model):
    """A browser's web-push endpoint for a user (one user can have several devices)."""

    __tablename__ = "push_subscriptions"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = db.Column(db.Text, nullable=False, unique=True)
    p256dh = db.Column(db.Text, nullable=False)
    auth = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (db.Index("push_subscriptions_user_idx", "user_id"),)

    def subscription_info(self):
        return {"endpoint": self.endpoint, "keys": {"p256dh": self.p256dh, "auth": self.auth}}
