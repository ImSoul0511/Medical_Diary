-- ============================================================
-- pgcrypto Extension Setup
-- Chạy 1 lần duy nhất trên Supabase SQL Editor hoặc qua Alembic
-- ============================================================

-- Kích hoạt pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Cách sử dụng:
--
-- MÃ HÓA (INSERT/UPDATE):
--   pgp_sym_encrypt('plain_text', current_setting('app.encryption_key'))
--
-- GIẢI MÃ (SELECT):
--   pgp_sym_decrypt(column_name::bytea, current_setting('app.encryption_key'))
--
-- Key được inject vào mỗi DB session qua get_db() trong database.py:
--   SET LOCAL app.encryption_key = '...';
-- ============================================================
