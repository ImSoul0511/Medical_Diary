"""update_gender_constraint

Revision ID: 3dc3eaa482ad
Revises: fc3e72c98108
Create Date: 2026-05-27 16:06:16.463877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3dc3eaa482ad'
down_revision: Union[str, None] = 'fc3e72c98108'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop check constraint cũ nếu tồn tại
    op.execute("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ck_profiles_gender")
    
    # 2. Cập nhật dữ liệu cũ sang định dạng tiếng Anh
    op.execute("UPDATE profiles SET gender = 'male' WHERE gender = 'NAM'")
    op.execute("UPDATE profiles SET gender = 'female' WHERE gender = 'Nữ'")
    op.execute("UPDATE profiles SET gender = 'male' WHERE gender NOT IN ('male', 'female')")
    
    # 3. Đổi server_default sang 'male'
    op.alter_column('profiles', 'gender', server_default=sa.text("'male'"))
    
    # 4. Thêm check constraint mới
    op.create_check_constraint('ck_profiles_gender', 'profiles', "gender IN ('male', 'female')")


def downgrade() -> None:
    # 1. Drop check constraint mới nếu tồn tại
    op.execute("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ck_profiles_gender")
    
    # 2. Cập nhật dữ liệu cũ về tiếng Việt
    op.execute("UPDATE profiles SET gender = 'NAM' WHERE gender = 'male'")
    op.execute("UPDATE profiles SET gender = 'Nữ' WHERE gender = 'female'")
    
    # 3. Đổi server_default về 'NAM'
    op.alter_column('profiles', 'gender', server_default=sa.text("'NAM'"))
    
    # 4. Thêm check constraint cũ
    op.create_check_constraint('ck_profiles_gender', 'profiles', "gender IN ('NAM', 'Nữ')")
