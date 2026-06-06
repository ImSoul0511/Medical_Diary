"""add_manual_health_records_table

Revision ID: b26d8d7ce31e
Revises: 0351ddbdf002
Create Date: 2026-06-05 15:12:59.258722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b26d8d7ce31e"
down_revision: Union[str, None] = "0351ddbdf002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "manual_health_records",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("metric_type", sa.String(length=30), nullable=False),
        sa.Column(
            "metrics",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            comment="Metric payload, shaped by metric_type",
        ),
        sa.Column("device_name", sa.String(length=100), nullable=True, comment="Optional measuring device name"),
        sa.Column("notes", sa.Text(), nullable=True, comment="Optional patient notes"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, comment="Actual measurement time"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, comment="Soft Delete"),
        sa.CheckConstraint(
            "metric_type IN ('blood_pressure', 'blood_glucose', 'spo2', 'body_temperature', 'weight')",
            name="ck_mhr_metric_type",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_manual_health_records_user_recorded",
        "manual_health_records",
        ["user_id", "recorded_at"],
        unique=False,
    )
    op.create_index(
        "ix_manual_health_records_user_type",
        "manual_health_records",
        ["user_id", "metric_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_manual_health_records_user_type", table_name="manual_health_records")
    op.drop_index("ix_manual_health_records_user_recorded", table_name="manual_health_records")
    op.drop_table("manual_health_records")
