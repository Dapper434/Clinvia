"""Full TB classification, patient contact email and weight

Records a TB case the way the WHO and Kenya's NTLD-P registers do — the organ when the
disease is outside the lungs, whether it was bacteriologically confirmed, what treatment
the patient has had before, and what drug-susceptibility testing showed — because the
regimen is derived from those rather than typed in. Adds the patient's contact email
(separate from the portal sign-in) and their weight, which first-line doses are worked
out from.

Existing episodes are carried over: the old mdr_flag becomes a resistance level, and
everything else takes the default of a new, bacteriologically confirmed case.

Revision ID: d7e8f9a0b1c2
Revises: c1a2b3d4e5f6
Create Date: 2026-09-27 16:10:00

"""
from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "c1a2b3d4e5f6"
branch_labels = None
depends_on = None

EPTB_SITES = ("pleural", "lymph_node", "spine_bone", "meningeal", "abdominal", "pericardial", "miliary")
DIAGNOSIS_BASES = ("bacteriological", "clinical")
TREATMENT_HISTORIES = ("new", "relapse", "after_failure", "after_ltfu", "other")
RESISTANCE_LEVELS = ("susceptible", "rr", "mdr", "pre_xdr", "xdr")


def _values(values):
    return ", ".join(f"'{v}'" for v in values)


def upgrade():
    with op.batch_alter_table("patients") as b:
        b.add_column(sa.Column("email", sa.Text()))
        b.add_column(sa.Column("weight_kg", sa.Numeric(5, 1)))
        b.add_column(sa.Column("weight_taken_on", sa.Date()))
        b.create_check_constraint(
            "patients_weight_check", "weight_kg IS NULL OR weight_kg BETWEEN 0.5 AND 400"
        )

    op.add_column(
        "medications",
        sa.Column("from_regimen", sa.Boolean(), nullable=False, server_default="false"),
    )

    with op.batch_alter_table("tb_episodes") as b:
        b.add_column(sa.Column("eptb_site", sa.Text()))
        b.add_column(
            sa.Column("diagnosis_basis", sa.Text(), nullable=False, server_default="bacteriological")
        )
        b.add_column(sa.Column("treatment_history", sa.Text(), nullable=False, server_default="new"))
        b.add_column(sa.Column("resistance", sa.Text(), nullable=False, server_default="susceptible"))

    # Rifampicin resistance was all the old flag could say, so that is what it becomes.
    op.execute("UPDATE tb_episodes SET resistance = 'mdr' WHERE mdr_flag")

    with op.batch_alter_table("tb_episodes") as b:
        b.create_check_constraint(
            "tb_episodes_eptb_site_check",
            f"eptb_site IS NULL OR (tb_type = 'extra_pulmonary' AND eptb_site IN ({_values(EPTB_SITES)}))",
        )
        b.create_check_constraint(
            "tb_episodes_basis_check", f"diagnosis_basis IN ({_values(DIAGNOSIS_BASES)})"
        )
        b.create_check_constraint(
            "tb_episodes_history_check", f"treatment_history IN ({_values(TREATMENT_HISTORIES)})"
        )
        b.create_check_constraint(
            "tb_episodes_resistance_check", f"resistance IN ({_values(RESISTANCE_LEVELS)})"
        )


def downgrade():
    with op.batch_alter_table("tb_episodes") as b:
        b.drop_constraint("tb_episodes_resistance_check", type_="check")
        b.drop_constraint("tb_episodes_history_check", type_="check")
        b.drop_constraint("tb_episodes_basis_check", type_="check")
        b.drop_constraint("tb_episodes_eptb_site_check", type_="check")
        b.drop_column("resistance")
        b.drop_column("treatment_history")
        b.drop_column("diagnosis_basis")
        b.drop_column("eptb_site")

    op.drop_column("medications", "from_regimen")

    with op.batch_alter_table("patients") as b:
        b.drop_constraint("patients_weight_check", type_="check")
        b.drop_column("weight_taken_on")
        b.drop_column("weight_kg")
        b.drop_column("email")
