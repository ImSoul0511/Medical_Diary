"""add_height_metric_type

Revision ID: 840baf4a1b8e
Revises: f4c9a2d1b8e7
Create Date: 2026-06-13 03:14:58.488629

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '840baf4a1b8e'
down_revision: Union[str, None] = 'f4c9a2d1b8e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'ck_mhr_metric_type' 
                AND conrelid = 'manual_health_records'::regclass
            ) THEN
                ALTER TABLE manual_health_records DROP CONSTRAINT ck_mhr_metric_type;
            END IF;
            
            ALTER TABLE manual_health_records 
            ADD CONSTRAINT ck_mhr_metric_type 
            CHECK (metric_type IN ('blood_pressure', 'blood_glucose', 'spo2', 'body_temperature', 'weight', 'height'));
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'ck_mhr_metric_type' 
                AND conrelid = 'manual_health_records'::regclass
            ) THEN
                ALTER TABLE manual_health_records DROP CONSTRAINT ck_mhr_metric_type;
            END IF;
            
            ALTER TABLE manual_health_records 
            ADD CONSTRAINT ck_mhr_metric_type 
            CHECK (metric_type IN ('blood_pressure', 'blood_glucose', 'spo2', 'body_temperature', 'weight'));
        END $$;
    """)
