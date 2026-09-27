"""Portal companion: escalations to doctors, and medication pickups

Adds `escalations`, where the patient companion leaves anything a doctor should see
(danger signs, distress, stopping treatment), and `medication_pickups`, the TB drug
supply handed over at the clinic, from which the next pickup date is worked out.

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-09-27 20:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "e1f2a3b4c5d6"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=False)


def upgrade():
    op.create_table(
        "medication_pickups",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("patient_id", UUID, sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("episode_id", UUID, sa.ForeignKey("tb_episodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("picked_up_on", sa.Date(), nullable=False),
        sa.Column("days_supplied", sa.Integer(), nullable=False),
        sa.Column("recorded_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("days_supplied BETWEEN 1 AND 90", name="medication_pickups_days_check"),
    )
    op.create_index("medication_pickups_patient_idx", "medication_pickups", ["patient_id", "picked_up_on"])

    op.create_table(
        "escalations",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("patient_id", UUID, sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("facility_id", UUID, sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("doctor_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("patient_message", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("acknowledged_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("note", sa.Text()),
        sa.CheckConstraint("severity IN ('urgent', 'concern')", name="escalations_severity_check"),
        sa.CheckConstraint("status IN ('open', 'acknowledged')", name="escalations_status_check"),
        sa.CheckConstraint("source IN ('rule', 'ai')", name="escalations_source_check"),
    )
    op.create_index("escalations_facility_status_idx", "escalations", ["facility_id", "status", "created_at"])
    op.create_index("escalations_patient_idx", "escalations", ["patient_id"])


def downgrade():
    op.drop_index("escalations_patient_idx", table_name="escalations")
    op.drop_index("escalations_facility_status_idx", table_name="escalations")
    op.drop_table("escalations")
    op.drop_index("medication_pickups_patient_idx", table_name="medication_pickups")
    op.drop_table("medication_pickups")
