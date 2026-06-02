"""add_audit_and_prescription_triggers

Revision ID: 95fddc3b7d94
Revises: 3dc3eaa482ad
Create Date: 2026-05-28 15:18:41.656923

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import os


# revision identifiers, used by Alembic.
revision: str = '95fddc3b7d94'
down_revision: Union[str, None] = '3dc3eaa482ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Danh sách các file trigger SQL cần chạy
    sql_files = [
        "005_audit_log_trigger.sql",
        "006_prescription_logs_trigger.sql"
    ]
    
    # Đường dẫn tới thư mục chứa các file SQL (trong Docker là /code/supabase/policies)
    base_path = os.path.join(os.getcwd(), "supabase", "policies")
    
    for file_name in sql_files:
        file_path = os.path.join(base_path, file_name)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                sql_content = f.read()
                
                # Cắt phần định nghĩa function và phần định nghĩa trigger để tránh lỗi prepared statement của asyncpg
                delimiter = "$$ LANGUAGE plpgsql SECURITY DEFINER;"
                if delimiter in sql_content:
                    parts = sql_content.split(delimiter)
                    func_stmt = parts[0] + delimiter
                    op.execute(sa.text(func_stmt))
                    
                    # Các trigger statements tiếp theo tách biệt bằng dấu chấm phẩy
                    if len(parts) > 1:
                        trigger_stmts = parts[1].split(";")
                        for stmt in trigger_stmts:
                            clean_stmt = stmt.strip()
                            if clean_stmt:
                                op.execute(sa.text(clean_stmt))
                else:
                    op.execute(sa.text(sql_content))


def downgrade() -> None:
    # Xóa các trigger và function đã tạo
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_medical_records_audit ON medical_records;"))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_prescriptions_audit ON prescriptions;"))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_diaries_audit ON diaries;"))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_health_metrics_audit ON health_metrics;"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS log_data_access();"))
    
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_generate_prescription_logs ON prescription_items;"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS generate_prescription_logs();"))
