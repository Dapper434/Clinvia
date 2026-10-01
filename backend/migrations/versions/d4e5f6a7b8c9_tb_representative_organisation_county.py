"""TB representative organisation and county

A TB representative (role `network_admin`) now belongs to an organisation, such as the
Ministry of Health or an NGO, and may be limited to one county. Without a county they see
every hospital.

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3d4e5f6
Create Date: 2026-09-27 12:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c1a2b3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("organisation", sa.Text()))
        b.add_column(sa.Column("county", sa.Text()))


def downgrade():
    with op.batch_alter_table("users") as b:
        b.drop_column("county")
        b.drop_column("organisation")
