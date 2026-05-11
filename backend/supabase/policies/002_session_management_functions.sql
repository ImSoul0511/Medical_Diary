-- ============================================================
-- Session Management Functions
-- Các hàm SECURITY DEFINER để quản lý session trong auth.sessions
-- Cần chạy trên Supabase SQL Editor (vì schema auth không thể truy cập trực tiếp từ role thường)
-- ============================================================
-- Hàm 1: Xóa một session cụ thể (có kiểm tra user_id để tránh xóa session người khác)
CREATE OR REPLACE FUNCTION revoke_selected_session(
        target_session_id UUID,
        target_user_id UUID
    ) RETURNS void AS $$ BEGIN
DELETE FROM auth.sessions
WHERE id = target_session_id
    AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Hàm 2: Xóa toàn bộ session của một user (trừ session hiện tại nếu cần)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(target_user_id UUID) RETURNS void AS $$ BEGIN
DELETE FROM auth.sessions
WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Cách sử dụng từ Backend (SQLAlchemy):
--
-- Thu hồi 1 session:
--   SELECT revoke_selected_session(:session_id, :user_id);
--
-- Thu hồi tất cả sessions (bao gồm cả session hiện tại):
--   SELECT revoke_all_user_sessions(:user_id);
-- ============================================================