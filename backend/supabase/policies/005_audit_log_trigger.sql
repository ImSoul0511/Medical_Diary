-- Trigger function ghi vào data_access_logs khi bác sĩ thao tác dữ liệu
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
DECLARE
    actor_claims_text TEXT;
    actor_claims JSONB;
    actor_id_val UUID;
    actor_name_val VARCHAR(100);
    actor_role_val VARCHAR(20);
    target_user_id_val UUID;
    old_val JSONB := NULL;
    new_val JSONB := NULL;
    action_val VARCHAR(20);
BEGIN
    -- 1. Lấy thông tin actor từ JWT claims
    BEGIN
        actor_claims_text := current_setting('request.jwt.claims', true);
    EXCEPTION WHEN OTHERS THEN
        actor_claims_text := NULL;
    END;

    IF actor_claims_text IS NULL OR actor_claims_text = '' THEN
        -- Không có JWT claims (ví dụ: hệ thống hoặc superuser thực hiện trực tiếp)
        RETURN COALESCE(NEW, OLD);
    END IF;

    actor_claims := actor_claims_text::jsonb;
    actor_id_val := (actor_claims->>'sub')::uuid;

    -- 2. Kiểm tra role của actor, chỉ log khi actor là doctor
    SELECT full_name, role INTO actor_name_val, actor_role_val
    FROM profiles
    WHERE id = actor_id_val;

    IF actor_role_val != 'doctor' THEN
        -- Chỉ ghi log khi bác sĩ truy cập/thao tác trên dữ liệu bệnh nhân
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 3. Xác định hành động (INSERT, UPDATE, DELETE)
    IF (TG_OP = 'INSERT') THEN
        action_val := 'INSERT';
        new_val := row_to_json(NEW)::jsonb;
        IF TG_TABLE_NAME IN ('medical_records', 'prescriptions') THEN
            target_user_id_val := NEW.patient_id;
        ELSE
            target_user_id_val := NEW.user_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        action_val := 'UPDATE';
        old_val := row_to_json(OLD)::jsonb;
        new_val := row_to_json(NEW)::jsonb;
        IF TG_TABLE_NAME IN ('medical_records', 'prescriptions') THEN
            target_user_id_val := NEW.patient_id;
        ELSE
            target_user_id_val := NEW.user_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        action_val := 'DELETE';
        old_val := row_to_json(OLD)::jsonb;
        IF TG_TABLE_NAME IN ('medical_records', 'prescriptions') THEN
            target_user_id_val := OLD.patient_id;
        ELSE
            target_user_id_val := OLD.user_id;
        END IF;
    END IF;

    -- 4. Ghi log vào data_access_logs
    INSERT INTO data_access_logs (
        actor_id, actor_name, action, table_name, target_user_id, old_data, new_data
    ) VALUES (
        actor_id_val, actor_name_val, action_val, TG_TABLE_NAME, target_user_id_val, old_val, new_val
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger cho medical_records
DROP TRIGGER IF EXISTS trg_medical_records_audit ON medical_records;
CREATE TRIGGER trg_medical_records_audit
AFTER INSERT OR UPDATE OR DELETE ON medical_records
FOR EACH ROW EXECUTE FUNCTION log_data_access();

-- Trigger cho prescriptions
DROP TRIGGER IF EXISTS trg_prescriptions_audit ON prescriptions;
CREATE TRIGGER trg_prescriptions_audit
AFTER INSERT OR UPDATE OR DELETE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION log_data_access();

-- Trigger cho diaries
DROP TRIGGER IF EXISTS trg_diaries_audit ON diaries;
CREATE TRIGGER trg_diaries_audit
AFTER INSERT OR UPDATE OR DELETE ON diaries
FOR EACH ROW EXECUTE FUNCTION log_data_access();

-- Trigger cho health_metrics
DROP TRIGGER IF EXISTS trg_health_metrics_audit ON health_metrics;
CREATE TRIGGER trg_health_metrics_audit
AFTER INSERT OR UPDATE OR DELETE ON health_metrics
FOR EACH ROW EXECUTE FUNCTION log_data_access();
