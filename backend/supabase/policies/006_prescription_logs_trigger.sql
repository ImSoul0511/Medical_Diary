-- Trigger function tự động tạo prescription_logs khi insert prescription_items
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

    -- 1. Lấy patient_id từ bảng prescriptions
    SELECT patient_id INTO patient_id_val 
    FROM prescriptions 
    WHERE id = NEW.prescription_id;

    IF patient_id_val IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy đơn thuốc liên kết.';
    END IF;

    start_date_val := COALESCE(NEW.start_date, CURRENT_DATE);

    -- 2. Sinh logs cho từng ngày từ start_date_val
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

-- Trigger cho prescription_items
DROP TRIGGER IF EXISTS trg_generate_prescription_logs ON prescription_items;
CREATE TRIGGER trg_generate_prescription_logs
AFTER INSERT ON prescription_items
FOR EACH ROW EXECUTE FUNCTION generate_prescription_logs();
