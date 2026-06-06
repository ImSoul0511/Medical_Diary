"""add_custom_privacy_fields_to_emergency_tokens

Revision ID: 6e27fa13159f
Revises: 971dcd67e1ac
Create Date: 2026-06-06 04:25:43.236058

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e27fa13159f'
down_revision: Union[str, None] = '971dcd67e1ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('emergency_tokens', sa.Column('show_blood_type', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('emergency_tokens', sa.Column('show_allergies', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('emergency_tokens', sa.Column('show_emergency_contact', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade() -> None:
    op.drop_column('emergency_tokens', 'show_emergency_contact')
    op.drop_column('emergency_tokens', 'show_allergies')
    op.drop_column('emergency_tokens', 'show_blood_type')
