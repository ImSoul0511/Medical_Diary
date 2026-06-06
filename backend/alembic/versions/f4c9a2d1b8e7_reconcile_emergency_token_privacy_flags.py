"""reconcile_emergency_token_privacy_flags

Revision ID: f4c9a2d1b8e7
Revises: 6e27fa13159f
Create Date: 2026-06-06 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f4c9a2d1b8e7"
down_revision: Union[str, None] = "6e27fa13159f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE emergency_tokens AS et
        SET
            show_blood_type =
                et.show_blood_type
                AND COALESCE((p.privacy_settings ->> 'show_blood_type')::boolean, false),
            show_allergies =
                et.show_allergies
                AND COALESCE((p.privacy_settings ->> 'show_allergies')::boolean, false),
            show_emergency_contact =
                et.show_emergency_contact
                AND COALESCE((p.privacy_settings ->> 'show_emergency_contact')::boolean, false)
        FROM profiles AS p
        WHERE p.id = et.user_id
    """)


def downgrade() -> None:
    # Data repair cannot be reversed without knowing prior per-token visibility.
    pass
