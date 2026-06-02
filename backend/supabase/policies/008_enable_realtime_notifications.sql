-- ============================================================
-- 008: Enable Supabase Realtime on notifications table
-- ============================================================
-- Muc dich: Bat tinh nang Realtime de Frontend co the lang nghe
-- thong bao moi qua WebSocket thay vi phai polling lien tuc.
--
-- Cach chay: Copy noi dung file nay vao Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- Buoc 1: Bat Realtime cho bang notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Buoc 2: Tao RLS policy de dam bao user chi nhan thong bao cua chinh minh
-- (Supabase Realtime ton trong RLS policies)
-- Luu y: Neu da co RLS policy cho bang notifications thi bo qua buoc nay.

-- Bat RLS (neu chua bat)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: User chi doc duoc thong bao cua chinh minh
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Policy: He thong (service_role) co the INSERT thong bao cho bat ky ai
-- (Backend su dung service_role key de ket noi, nen khong bi chan boi RLS)
