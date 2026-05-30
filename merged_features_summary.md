# Tổng hợp các Tính năng đã Triển khai (Nhánh `feat/check-merge`)

Tài liệu này tổng hợp toàn bộ các tính năng đã được triển khai từ việc gộp (merge) các nhánh tính năng (`feature/doctors`, `feature/phase4B`, `feature/phase5`, `feature/phase7`) và code frontend (`dev`) vào nhánh **`feat/check-merge`**.

---

## 1. Backend: Các Module Tính năng Mới & Cải tiến

### 🩺 Module Bác sĩ (`app/modules/doctors`)
*Nhánh nguồn: `feature/doctors`*
- **Tìm kiếm bệnh nhân (`GET /doctors/search-patients`)**: Cho phép bác sĩ tìm kiếm bệnh nhân theo tên (`query`) phục vụ cho việc cấp quyền/điều trị.
- **Xem chi tiết hồ sơ bệnh nhân (`GET /doctors/patients/{patient_id}`)**: Bác sĩ xem thông tin hồ sơ của bệnh nhân (Họ tên, SĐT, ngày sinh...) sau khi đã được kiểm tra quyền truy cập (Consent).
- **Yêu cầu quyền truy cập (`POST /doctors/request-access`)**: Bác sĩ gửi yêu cầu cấp quyền (consent request) tới bệnh nhân để được phép xem các thông tin nhạy cảm (nhật ký triệu chứng, chỉ số sinh tồn, hồ sơ bệnh án).

### 🚨 Module Cấp cứu (`app/modules/emergency`)
*Nhánh nguồn: `feature/phase5`*
- **Quản lý QR Token khẩn cấp**:
  - `POST /emergency/token`: Tạo mã QR khẩn cấp với thời gian hết hạn (`ttl_minutes`) hoặc vĩnh viễn (dùng in ra giấy mang theo người).
  - `GET /emergency/tokens`: Lấy danh sách các mã QR đang hoạt động của bệnh nhân.
  - `PATCH /emergency/tokens/{token_id}`: Thay đổi hoặc gia hạn thời gian hiệu lực (`TTL`) của mã QR.
  - `DELETE /emergency/tokens/{token_id}`: Vô hiệu hóa (revoke) mã QR (Soft-delete).
- **Lịch sử quét QR (`GET /emergency/tokens/history`)**: Cho phép bệnh nhân xem danh sách và thời gian mà nhân viên cấp cứu đã quét mã QR của mình.
- **Xem thông tin cấp cứu công khai (`GET /emergency/access/{token}`)**: 
  - Endpoint công khai (Public) không yêu cầu đăng nhập. 
  - Nhân viên y tế quét mã QR để lấy thông tin y tế tối thiểu cần thiết.
  - Chỉ trả về các trường thông tin mà bệnh nhân đã bật trong phần cài đặt riêng tư (`privacy_settings`).
  - Ghi nhận lại lịch sử quét vào bảng `emergency_access_logs`.

### 🛡️ Module Quản trị (`app/modules/admin`)
*Nhánh nguồn: `feature/phase7`*
- **Quản lý phê duyệt Bác sĩ**:
  - `GET /admin/doctors/pending`: Xem danh sách các bác sĩ đang chờ phê duyệt tài khoản.
  - `PATCH /admin/doctors/{doctor_id}/verify`: Admin duyệt hoặc từ chối tài khoản bác sĩ.
- **Nhật ký kiểm toán (`GET /admin/audit-logs`)**: Xem nhật ký hệ thống (Audit Logs) phân trang, hỗ trợ lọc theo hành động (`action`), mã người dùng (`user_id`), hoặc mốc thời gian.
- **Cơ sở dữ liệu & Di trú (Migration)**:
  - Khởi tạo Alembic migration và thêm cột `email` vào bảng `doctors` để hỗ trợ xác thực qua Supabase.

### 📈 Quyền truy cập của Bác sĩ & Quản lý Đơn thuốc (`app/modules/prescriptions`, `diaries`, `health_metrics`, `medical_records`)
*Nhánh nguồn: `feature/phase4B`*
- **Đọc dữ liệu bệnh nhân (yêu cầu Consent)**:
  - Cập nhật API xem nhật ký (`GET /diaries`) và chỉ số đo lường (`GET /health-metrics`) để hỗ trợ tham số `patient_id`. Chỉ cho phép bác sĩ xem nếu bệnh nhân đã cấp quyền (Scope tương ứng là `diaries` và `vitals`).
  - `GET /medical-records/{patient_id}`: Bác sĩ xem hồ sơ bệnh án của bệnh nhân (Yêu cầu scope `medical_records`).
- **Tạo hồ sơ bệnh án (`POST /medical-records`)**: Bác sĩ tạo hồ sơ bệnh án mới cho bệnh nhân (không cần qua bước xin quyền vì đây là nghiệp vụ của bác sĩ).
- **Quản lý Đơn thuốc**:
  - `POST /prescriptions`: Bác sĩ khởi tạo đơn thuốc mới.
  - `POST /prescriptions/{prescription_id}/items`: Bác sĩ thêm thuốc chi tiết vào đơn. Hệ thống tự động kích hoạt Trigger trong Cơ sở dữ liệu để tạo lịch uống thuốc (`prescription_logs`) dựa trên số ngày (`duration_days`) × số lần uống trong ngày (`scheduled_times`).
  - `DELETE /prescriptions/{prescription_id}`: Bác sĩ xóa đơn thuốc của mình (Soft-delete).

---

## 2. Frontend: Tích hợp Giao diện người dùng (`frontend/`)

Code giao diện React/Vite/Tailwind được phát triển từ mockup Figma đã được gộp đầy đủ vào thư mục `frontend/` với cấu trúc hoàn chỉnh:
- **Xác thực**: Các trang Đăng nhập bệnh nhân/bác sĩ, Đăng ký, Đăng nhập Admin.
- **Trang chủ & Bảng điều khiển (Dashboard)**:
  - Giao diện của Bệnh nhân (xem nhật ký triệu chứng, chỉ số sức khỏe).
  - Giao diện của Bác sĩ (tìm kiếm bệnh nhân, xem bệnh án, kê đơn thuốc).
  - Giao diện Admin (phê duyệt bác sĩ, kiểm tra nhật ký kiểm toán).
- **Tiện ích & Cài đặt**:
  - Thiết lập quyền riêng tư (Privacy Settings).
  - Quản lý cấp quyền (Consent Management).
  - Tạo và hiển thị mã QR Cấp cứu (Emergency QR Code).
- **Quản lý Trạng thái (Store)**: Tích hợp Zustand stores để quản lý state cho auth, consent, medical records, notifications, và UI.

---

## 3. Cấu hình hệ thống chung
- **`backend/app/main.py`**: Đã tích hợp đầy đủ các routers mới giải quyết xung đột trước đó:
  - `diaries_router`
  - `prescriptions_router`
  - `medical_records_router`
  - `users_router`
  - `admin_router`
  - `emergency_router`
