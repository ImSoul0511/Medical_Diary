"""add phone_encrypted back to profiles

Revision ID: 07954f8fa416
Revises: 432955958e19
Create Date: 2026-05-11 08:34:57.311659

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "07954f8fa416"
down_revision: Union[str, None] = "432955958e19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The initial schema already creates this column, and the previous
    # "remove" migration does not drop it. Keep this revision tolerant so a
    # fresh migration chain does not fail on a duplicate column.
    op.execute("""
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS phone_encrypted TEXT
    """)
    op.execute("""
        COMMENT ON COLUMN profiles.phone_encrypted IS
        'Ma hoa pgcrypto - SDT'
    """)


def downgrade() -> None:
    # No-op by design: this revision no longer owns the column because it is
    # present in the initial schema on the current migration chain.
    pass
