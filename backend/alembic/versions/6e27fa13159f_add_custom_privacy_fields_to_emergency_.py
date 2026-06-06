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
    op.add_column('emergency_tokens', sa.Column('show_blood_type', sa.Boolean(), nullable=True))
    op.add_column('emergency_tokens', sa.Column('show_allergies', sa.Boolean(), nullable=True))
    op.add_column('emergency_tokens', sa.Column('show_emergency_contact', sa.Boolean(), nullable=True))

    op.execute("""
        UPDATE emergency_tokens AS et
        SET
            show_blood_type = COALESCE((p.privacy_settings ->> 'show_blood_type')::boolean, false),
            show_allergies = COALESCE((p.privacy_settings ->> 'show_allergies')::boolean, false),
            show_emergency_contact = COALESCE((p.privacy_settings ->> 'show_emergency_contact')::boolean, false)
        FROM profiles AS p
        WHERE p.id = et.user_id
    """)
    op.execute("""
        UPDATE emergency_tokens
        SET
            show_blood_type = COALESCE(show_blood_type, false),
            show_allergies = COALESCE(show_allergies, false),
            show_emergency_contact = COALESCE(show_emergency_contact, false)
    """)

    op.alter_column('emergency_tokens', 'show_blood_type', nullable=False, server_default=sa.text('true'))
    op.alter_column('emergency_tokens', 'show_allergies', nullable=False, server_default=sa.text('true'))
    op.alter_column('emergency_tokens', 'show_emergency_contact', nullable=False, server_default=sa.text('true'))


def downgrade() -> None:
    op.drop_column('emergency_tokens', 'show_emergency_contact')
    op.drop_column('emergency_tokens', 'show_allergies')
    op.drop_column('emergency_tokens', 'show_blood_type')
