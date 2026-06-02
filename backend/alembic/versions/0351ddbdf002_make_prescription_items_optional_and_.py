"""make_prescription_items_optional_and_add_start_date

Revision ID: 0351ddbdf002
Revises: 95fddc3b7d94
Create Date: 2026-05-28 16:18:45.451092

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0351ddbdf002'
down_revision: Union[str, None] = '95fddc3b7d94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Thay đổi cột trong bảng prescription_items thành nullable
    op.alter_column('prescription_items', 'duration_days', existing_type=sa.Integer(), nullable=True)
    op.alter_column('prescription_items', 'scheduled_times', existing_type=sa.ARRAY(sa.Time()), nullable=True)
    
    # 2. Thêm cột start_date
    op.add_column('prescription_items', sa.Column('start_date', sa.Date(), nullable=True, comment="Ngày bắt đầu uống thuốc (dành cho chế độ tự động)"))
    
    # 3. Cập nhật trigger function hỗ trợ cả chế độ tự động và thủ công
    op.execute("""
    CREATE OR REPLACE FUNCTION generate_prescription_logs()
    RETURNS TRIGGER AS $$
    DECLARE
        patient_id_val UUID;
        day_offset INT;
        s_time TIME;
        target_date DATE;
        start_date_val DATE;
    BEGIN
        -- Chỉ sinh tự động nếu duration_days và scheduled_times không NULL
        IF NEW.duration_days IS NULL OR NEW.scheduled_times IS NULL THEN
            RETURN NEW;
        END IF;

        -- Lấy patient_id từ bảng prescriptions
        SELECT patient_id INTO patient_id_val 
        FROM prescriptions 
        WHERE id = NEW.prescription_id;
    
        IF patient_id_val IS NULL THEN
            RAISE EXCEPTION 'Không tìm thấy đơn thuốc liên kết.';
        END IF;
    
        start_date_val := COALESCE(NEW.start_date, CURRENT_DATE);

        -- Sinh logs cho từng ngày từ start_date_val
        FOR day_offset IN 0..(NEW.duration_days - 1) LOOP
            target_date := start_date_val + day_offset;
            
            FOREACH s_time IN ARRAY NEW.scheduled_times LOOP
                INSERT INTO prescription_logs (
                    prescription_item_id,
                    user_id,
                    scheduled_date,
                    scheduled_time,
                    status
                ) VALUES (
                    NEW.id,
                    patient_id_val,
                    target_date,
                    s_time,
                    'untaken'
                );
            END LOOP;
        END LOOP;
    
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)


def downgrade() -> None:
    # 1. Khôi phục trigger function cũ
    op.execute("""
    CREATE OR REPLACE FUNCTION generate_prescription_logs()
    RETURNS TRIGGER AS $$
    DECLARE
        patient_id_val UUID;
        day_offset INT;
        s_time TIME;
        target_date DATE;
    BEGIN
        -- 1. Lấy patient_id từ bảng prescriptions
        SELECT patient_id INTO patient_id_val 
        FROM prescriptions 
        WHERE id = NEW.prescription_id;
    
        IF patient_id_val IS NULL THEN
            RAISE EXCEPTION 'Không tìm thấy đơn thuốc liên kết.';
        END IF;
    
        -- 2. Sinh logs cho từng ngày từ ngày hiện tại
        FOR day_offset IN 0..(NEW.duration_days - 1) LOOP
            target_date := CURRENT_DATE + day_offset;
            
            FOREACH s_time IN ARRAY NEW.scheduled_times LOOP
                INSERT INTO prescription_logs (
                    prescription_item_id,
                    user_id,
                    scheduled_date,
                    scheduled_time,
                    status
                ) VALUES (
                    NEW.id,
                    patient_id_val,
                    target_date,
                    s_time,
                    'untaken'
                );
            END LOOP;
        END LOOP;
    
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)

    # 2. Xóa cột start_date
    op.drop_column('prescription_items', 'start_date')

    # 3. Trả lại cột thành NOT NULL (Lưu ý: Có thể lỗi nếu DB đang có dữ liệu NULL)
    op.alter_column('prescription_items', 'scheduled_times', existing_type=sa.ARRAY(sa.Time()), nullable=False)
    op.alter_column('prescription_items', 'duration_days', existing_type=sa.Integer(), nullable=False)
