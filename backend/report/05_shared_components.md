# Báo Cáo Triển Khai: Shared Components

## 1. Tổng quan
Thư mục `shared` đóng vai trò lưu trữ những thành phần chung, được tái sử dụng qua nhiều module khác nhau như Dependencies (hàm phụ trợ cho FastAPI) và Schemas (định dạng dữ liệu).

## 2. Các thay đổi và triển khai chính

### 2.1. Tối ưu Dependencies (`dependencies.py`)
- **Hàm `get_current_user`:** Cải tiến lại cách xác thực người dùng. Thay vì mỗi lần request API đều phải gửi truy vấn lên database Supabase để hỏi "Token này có hợp lệ không?", hàm này được cấu hình lại để **đọc trực tiếp** từ Context của `request.state.jwt_claims` (đã được bóc tách và xác minh chữ ký ở RLS Middleware trước đó).
- Cải tiến này giúp **giảm tải 1 request DB** trên mỗi lượt truy cập API, tối ưu hóa đáng kể tốc độ phản hồi của toàn bộ hệ thống.
- Bổ sung cơ chế trả về Exception 401 cụ thể nếu claims bị rỗng, cảnh báo cho client biết RLS Middleware đã chặn token giả mạo.
- **Hàm `require_role`:** Nâng cấp cơ chế kiểm tra phân quyền (Authorization). Thay vì hoàn toàn phụ thuộc vào Payload của JWT Token (vốn không thể cập nhật ngay lập tức nếu quyền user bị đổi), hàm đã được chuyển sang bất đồng bộ (`async`) và tiêm thêm `AsyncSession` để thực hiện truy vấn trực tiếp xuống Database (`bảng profiles`). Thiết kế này giúp xác thực role một cách an toàn theo thời gian thực, ngăn chặn rủi ro bảo mật và tự động ghi đè thông tin role chính xác vào lại context `current_user` cho chuỗi xử lý API phía sau.

### 2.2. Chuẩn hóa Schemas (`schemas.py`)
- Thiết kế **`ErrorResponse`** Schema bao gồm 3 tham số cốt lõi: `error_code`, `message`, `request_id`.
- Tái sử dụng `ErrorResponse` trong toàn bộ Exception Handlers để giúp Frontend dễ dàng bắt mã lỗi và truy vết log qua `request_id`.
- Thiết kế **`MessageResponse`** làm định dạng chuẩn cho các API chỉ trả về chuỗi thông báo (Ví dụ: "Đăng ký thành công", "Đăng xuất thành công"). Cấu trúc này giúp đồng nhất trải nghiệm API và Swagger Document.
