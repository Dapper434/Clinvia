import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func, text

from .extensions import db


def gen_uuid():
    return str(uuid.uuid4())


def _iso(value):
    return value.isoformat() if value else None


# Roles, grouped by what they can reach. `network_admin` has no hospital and sees all of them;
# every other staff role belongs to exactly one hospital.
STAFF_ROLES = ("admin", "executive", "doctor", "clinician", "nurse", "receptionist")
ALL_ROLES = ("network_admin",) + STAFF_ROLES + ("patient",)
_ROLE_CHECK = "role IN (" + ", ".join(f"'{r}'" for r in ALL_ROLES) + ")"

DUTY_STATUSES = ("on_duty", "off_duty", "on_leave")
TB_STATUSES = ("active", "cured", "completed", "lost_to_follow_up", "died", "failed")
LAB_TESTS = (
    "genexpert", "sputum_smear", "xray", "culture",
    "fbc", "malaria_rdt", "urinalysis", "rbs", "lft",
)
LAB_RESULTS = ("positive", "negative", "normal", "abnormal", "pending")


class Facility(db.Model):
    """A hospital. Each one is its own tenant: its staff only ever see its records."""

    __tablename__ = "facilities"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.Text, nullable=False, unique=True)
    slug = db.Column(db.Text, unique=True)
    level = db.Column(db.Text)
    county = db.Column(db.Text)
    sub_county = db.Column(db.Text)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    phone = db.Column(db.Text)
    # Staff sign in with an address at this domain, e.g. amina.hassan@knh.clinvia.health.
    email_domain = db.Column(db.Text, unique=True)
    active = db.Column(db.Boolean, nullable=False, server_default=text("true"), default=True)
    # Set on the hospitals the seed owns, so re-seeding never touches a registered hospital.
    is_seeded = db.Column(db.Boolean, nullable=False, server_default=text("false"), default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "level": self.level,
            "county": self.county,
            "sub_county": self.sub_county,
            "lat": self.lat,
            "lng": self.lng,
            "phone": self.phone,
            "emailDomain": self.email_domain,
            "active": self.active,
            "created_at": _iso(self.created_at),
        }


class User(db.Model):
    """A login. Staff rows also carry their hospital, S-code, specialty and duty status."""

    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False, default="clinician")
    full_name = db.Column(db.Text, nullable=False)
    facility_id = db.Column(UUID(as_uuid=False), db.ForeignKey("facilities.id"))
    staff_code = db.Column(db.Text, unique=True)
    phone = db.Column(db.Text)
    specialty = db.Column(db.Text)
    duty_status = db.Column(db.Text, nullable=False, server_default="on_duty", default="on_duty")
    is_active = db.Column(db.Boolean, nullable=False, server_default=text("true"), default=True)
    must_change_password = db.Column(db.Boolean, nullable=False, server_default=text("false"), default=False)
    last_login_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    facility = db.relationship("Facility")

    __table_args__ = (
        db.CheckConstraint(_ROLE_CHECK, name="users_role_check"),
        db.CheckConstraint(
            "duty_status IN ('on_duty', 'off_duty', 'on_leave')", name="users_duty_status_check"
        ),
        db.Index("users_facility_idx", "facility_id"),
    )

    @property
    def is_staff(self):
        return self.role != "patient"

    def to_public_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "fullName": self.full_name,
            "code": self.staff_code,
            "hospital": (
                {"id": self.facility.id, "name": self.facility.name, "slug": self.facility.slug}
                if self.facility
                else None
            ),
            "mustChangePassword": self.must_change_password,
        }

    def to_staff_dict(self):
        return {
            "id": self.id,
            "code": self.staff_code,
            "name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "specialty": self.specialty,
            "duty": self.duty_status,
            "active": self.is_active,
            "hospital": self.facility.name if self.facility else None,
            "hospitalSlug": self.facility.slug if self.facility else None,
            "lastLogin": _iso(self.last_login_at),
            "created_at": _iso(self.created_at),
        }


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = db.Column(db.Text)
    role = db.Column(db.Text, nullable=False, default="clinician")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (db.CheckConstraint(_ROLE_CHECK, name="profiles_role_check"),)


class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    # P0001, P0002, ... from patient_code_seq; grows past P9999 instead of truncating.
    patient_code = db.Column(
        db.Text, nullable=False, unique=True, server_default=text("next_patient_code()")
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    facility_id = db.Column(UUID(as_uuid=False), db.ForeignKey("facilities.id"))
    name = db.Column(db.Text, nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.Text)
    phone = db.Column(db.Text)
    address = db.Column(db.Text)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    registered_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    assigned_doctor_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    # One-time code staff hand to the patient so they can link a portal account to this record.
    portal_link_code = db.Column(db.Text, unique=True)
    # Local wall-clock time (APP_TIMEZONE) the doctor wants the daily dose taken; null = default.
    dose_time = db.Column(db.Time)
    last_reminder_sent_on = db.Column(db.Date)

    facility = db.relationship("Facility")
    assigned_doctor = db.relationship("User", foreign_keys=[assigned_doctor_id])
    episodes = db.relationship(
        "TbEpisode", back_populates="patient", order_by="TbEpisode.treatment_start.desc()"
    )

    __table_args__ = (
        db.CheckConstraint("gender IN ('male', 'female', 'other')", name="patients_gender_check"),
        db.CheckConstraint("age IS NULL OR age BETWEEN 0 AND 120", name="patients_age_check"),
        db.Index("patients_user_id_idx", "user_id"),
        db.Index("patients_facility_idx", "facility_id"),
    )

    @property
    def active_episode(self):
        return next((e for e in self.episodes if e.status == "active"), None)

    @property
    def latest_episode(self):
        return self.active_episode or (self.episodes[0] if self.episodes else None)

    def to_dict(self):
        episode = self.latest_episode
        return {
            "id": self.id,
            "code": self.patient_code,
            "created_at": _iso(self.created_at),
            "user_id": self.user_id,
            "portal": self.user_id is not None,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "phone": self.phone,
            "address": self.address,
            "facility": self.facility.name if self.facility else None,
            "lat": self.lat,
            "lng": self.lng,
            "assigned_doctor_id": self.assigned_doctor_id,
            "dose_time": self.dose_time.strftime("%H:%M") if self.dose_time else None,
            "assigned_doctor": (
                {
                    "id": self.assigned_doctor.id,
                    "code": self.assigned_doctor.staff_code,
                    "fullName": self.assigned_doctor.full_name,
                    "email": self.assigned_doctor.email,
                    "phone": self.assigned_doctor.phone,
                    "specialty": self.assigned_doctor.specialty,
                }
                if self.assigned_doctor
                else None
            ),
            "episode": episode.to_dict() if episode else None,
        }


class TbEpisode(db.Model):
    """One course of TB treatment. A patient can have several over the years, at most one active."""

    __tablename__ = "tb_episodes"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    tb_type = db.Column(db.Text, nullable=False)
    regimen = db.Column(db.Text, nullable=False)
    treatment_start = db.Column(db.Date, nullable=False)
    phase = db.Column(db.Text, nullable=False, default="intensive")
    status = db.Column(db.Text, nullable=False, default="active")
    mdr_flag = db.Column(db.Boolean, nullable=False, default=False)
    outcome_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    patient = db.relationship("Patient", back_populates="episodes")

    __table_args__ = (
        db.CheckConstraint("tb_type IN ('pulmonary', 'extra_pulmonary')", name="tb_episodes_type_check"),
        db.CheckConstraint(
            "phase IN ('intensive', 'continuation', 'closed')", name="tb_episodes_phase_check"
        ),
        db.CheckConstraint(
            "status IN ('active', 'cured', 'completed', 'lost_to_follow_up', 'died', 'failed')",
            name="tb_episodes_status_check",
        ),
        db.Index("tb_episodes_patient_idx", "patient_id"),
        db.Index(
            "tb_episodes_one_active_idx",
            "patient_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.tb_type,
            "regimen": self.regimen,
            "start": _iso(self.treatment_start),
            "phase": self.phase,
            "status": self.status,
            "mdr": self.mdr_flag,
            "outcomeDate": _iso(self.outcome_date),
        }


class DoseLog(db.Model):
    __tablename__ = "dose_logs"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    episode_id = db.Column(UUID(as_uuid=False), db.ForeignKey("tb_episodes.id", ondelete="CASCADE"))
    date = db.Column(db.Date, nullable=False)
    taken = db.Column(db.Boolean, nullable=False)
    # patient_portal = the patient checked in themselves; clinic_dot = staff observed it.
    source = db.Column(db.Text, nullable=False, server_default="clinic_dot", default="clinic_dot")
    notes = db.Column(db.Text)
    logged_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.UniqueConstraint("patient_id", "date", name="dose_logs_patient_id_date_key"),
        db.CheckConstraint("source IN ('patient_portal', 'clinic_dot')", name="dose_logs_source_check"),
        db.Index("dose_logs_patient_date_idx", "patient_id", "date"),
        db.Index("dose_logs_date_idx", "date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "date": _iso(self.date),
            "taken": self.taken,
            "source": self.source,
            "notes": self.notes,
            "created_at": _iso(self.created_at),
        }


class LabResult(db.Model):
    __tablename__ = "lab_results"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    test_type = db.Column(db.Text, nullable=False)
    result = db.Column(db.Text, nullable=False)
    collected_at = db.Column(db.Date, nullable=False)
    reported_at = db.Column(db.Date)
    lab_ref = db.Column(db.Text)
    notes = db.Column(db.Text)
    mdr_detected = db.Column(db.Boolean, nullable=False, default=False)
    recorded_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "test_type IN ('genexpert', 'sputum_smear', 'xray', 'culture', 'fbc', 'malaria_rdt', "
            "'urinalysis', 'rbs', 'lft')",
            name="lab_results_test_type_check",
        ),
        db.CheckConstraint(
            "result IN ('positive', 'negative', 'normal', 'abnormal', 'pending')",
            name="lab_results_result_check",
        ),
        db.Index("lab_results_patient_idx", "patient_id", "collected_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "test_type": self.test_type,
            "result": self.result,
            "collected": _iso(self.collected_at),
            "reported": _iso(self.reported_at),
            "lab_ref": self.lab_ref,
            "notes": self.notes,
            "mdr_detected": self.mdr_detected,
            "created_at": _iso(self.created_at),
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
            "screened_date": _iso(self.screened_date),
            "created_at": _iso(self.created_at),
        }


class Medication(db.Model):
    __tablename__ = "medications"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    drug_name = db.Column(db.Text, nullable=False)
    dose = db.Column(db.Text, nullable=False)
    frequency = db.Column(db.Text, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    prescribed_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (db.Index("medications_patient_idx", "patient_id"),)

    def to_dict(self):
        return {
            "id": self.id,
            "drug": self.drug_name,
            "dose": self.dose,
            "freq": self.frequency,
            "start": _iso(self.start_date),
            "end": _iso(self.end_date),
            "active": self.active,
        }


class PatientFile(db.Model):
    __tablename__ = "patient_files"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    file_name = db.Column(db.Text, nullable=False)
    file_type = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.Text)
    # 'staff' or 'patient' — which side added it; the user id says exactly who.
    uploaded_by = db.Column(db.Text, nullable=False)
    uploaded_by_user = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    uploaded_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    content = db.Column(db.LargeBinary)

    __table_args__ = (
        db.CheckConstraint(
            "file_type IN ('prescription', 'xray', 'lab_report', 'referral', 'discharge_summary')",
            name="patient_files_type_check",
        ),
        db.CheckConstraint("uploaded_by IN ('staff', 'patient')", name="patient_files_uploaded_by_check"),
        db.Index("patient_files_patient_idx", "patient_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.file_name,
            "type": self.file_type,
            "by": self.uploaded_by,
            "at": _iso(self.uploaded_at),
        }


class Ward(db.Model):
    __tablename__ = "wards"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    facility_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False
    )
    name = db.Column(db.Text, nullable=False)
    ward_type = db.Column(db.Text, nullable=False)
    # Short prefix for bed labels, e.g. GMM -> GMM-01.
    bed_prefix = db.Column(db.Text, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    beds = db.relationship("Bed", back_populates="ward", order_by="Bed.bed_label")

    __table_args__ = (
        db.UniqueConstraint("facility_id", "name", name="wards_facility_name_key"),
        db.UniqueConstraint("facility_id", "bed_prefix", name="wards_facility_prefix_key"),
        db.CheckConstraint("capacity > 0", name="wards_capacity_check"),
        db.CheckConstraint(
            "ward_type IN ('general', 'isolation', 'paediatric', 'maternity', 'surgical', 'icu')",
            name="wards_type_check",
        ),
    )


class Bed(db.Model):
    __tablename__ = "beds"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    ward_id = db.Column(UUID(as_uuid=False), db.ForeignKey("wards.id", ondelete="CASCADE"), nullable=False)
    bed_label = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="available")

    ward = db.relationship("Ward", back_populates="beds")

    __table_args__ = (
        db.UniqueConstraint("ward_id", "bed_label", name="beds_ward_label_key"),
        db.CheckConstraint(
            "status IN ('available', 'occupied', 'cleaning', 'reserved')", name="beds_status_check"
        ),
    )


class Admission(db.Model):
    __tablename__ = "admissions"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    facility_id = db.Column(UUID(as_uuid=False), db.ForeignKey("facilities.id"), nullable=False)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    ward_id = db.Column(UUID(as_uuid=False), db.ForeignKey("wards.id", ondelete="CASCADE"), nullable=False)
    bed_id = db.Column(UUID(as_uuid=False), db.ForeignKey("beds.id", ondelete="SET NULL"))
    admitting_doctor_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    reason = db.Column(db.Text, nullable=False)
    admitted_at = db.Column(db.DateTime(timezone=True), nullable=False)
    discharged_at = db.Column(db.DateTime(timezone=True))

    __table_args__ = (
        db.CheckConstraint(
            "discharged_at IS NULL OR discharged_at > admitted_at", name="admissions_dates_check"
        ),
        db.Index("admissions_facility_idx", "facility_id", "admitted_at"),
        db.Index("admissions_patient_idx", "patient_id"),
        db.Index(
            "admissions_open_idx", "facility_id", postgresql_where=text("discharged_at IS NULL")
        ),
    )


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    facility_id = db.Column(UUID(as_uuid=False), db.ForeignKey("facilities.id"), nullable=False)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=False)
    duration_min = db.Column(db.Integer, nullable=False, default=30)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="scheduled")
    booked_via = db.Column(db.Text, nullable=False, default="reception")
    booked_by = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('scheduled', 'completed', 'cancelled', 'no_show')", name="appointments_status_check"
        ),
        db.CheckConstraint(
            "booked_via IN ('patient_portal', 'reception')", name="appointments_booked_via_check"
        ),
        db.Index("appointments_facility_sched_idx", "facility_id", "scheduled_at"),
        db.Index("appointments_doctor_sched_idx", "doctor_id", "scheduled_at"),
        db.Index("appointments_patient_idx", "patient_id"),
    )


class Visit(db.Model):
    """A walk-in on the outpatient queue."""

    __tablename__ = "visits"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    facility_id = db.Column(UUID(as_uuid=False), db.ForeignKey("facilities.id"), nullable=False)
    patient_id = db.Column(UUID(as_uuid=False), db.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"))
    priority = db.Column(db.Text, nullable=False, default="low")
    status = db.Column(db.Text, nullable=False, default="waiting")
    arrived_at = db.Column(db.DateTime(timezone=True), nullable=False)
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))

    __table_args__ = (
        db.CheckConstraint("priority IN ('urgent', 'moderate', 'low')", name="visits_priority_check"),
        db.CheckConstraint(
            "status IN ('waiting', 'in_consultation', 'completed')", name="visits_status_check"
        ),
        db.Index("visits_facility_arrived_idx", "facility_id", "arrived_at"),
    )


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
