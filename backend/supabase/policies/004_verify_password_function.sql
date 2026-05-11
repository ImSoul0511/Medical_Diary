-- ============================================================
-- Verify Password Function
-- Hàm SECURITY DEFINER để xác minh mật khẩu người dùng
-- Cần chạy trên Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION verify_user_password(target_user_id UUID, plain_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT (encrypted_password = crypt(plain_password, encrypted_password))
    INTO is_valid
    FROM auth.users
    WHERE id = target_user_id;

    RETURN COALESCE(is_valid, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
