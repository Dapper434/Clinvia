"""Hospital management + per-hospital tenancy

Adds readable P/S codes, hospital (tenant) fields on facilities and users, the new
role set, TB episodes (moved off the patients table), dose-log source, wider lab
results, and the wards/beds/admissions/appointments/visits/medications/files tables.

Existing rows are carried over: codes are backfilled oldest first, each patient's
inline TB fields become one episode, and dose logs a patient entered themselves are
marked as portal check-ins.

Revision ID: c1a2b3d4e5f6
Revises: 891c4f1ee866
Create Date: 2026-09-24 20:15:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "c1a2b3d4e5f6"
down_revision = "891c4f1ee866"
branch_labels = None
depends_on = None

NEW_ROLES = "('network_admin', 'admin', 'executive', 'doctor', 'clinician', 'nurse', 'receptionist', 'patient')"


def _uuid(name, *args, **kw):
    return sa.Column(name, UUID(as_uuid=False), *args, **kw)


def upgrade():
    # ---- readable codes ---------------------------------------------------------------
    # lpad(n, 4) alone would truncate 10000 to "1000" and collide; greatest() lets it grow.
    op.execute("CREATE SEQUENCE IF NOT EXISTS patient_code_seq")
    op.execute("CREATE SEQUENCE IF NOT EXISTS staff_code_seq")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION next_patient_code() RETURNS text AS $$
          SELECT 'P' || lpad(n::text, greatest(4, length(n::text)), '0')
          FROM (SELECT nextval('patient_code_seq') AS n) s;
        $$ LANGUAGE sql;
        CREATE OR REPLACE FUNCTION next_staff_code() RETURNS text AS $$
          SELECT 'S' || lpad(n::text, greatest(4, length(n::text)), '0')
          FROM (SELECT nextval('staff_code_seq') AS n) s;
        $$ LANGUAGE sql;
        """
    )

    # ---- hospitals --------------------------------------------------------------------
    with op.batch_alter_table("facilities") as b:
        b.add_column(sa.Column("slug", sa.Text()))
        b.add_column(sa.Column("level", sa.Text()))
        b.add_column(sa.Column("email_domain", sa.Text()))
        b.add_column(sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
        b.add_column(sa.Column("is_seeded", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        b.create_unique_constraint("facilities_name_key", ["name"])
        b.create_unique_constraint("facilities_slug_key", ["slug"])
        b.create_unique_constraint("facilities_email_domain_key", ["email_domain"])

    # ---- users: roles, hospital, staff fields ------------------------------------------
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check")
    # 'hospital' was the generic clinical role; 'viewer' was read-only. Admins that exist
    # before tenancy have no hospital, so they become network admins.
    for table in ("users", "profiles"):
        op.execute(
            f"""
            UPDATE {table} SET role = CASE role
              WHEN 'hospital' THEN 'clinician'
              WHEN 'viewer' THEN 'executive'
              WHEN 'admin' THEN 'network_admin'
              ELSE role END
            """
        )
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {table}_role_check CHECK (role IN {NEW_ROLES})")

    with op.batch_alter_table("users") as b:
        b.add_column(_uuid("facility_id"))
        b.add_column(sa.Column("staff_code", sa.Text()))
        b.add_column(sa.Column("phone", sa.Text()))
        b.add_column(sa.Column("specialty", sa.Text()))
        b.add_column(sa.Column("duty_status", sa.Text(), nullable=False, server_default="on_duty"))
        b.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
        b.add_column(
            sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false"))
        )
        b.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True)))
        b.create_foreign_key("users_facility_id_fkey", "facilities", ["facility_id"], ["id"])
        b.create_unique_constraint("users_staff_code_key", ["staff_code"])
        b.create_check_constraint("users_duty_status_check", "duty_status IN ('on_duty', 'off_duty', 'on_leave')")
        b.create_index("users_facility_idx", ["facility_id"])

    op.execute(
        """
        WITH ordered AS (
          SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
          FROM users WHERE role <> 'patient'
        )
        UPDATE users u SET staff_code = 'S' || lpad(o.n::text, greatest(4, length(o.n::text)), '0')
        FROM ordered o WHERE u.id = o.id;
        SELECT setval('staff_code_seq', GREATEST((SELECT count(*) FROM users WHERE role <> 'patient'), 1),
                      (SELECT count(*) FROM users WHERE role <> 'patient') > 0);
        """
    )

    # ---- patients: codes, hospital, portal link code ----------------------------------
    with op.batch_alter_table("patients") as b:
        b.add_column(sa.Column("patient_code", sa.Text()))
        b.add_column(_uuid("facility_id"))
        b.add_column(sa.Column("portal_link_code", sa.Text()))
    op.execute(
        """
        WITH ordered AS (
          SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM patients
        )
        UPDATE patients p SET patient_code = 'P' || lpad(o.n::text, greatest(4, length(o.n::text)), '0')
        FROM ordered o WHERE p.id = o.id;
        SELECT setval('patient_code_seq', GREATEST((SELECT count(*) FROM patients), 1),
                      (SELECT count(*) FROM patients) > 0);
        UPDATE patients p SET facility_id = f.id FROM facilities f WHERE f.name = p.facility;
        UPDATE patients SET portal_link_code =
          upper(substr(md5(id::text || random()::text), 1, 4) || '-' || substr(md5(random()::text || id::text), 1, 4))
        WHERE user_id IS NULL;
        """
    )
    with op.batch_alter_table("patients") as b:
        b.alter_column("patient_code", nullable=False, server_default=sa.text("next_patient_code()"))
        b.create_unique_constraint("patients_patient_code_key", ["patient_code"])
        b.create_unique_constraint("patients_portal_link_code_key", ["portal_link_code"])
        b.create_foreign_key("patients_facility_id_fkey", "facilities", ["facility_id"], ["id"])
        b.create_index("patients_facility_idx", ["facility_id"])
        b.create_check_constraint("patients_age_check", "age IS NULL OR age BETWEEN 0 AND 120")
    op.execute("ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_registered_by_fkey")
    op.execute(
        "ALTER TABLE patients ADD CONSTRAINT patients_registered_by_fkey "
        "FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL"
    )

    # ---- TB episodes (moved off patients) ----------------------------------------------
    op.create_table(
        "tb_episodes",
        _uuid("id", primary_key=True),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tb_type", sa.Text(), nullable=False),
        sa.Column("regimen", sa.Text(), nullable=False),
        sa.Column("treatment_start", sa.Date(), nullable=False),
        sa.Column("phase", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("mdr_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("outcome_date", sa.Date()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("tb_type IN ('pulmonary', 'extra_pulmonary')", name="tb_episodes_type_check"),
        sa.CheckConstraint("phase IN ('intensive', 'continuation', 'closed')", name="tb_episodes_phase_check"),
        sa.CheckConstraint(
            "status IN ('active', 'cured', 'completed', 'lost_to_follow_up', 'died', 'failed')",
            name="tb_episodes_status_check",
        ),
    )
    op.create_index("tb_episodes_patient_idx", "tb_episodes", ["patient_id"])
    op.create_index(
        "tb_episodes_one_active_idx", "tb_episodes", ["patient_id"], unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.execute(
        """
        INSERT INTO tb_episodes (id, patient_id, tb_type, regimen, treatment_start, phase, status, mdr_flag, created_at)
        SELECT gen_random_uuid(), p.id,
               CASE WHEN p.tb_type = 'extra-pulmonary' THEN 'extra_pulmonary' ELSE 'pulmonary' END,
               COALESCE(NULLIF(p.regimen, ''), '2HRZE/4HR'),
               p.treatment_start,
               CASE WHEN p.status <> 'active' THEN 'closed'
                    WHEN p.mdr_flag OR p.treatment_start > CURRENT_DATE - 56 THEN 'intensive'
                    ELSE 'continuation' END,
               CASE p.status WHEN 'lost' THEN 'lost_to_follow_up' ELSE p.status END,
               p.mdr_flag, p.created_at
        FROM patients p WHERE p.treatment_start IS NOT NULL;
        """
    )
    with op.batch_alter_table("patients") as b:
        b.drop_index("patients_status_idx")
        for col in ("tb_type", "regimen", "treatment_start", "status", "mdr_flag", "facility"):
            b.drop_column(col)

    # ---- dose logs ----------------------------------------------------------------------
    with op.batch_alter_table("dose_logs") as b:
        b.add_column(_uuid("episode_id"))
        b.add_column(sa.Column("source", sa.Text(), nullable=False, server_default="clinic_dot"))
        b.create_foreign_key("dose_logs_episode_id_fkey", "tb_episodes", ["episode_id"], ["id"], ondelete="CASCADE")
        b.create_check_constraint("dose_logs_source_check", "source IN ('patient_portal', 'clinic_dot')")
        b.create_index("dose_logs_date_idx", ["date"])
    op.execute(
        """
        UPDATE dose_logs d SET source = 'patient_portal'
        FROM patients p WHERE p.id = d.patient_id AND d.logged_by IS NOT NULL AND d.logged_by = p.user_id;
        UPDATE dose_logs d SET episode_id = e.id FROM tb_episodes e WHERE e.patient_id = d.patient_id;
        ALTER TABLE dose_logs DROP CONSTRAINT IF EXISTS dose_logs_logged_by_fkey;
        ALTER TABLE dose_logs ADD CONSTRAINT dose_logs_logged_by_fkey
          FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL;
        """
    )

    # ---- lab results --------------------------------------------------------------------
    op.execute("ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_test_type_check")
    op.execute("ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_result_check")
    with op.batch_alter_table("lab_results") as b:
        b.alter_column("result_date", new_column_name="collected_at")
        b.add_column(sa.Column("reported_at", sa.Date()))
        b.add_column(_uuid("recorded_by"))
        b.create_foreign_key("lab_results_recorded_by_fkey", "users", ["recorded_by"], ["id"], ondelete="SET NULL")
        b.create_check_constraint(
            "lab_results_test_type_check",
            "test_type IN ('genexpert', 'sputum_smear', 'xray', 'culture', 'fbc', 'malaria_rdt', "
            "'urinalysis', 'rbs', 'lft')",
        )
        b.create_check_constraint(
            "lab_results_result_check", "result IN ('positive', 'negative', 'normal', 'abnormal', 'pending')"
        )
        b.drop_index("lab_results_patient_idx")
        b.create_index("lab_results_patient_idx", ["patient_id", "collected_at"])
    op.execute("UPDATE lab_results SET reported_at = collected_at WHERE result <> 'pending'")

    # ---- clinical records ---------------------------------------------------------------
    op.create_table(
        "medications",
        _uuid("id", primary_key=True),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drug_name", sa.Text(), nullable=False),
        sa.Column("dose", sa.Text(), nullable=False),
        sa.Column("frequency", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date()),
        _uuid("prescribed_by", sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("medications_patient_idx", "medications", ["patient_id"])

    op.create_table(
        "patient_files",
        _uuid("id", primary_key=True),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text()),
        sa.Column("uploaded_by", sa.Text(), nullable=False),
        _uuid("uploaded_by_user", sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("content", sa.LargeBinary()),
        sa.CheckConstraint(
            "file_type IN ('prescription', 'xray', 'lab_report', 'referral', 'discharge_summary')",
            name="patient_files_type_check",
        ),
        sa.CheckConstraint("uploaded_by IN ('staff', 'patient')", name="patient_files_uploaded_by_check"),
    )
    op.create_index("patient_files_patient_idx", "patient_files", ["patient_id"])

    # ---- hospital management ------------------------------------------------------------
    op.create_table(
        "wards",
        _uuid("id", primary_key=True),
        _uuid("facility_id", sa.ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("ward_type", sa.Text(), nullable=False),
        sa.Column("bed_prefix", sa.Text(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("facility_id", "name", name="wards_facility_name_key"),
        sa.UniqueConstraint("facility_id", "bed_prefix", name="wards_facility_prefix_key"),
        sa.CheckConstraint("capacity > 0", name="wards_capacity_check"),
        sa.CheckConstraint(
            "ward_type IN ('general', 'isolation', 'paediatric', 'maternity', 'surgical', 'icu')",
            name="wards_type_check",
        ),
    )
    op.create_table(
        "beds",
        _uuid("id", primary_key=True),
        _uuid("ward_id", sa.ForeignKey("wards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bed_label", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="available"),
        sa.UniqueConstraint("ward_id", "bed_label", name="beds_ward_label_key"),
        sa.CheckConstraint(
            "status IN ('available', 'occupied', 'cleaning', 'reserved')", name="beds_status_check"
        ),
    )
    op.create_table(
        "admissions",
        _uuid("id", primary_key=True),
        _uuid("facility_id", sa.ForeignKey("facilities.id"), nullable=False),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        _uuid("ward_id", sa.ForeignKey("wards.id", ondelete="CASCADE"), nullable=False),
        _uuid("bed_id", sa.ForeignKey("beds.id", ondelete="SET NULL")),
        _uuid("admitting_doctor_id", sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("admitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("discharged_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("discharged_at IS NULL OR discharged_at > admitted_at", name="admissions_dates_check"),
    )
    op.create_index("admissions_facility_idx", "admissions", ["facility_id", "admitted_at"])
    op.create_index("admissions_patient_idx", "admissions", ["patient_id"])
    op.create_index(
        "admissions_open_idx", "admissions", ["facility_id"], postgresql_where=sa.text("discharged_at IS NULL")
    )
    op.create_table(
        "appointments",
        _uuid("id", primary_key=True),
        _uuid("facility_id", sa.ForeignKey("facilities.id"), nullable=False),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        _uuid("doctor_id", sa.ForeignKey("users.id"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="scheduled"),
        sa.Column("booked_via", sa.Text(), nullable=False, server_default="reception"),
        _uuid("booked_by", sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('scheduled', 'completed', 'cancelled', 'no_show')", name="appointments_status_check"
        ),
        sa.CheckConstraint("booked_via IN ('patient_portal', 'reception')", name="appointments_booked_via_check"),
    )
    op.create_index("appointments_facility_sched_idx", "appointments", ["facility_id", "scheduled_at"])
    op.create_index("appointments_doctor_sched_idx", "appointments", ["doctor_id", "scheduled_at"])
    op.create_index("appointments_patient_idx", "appointments", ["patient_id"])
    op.create_table(
        "visits",
        _uuid("id", primary_key=True),
        _uuid("facility_id", sa.ForeignKey("facilities.id"), nullable=False),
        _uuid("patient_id", sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        _uuid("doctor_id", sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("priority", sa.Text(), nullable=False, server_default="low"),
        sa.Column("status", sa.Text(), nullable=False, server_default="waiting"),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("priority IN ('urgent', 'moderate', 'low')", name="visits_priority_check"),
        sa.CheckConstraint("status IN ('waiting', 'in_consultation', 'completed')", name="visits_status_check"),
    )
    op.create_index("visits_facility_arrived_idx", "visits", ["facility_id", "arrived_at"])


def downgrade():
    raise NotImplementedError(
        "This migration moves TB data off the patients table; restore from a backup instead of downgrading."
    )
