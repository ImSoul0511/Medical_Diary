-- ============================================================
-- List User Sessions Function
-- Hàm SECURITY DEFINER để đọc danh sách session từ auth.sessions
-- Cần chạy trên Supabase SQL Editor
-- ============================================================

-- Tạo custom type để trả về từ function
DO $$ BEGIN
    CREATE TYPE session_info AS (
        id UUID,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        user_agent TEXT,
        ip TEXT
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Hàm liệt kê sessions của một user
CREATE OR REPLACE FUNCTION list_user_sessions(target_user_id UUID)
RETURNS SETOF session_info AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        s.updated_at,
        s.user_agent,
        s.ip::TEXT
    FROM auth.sessions s
    WHERE s.user_id = target_user_id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Cách sử dụng:
--   SELECT * FROM list_user_sessions(:user_id);
--
-- Từ Supabase Client (Python):
--   supabase.rpc("list_user_sessions", {"target_user_id": user_id}).execute()
-- ============================================================
