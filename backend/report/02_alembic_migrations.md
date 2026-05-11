# Báo Cáo Triển Khai: Database & Alembic Migrations

## 1. Tổng quan
Alembic được sử dụng để đồng bộ hóa các model Python (SQLAlchemy) với cấu trúc bảng thực tế trên Supabase PostgreSQL, đồng thời quản lý các extension đặc thù của dự án.

## 2. Các thay đổi và triển khai chính

### 2.1. Quản lý cấu trúc bảng (Schema Updates)
- Tạo migration `26c90af1fec5_remove_phone_encrypted_from_profiles.py`: Chính thức loại bỏ cột `phone_encrypted` khỏi bảng `profiles` do kiến trúc đã chuyển sang xác thực hoàn toàn bằng Email.

### 2.2. Quản lý Extension và RPC Functions
Thay vì bắt buộc phải thao tác bằng tay hoàn toàn trên Supabase Dashboard, một số cài đặt Database cấp thấp đã được tự động hóa bằng Alembic:
- Tạo migration `432955958e19_init_supabase_functions.py`: Chạy lệnh `CREATE EXTENSION IF NOT EXISTS pgcrypto`.
- Việc tích hợp việc gọi các script SQL thuần vào hàm `upgrade()` của Alembic giúp dự án dễ dàng tái khởi tạo trên bất kỳ môi trường nào (Staging, Production) mà không sợ thiếu sót extension mã hóa.

### 2.3. Các hàm Custom SQL (Supabase Policies)
Đã chuẩn bị sẵn một tập hợp các file script SQL (`002` đến `004`) để khởi tạo các hàm xử lý dữ liệu phức tạp trên Database (RPC):
- `list_user_sessions`: Lấy lịch sử truy cập.
- `revoke_selected_session` / `revoke_all_user_sessions`: Xóa token.
- `verify_user_password`: So sánh mật khẩu băm dùng thuật toán mã hóa tích hợp của bảng `auth.users`.
