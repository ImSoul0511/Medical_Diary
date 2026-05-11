"""init_supabase_functions

Revision ID: 432955958e19
Revises: 26c90af1fec5
Create Date: 2026-05-11 08:08:53.219012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '432955958e19'
down_revision: Union[str, None] = '26c90af1fec5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import os

def upgrade() -> None:
    # Chỉ chạy file kích hoạt extension (đòi hỏi quyền ít hơn và an toàn hơn qua migration)
    sql_files = [
        "001_pgcrypto_setup.sql"
    ]
    
    # Đường dẫn tới thư mục chứa các file SQL (trong Docker là /code/supabase/policies)
    base_path = os.path.join(os.getcwd(), "supabase", "policies")
    
    for file_name in sql_files:
        file_path = os.path.join(base_path, file_name)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                sql = f.read()
                # Thực thi SQL qua alembic op
                op.execute(sa.text(sql))

def downgrade() -> None:
    # Downgrade có thể xóa các hàm này nếu cần, nhưng thường ta sẽ giữ lại
    # hoặc dùng DROP FUNCTION IF EXISTS...
    pass
