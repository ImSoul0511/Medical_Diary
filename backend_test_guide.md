# Hướng dẫn Kiểm thử Endpoint & Giải thích Rate Limiting — Medical Diary

Tài liệu này hướng dẫn chi tiết cách kiểm thử các luồng nghiệp vụ chính của Backend và giải thích các vị trí đã cấu hình Rate Limiting (Giới hạn tần suất yêu cầu) trong hệ thống.

---

## Phần 1: Giải thích Cơ chế & Cấu hình Rate Limiting

Hệ thống sử dụng thư viện **SlowAPI** để thực hiện giới hạn tần suất yêu cầu (Rate Limiting) ở tầng ứng dụng dựa trên địa chỉ IP của client (`get_remote_address`).

### 1. Bảng cấu hình Rate Limit của các Endpoint nhạy cảm:

| STT | Endpoint | Method | Giới hạn | Tệp tin triển khai | Lý do cấu hình |
|---|---|---|---|---|---|
| 1 | `/auth/login` | POST | `5/minute` (5 lần/phút) | `app/modules/auth/router.py` | Ngăn chặn tấn công Brute-force mật khẩu. |
| 2 | `/auth/register` | POST | `3/minute` (3 lần/phút) | `app/modules/auth/router.py` | Tránh spam tạo tài khoản rác/tấn công DOS đăng ký. |
| 3 | `/auth/register-doctor` | POST | `3/minute` (3 lần/phút) | `app/modules/auth/router.py` | Hạn chế upload file chứng chỉ liên tục lên Supabase Storage. |
| 4 | `/doctors/request-access` | POST | `10/day` (10 lần/ngày) | `app/modules/doctors/router.py` | Tránh spam gửi yêu cầu truy cập hồ sơ đến người dùng. |
| 5 | `/emergency/access/{token}` | GET | `30/minute` (30 lần/phút) | `app/modules/emergency/router.py` | Bảo vệ endpoint khẩn cấp công cộng khỏi thu thập dữ liệu (scraping). |

### 2. Cách kiểm thử Rate Limiting:
Để kiểm tra xem Rate Limiting có hoạt động hay không:
1. Mở Swagger UI tại địa chỉ `http://localhost:8000/docs`.
2. Gửi liên tiếp các yêu cầu (ví dụ: Gọi API `/auth/login` với dữ liệu sai 6 lần liên tục trong vòng 1 phút).
3. **Kết quả mong đợi:** Từ lần gọi thứ 6 trở đi, server sẽ trả về mã lỗi `429 Too Many Requests` kèm thông báo:
   ```json
   {
     "error_code": "RATE_LIMIT_EXCEEDED",
     "message": "Rate limit exceeded: 5 per 1 minute",
     "request_id": "..."
   }
   ```

---

## Phần 2: Hướng dẫn kiểm thử các Luồng nghiệp vụ chính (E2E Test Flows)

Bạn có thể chạy thử nghiệm toàn bộ hệ thống thông qua Swagger UI (`http://localhost:8000/docs`). Dưới đây là 5 kịch bản kiểm thử tương ứng các luồng hoạt động chính:

### Luồng 1: Đăng ký & Xác thực (Auth Flow)
* **Mục tiêu:** Tạo tài khoản bệnh nhân, tài khoản bác sĩ và lấy token đăng nhập.
* **Các bước thực hiện:**
  1. **Đăng ký User:** Gọi `POST /auth/register` với thông tin email, mật khẩu, họ tên, số điện thoại.
  2. **Đăng ký Doctor:** Gọi `POST /auth/register-doctor` (dưới dạng Multipart Form). Bạn cần truyền thông tin cá nhân kèm một file ảnh chứng chỉ (`certificate_file`).
  3. **Đăng nhập Bệnh nhân:** Gọi `POST /auth/login` bằng tài khoản User vừa tạo. Lưu lại trường `access_token` trong response.
  4. **Đăng nhập Bác sĩ:** Gọi `POST /auth/login` bằng tài khoản Doctor vừa tạo. Lưu lại `access_token`.
  5. **Xác thực trên Swagger:** Bấm nút **Authorize** ở góc trên bên phải Swagger, dán token của tài khoản bạn muốn giả lập hành động vào.

---

### Luồng 2: Bác sĩ yêu cầu quyền & Bệnh nhân phê duyệt (Consent Flow)
* **Mục tiêu:** Bác sĩ yêu cầu quyền và xem được hồ sơ bệnh nhân khi được phê duyệt. Đồng thời kiểm thử **Audit Log Trigger** tự động.
* **Các bước thực hiện:**
  1. **Bác sĩ tìm bệnh nhân:** Đăng nhập dưới quyền **Bác sĩ**, gọi `GET /doctors/search-patients?phone_number={SĐT_User}` để lấy `patient_id`.
  2. **Bác sĩ gửi yêu cầu truy cập:** Gọi `POST /doctors/request-access` với `patient_id` và mảng `requested_scope` (ví dụ: `["diaries", "medical_records"]`).
  3. **Bệnh nhân xem thông báo:** Đăng nhập dưới quyền **Bệnh nhân**, gọi `GET /notifications` để nhận thông báo yêu cầu truy cập mới từ bác sĩ.
  4. **Bệnh nhân phê duyệt:** 
     * Gọi `GET /consent/access-requests` để lấy danh sách yêu cầu đang chờ duyệt kèm `request_id`.
     * Gọi `PATCH /consent/access-requests/{request_id}` với body: `{"action": "approve", "scope": ["diaries", "medical_records"], "expires_in_hours": 24}`.
  5. **Bác sĩ đọc dữ liệu:** Đăng nhập dưới quyền **Bác sĩ**, gọi `GET /diaries?patient_id={patient_id}` để xem nhật ký của bệnh nhân.
  6. **Kiểm tra Audit Log tự động:** 
     * Khi Bác sĩ thao tác đọc/ghi nhật ký của bệnh nhân, Database Trigger (`005_audit_log_trigger.sql`) sẽ tự động chèn một dòng thông tin vào bảng `data_access_logs`.
     * Đăng nhập dưới quyền **Bệnh nhân** (hoặc Admin), kiểm tra lịch sử truy cập qua endpoint `GET /users/access-history` để thấy vết ghi nhận hành động đọc nhật ký của bác sĩ.

---

### Luồng 3: Đơn thuốc & Sinh lịch nhắc nhở tự động (Prescription Flow)
* **Mục tiêu:** Bác sĩ tạo đơn thuốc, hệ thống tự động sinh lịch trình uống thuốc từng ngày bằng Database Trigger.
* **Các bước thực hiện:**
  1. **Bác sĩ tạo đơn thuốc trống:** Đăng nhập dưới quyền **Bác sĩ**, gọi `POST /prescriptions` với `patient_id`. Ghi nhận `prescription_id` trả về.
  2. **Bác sĩ thêm thuốc vào đơn:**
     * Gọi `POST /prescriptions/{prescription_id}/items` để thêm một loại thuốc.
     * Dữ liệu gửi đi bao gồm: `medication_name`, `dosage`, `duration_days` (ví dụ: `3` ngày), `scheduled_times` (ví dụ: `["08:00:00", "20:00:00"]`).
  3. **Kiểm tra Trigger tự động sinh lịch uống thuốc:**
     * Database Trigger (`006_prescription_logs_trigger.sql`) sẽ tự động chạy để tạo ra `3 ngày x 2 cữ = 6 bản ghi` cữ uống thuốc trong bảng `prescription_logs`.
  4. **Bệnh nhân xem lịch uống thuốc:** Đăng nhập dưới quyền **Bệnh nhân**, gọi `GET /prescription-logs?prescription_id={prescription_id}` để thấy danh sách 6 cữ uống thuốc đã được sinh tự động.
  5. **Bệnh nhân nhận thông báo nhắc nhở uống thuốc:** 
     * Khi bệnh nhân truy cập trang web (gọi `GET /notifications`), hệ thống backend sẽ tự động kiểm tra xem có cữ uống thuốc nào trong vòng 7 ngày qua đã đến/quá giờ uống mà chưa có thông báo tương ứng.
     * Hệ thống sẽ tự động tạo thông báo nhắc nhở (`type = 'prescription_reminder'`).
     * Gọi lại `GET /notifications` để kiểm tra: Bạn sẽ thấy thông báo *"Đã đến giờ uống thuốc: [Tên thuốc]..."* xuất hiện trong danh sách thông báo.
  6. **Bệnh nhân cập nhật trạng thái uống thuốc:** Gọi `PATCH /prescription-logs/{log_id}` với body `{"status": "taken"}` để xác nhận đã uống thuốc. Hệ thống tự động điền `taken_at`.

---

### Luồng 4: Mã QR Khẩn cấp (Emergency QR Flow)
* **Mục tiêu:** Tạo mã khẩn cấp cho phép người ngoài quét xem thông tin y tế khi cần thiết mà không cần đăng nhập.
* **Các bước thực hiện:**
  1. **Tạo token khẩn cấp:** Đăng nhập dưới quyền **Bệnh nhân**, gọi `POST /emergency/token` với `ttl_minutes` (ví dụ: `60` phút, hoặc bỏ trống để tạo vĩnh viễn). Nhận về chuỗi `token`.
  2. **Quét mã khẩn cấp (Không cần đăng nhập):**
     * Đóng Swagger hoặc không cần gửi Token xác thực (giả lập là cấp cứu viên ngoài đường).
     * Gọi `GET /emergency/access/{token}` bằng chuỗi `token` vừa nhận được.
     * **Kết quả mong đợi:** API chỉ trả về các thông tin y tế cơ bản của bệnh nhân dựa trên cấu hình quyền riêng tư `privacy_settings` (như nhóm máu, dị ứng, liên hệ khẩn cấp).

---

### Luồng 5: Hệ thống thông báo (Notifications Flow)
* **Mục tiêu:** Xem và quản lý các thông báo trong hệ thống.
* **Các bước thực hiện:**
  1. **Xem thông báo:** Gọi `GET /notifications` để lấy toàn bộ thông báo (bao gồm thông báo yêu cầu quyền, lịch nhắc thuốc, v.v.), được sắp xếp mới nhất ở đầu.
  2. **Đánh dấu đã đọc:** Gọi `PATCH /notifications/{notification_id}/read` để đánh dấu thông báo đó đã được đọc (`is_read = true`).
