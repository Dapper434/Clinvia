"""Merge the TB representative and reminder-style migration heads

The TB representative branch (d4e5f6a7b8c9) and master's reminder-style branch
(e4a5b6c7d8e9) both grew from c1a2b3d4e5f6. This revision joins them. It changes no tables.

Revision ID: f5a6b7c8d9e0
Revises: d4e5f6a7b8c9, e4a5b6c7d8e9
Create Date: 2026-10-01 12:00:00

"""


revision = "f5a6b7c8d9e0"
down_revision = ("d4e5f6a7b8c9", "e4a5b6c7d8e9")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
