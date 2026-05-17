# Báo Cáo Triển Khai: Middlewares

## 1. Tổng quan
Middlewares là lớp bảo vệ và xử lý nằm ngoài cùng, can thiệp trực tiếp vào Request trước khi nó chạm đến Router, và can thiệp vào Response trước khi nó được gửi về Client.

## 2. Các thay đổi và triển khai chính

### 2.1. RLS Middleware (`rls.py`)
Đây là trái tim của hệ thống phân quyền (Row-Level Security) hoạt động trên FastAPI:
- **Trích xuất Token:** Bóc tách chuỗi `Bearer <token>` từ HTTP Headers.
- **Xử lý JWK (JSON Web Key):** Cải tiến thuật toán đọc cấu trúc key định dạng JSON phức tạp của Supabase ES256, tự động trích xuất các tham số (x, y, kid, kty) để ghép thành một public key hợp lệ.
- **Giải mã An toàn:** Sử dụng thư viện `python-jose` để xác minh chữ ký của Supabase Token, tránh trường hợp Client gửi token giả mạo.
- **Đóng gói Claims:** Trích xuất thông tin người dùng (`sub`, `role`, `email`) và gán vào `request.state.jwt_claims`, sẵn sàng để tầng Database (`get_db`) đẩy vào PostgreSQL.

### 2.2. Logging Middleware (`logging.py`)
Hệ thống giám sát (Monitoring) cơ bản:
- Sinh một chuỗi ID ngẫu nhiên (`request_id`) cho mỗi request HTTP gửi tới Server.
- In ra Log thời điểm bắt đầu request và thời điểm kết thúc request kèm theo Status Code (200, 400, 401...).
- Đo lường độ trễ (Latency - ms) giúp phát hiện các API chậm.
- Đính kèm `X-Request-ID` vào Header trả về, giúp Backend và Frontend dễ dàng đối chiếu lỗi khi có sự cố.
