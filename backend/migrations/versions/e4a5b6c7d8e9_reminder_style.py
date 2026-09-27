"""Patient reminder style (witty, comedic, Bible verse, Qur'an verse)

Revision ID: e4a5b6c7d8e9
Revises: d7e8f9a0b1c2
Create Date: 2026-09-27 16:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "e4a5b6c7d8e9"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None

STYLES = ("witty", "comedic", "verse_christian", "verse_muslim")


def upgrade():
    op.add_column("patients", sa.Column("reminder_style", sa.Text(), nullable=True))
    op.create_check_constraint(
        "patients_reminder_style_check",
        "patients",
        "reminder_style IS NULL OR reminder_style IN (" + ", ".join(f"'{s}'" for s in STYLES) + ")",
    )


def downgrade():
    op.drop_constraint("patients_reminder_style_check", "patients", type_="check")
    op.drop_column("patients", "reminder_style")
