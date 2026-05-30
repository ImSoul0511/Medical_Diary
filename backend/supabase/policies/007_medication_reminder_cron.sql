-- Kích hoạt extension pg_cron và pg_net nếu chưa có
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Tạo function gọi HTTP request đến FastAPI backend
CREATE OR REPLACE FUNCTION cron_send_medication_reminders() RETURNS void AS $$
DECLARE request_id bigint;
backend_url text;
jwt_secret_val text;
BEGIN -- Đọc URL API backend từ cài đặt (mặc định lấy theo Docker service name)
-- Ở production, bạn nên cấu hình URL bằng cách chạy lệnh:
-- ALTER DATABASE postgres SET app.backend_url = 'https://api.yourdomain.com';
backend_url := COALESCE(
  current_setting('app.backend_url', true),
  'http://medical_diary_backend:8000' -- URL nội bộ trong mạng Docker của dự án
);
-- Token bảo mật nội bộ (dùng JWT_SECRET để xác thực request)
-- Cấu hình bằng cách chạy lệnh:
-- ALTER DATABASE postgres SET app.jwt_secret = 'your-jwt-secret-here';
jwt_secret_val := COALESCE(
  current_setting('app.jwt_secret', true),
  'super-secret-jwt-key-change-in-production' -- fallback key
);
-- Thực hiện cuộc gọi HTTP POST không đồng bộ qua pg_net
SELECT net.http_post(
    url := backend_url || '/prescriptions/internal/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'X-Internal-Token',
      jwt_secret_val
    ),
    body := '{}'::jsonb
  ) INTO request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Lập lịch chạy mỗi 5 phút
-- Trước hết, hủy lịch cũ nếu tồn tại để tránh trùng lặp
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'send-medication-reminders'
) THEN PERFORM cron.unschedule('send-medication-reminders');
END IF;
END $$;
SELECT cron.schedule(
    'send-medication-reminders',
    '*/5 * * * *',
    'SELECT cron_send_medication_reminders();'
  );