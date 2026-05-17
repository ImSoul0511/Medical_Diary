# Báo Cáo Triển Khai: Module Authentication (Auth)

## 1. Tổng quan
Module Auth đóng vai trò là "cửa ngõ" an ninh của toàn bộ hệ thống Medical Diary, kết hợp giữa Supabase Auth (cấp phát token) và quản lý User Profiles (SQLAlchemy/PostgreSQL).

## 2. Các thay đổi và triển khai chính

### 2.1. Chuyển đổi phương thức định danh
- **Từ Số điện thoại sang Email:** Quyết định chuyển hướng kiến trúc xác thực sang sử dụng Email để tận dụng tối đa giới hạn Free Tier của Supabase Auth (hỗ trợ gửi email OTP và quản lý người dùng miễn phí).
- Cập nhật toàn bộ các DTOs/Schemas (như `LoginRequest`, `RegisterRequest`) để thay trường `phone_number` bằng `email`.

### 2.2. Triển khai API Endpoints (`router.py` & `service.py`)
Đã hoàn thiện 6 endpoints bảo mật cao:
- `POST /auth/login`: Xác thực với Supabase, truy vấn role từ bảng `profiles`, trả về `access_token`.
- `POST /auth/register`: Đăng ký người dùng thường, tạo tài khoản Supabase và lưu bản ghi profile.
- `POST /auth/register-doctor`: Đăng ký bác sĩ. Hỗ trợ upload ảnh chứng chỉ lên Supabase Storage qua dạng `multipart/form-data`.
- `POST /auth/logout`: Đăng xuất an toàn.
- `GET /auth/sessions`: Gọi hàm RPC `list_user_sessions` trên DB để lấy danh sách các phiên đăng nhập.
- `POST /auth/revoke-all` & `POST /auth/revoke-selected-session`: Hủy phiên đăng nhập từ xa.

### 2.3. Tích hợp mã hóa Pgcrypto
- Trong endpoint đăng ký bác sĩ, hệ thống sử dụng hàm `pgp_sym_encrypt` trực tiếp trong câu lệnh SQL (`INSERT`) để mã hóa trường dữ liệu nhạy cảm là `cccd` (Căn cước công dân).
- Key mã hóa không được hardcode mà lấy linh hoạt từ local context của transaction hiện tại thông qua `current_setting('app.encryption_key')`.
