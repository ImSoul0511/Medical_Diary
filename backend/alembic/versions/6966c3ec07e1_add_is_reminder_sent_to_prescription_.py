"""add_is_reminder_sent_to_prescription_logs

Revision ID: 6966c3ec07e1
Revises: 8dbbdc83d1eb
Create Date: 2026-06-17 21:24:00.559393

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6966c3ec07e1'
down_revision: Union[str, None] = '8dbbdc83d1eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'prescription_logs',
        sa.Column('is_reminder_sent', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )


def downgrade() -> None:
    op.drop_column('prescription_logs', 'is_reminder_sent')
