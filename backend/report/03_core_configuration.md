# Báo Cáo Triển Khai: Core Configurations

## 1. Tổng quan
Tầng `core` quản lý các cấu hình nền tảng, biến môi trường, bảo mật ở cấp độ kết nối và xử lý lỗi đồng nhất cho toàn hệ thống.

## 2. Các thay đổi và triển khai chính

### 2.1. Cấu hình Biến môi trường (`config.py` & `.env`)
- **JWT Algorithm**: Chuyển đổi chuẩn mã hóa token từ `HS256` sang `ES256` (ECC P-256) nhằm tuân thủ cấu hình bảo mật mới nhất từ phía máy chủ Supabase.
- **Tách biệt Key Bảo Mật**: Phân tách rõ ràng giữa `JWT_SECRET` (để giải mã token) và một biến mới là `ENCRYPTION_KEY` (để mã hóa thông tin nhạy cảm trong DB bằng `pgcrypto`). Điều này đặc biệt quan trọng vì JWT_SECRET hiện tại sử dụng cấu trúc JSON Web Key Set (JWKS), không phù hợp để làm khóa AES.

### 2.2. Database Session & Injection RLS (`database.py`)
- Định cấu hình `AsyncSession` của SQLAlchemy phục vụ môi trường bất đồng bộ của FastAPI.
- Xây dựng cơ chế **Dependency Injection** tự động bơm 2 tham số cực kỳ quan trọng vào mỗi transaction của Postgres trước khi chạy bất kỳ Query nào:
  1. `request.jwt.claims`: Bơm User Context vào Postgres để hệ thống Row-Level Security (RLS) của Supabase nhận diện được user đang thực hiện query.
  2. `app.encryption_key`: Bơm khóa mã hóa để hàm `pgp_sym_encrypt` có thể đọc được và tiến hành mã hóa/giải mã ở phía Database (thay vì làm ở Application Layer).

### 2.3. Global Exception Handler (`exceptions.py`)
Đã quy hoạch 3 lớp xử lý lỗi toàn cục:
- Lỗi từ hệ thống Validation (Pydantic).
- Lỗi HTTP do lập trình viên cố ý ném ra (HTTPException).
- Lỗi không lường trước (Bug, Crash).
Tất cả đều được format về một chuẩn duy nhất `ErrorResponse` để frontend dễ dàng xử lý.
