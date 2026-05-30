# Yêu cầu tích hợp Frontend (Frontend Integration Requirements) — Medical Diary

Tài liệu này tổng hợp các yêu cầu nghiệp vụ và kỹ thuật dành cho nhà phát triển Frontend để tích hợp các tính năng Backend mới triển khai (QR khẩn cấp, Thông báo, Xử lý Rate Limiting, Nhật ký đơn thuốc).

---

## 1. Tính năng Mã QR Khẩn cấp (Emergency QR Code)

### A. Phía Bệnh nhân (Giao diện cấu hình & tạo QR)
Bệnh nhân có thể tạo mã QR để in ra mang theo người hoặc lưu trên màn hình khóa điện thoại.

1. **Tạo Token Khẩn cấp (`POST /emergency/token`):**
   * Cho phép chọn thời hạn hiệu lực (ví dụ: 15 phút, 1 giờ, 24 giờ) hoặc "Vĩnh viễn" (in ra giấy).
   * Gửi yêu cầu với body: `{ "ttl_minutes": 60 }` (hoặc `null` nếu là vĩnh viễn).
   * Backend trả về: `{ "emergency_token": "emg_xxxxxx...", "expires_at": "..." }`.
2. **Sinh ảnh QR Code (Client-side Rendering):**
   * Sử dụng thư viện phía Client (ví dụ: `qrcode.react`, `canvas-qrcode`) để vẽ mã QR trực tiếp từ chuỗi URL định dạng:
     `https://<domain-client>/emergency-scan?token=emg_xxxxxx...`
   * **Lưu ý:** Không mã hóa thông tin cá nhân vào QR, chỉ mã hóa URL chứa token bảo mật.
3. **Quản lý danh sách QR Token (`GET /emergency/tokens`):**
   * Hiển thị danh sách các mã QR đã tạo, trạng thái (còn hạn/đã hết hạn) thông qua trường `is_expired`.
   * Cho phép người dùng gia hạn hoặc chuyển sang vĩnh viễn (`PATCH /emergency/tokens/{id}`).
   * Cho phép hủy hiệu lực QR (`DELETE /emergency/tokens/{id}`).
4. **Lịch sử quét QR (`GET /emergency/tokens/history`):**
   * Hiển thị danh sách các lần mã QR của bệnh nhân bị quét bởi cấp cứu viên (gồm thời gian quét).

### B. Phía Cấp cứu viên (Giao diện Quét QR - Public)
Giao diện này mở công khai không yêu cầu đăng nhập khi quét mã QR của bệnh nhân gặp sự cố.

1. **Gọi API lấy thông tin (`GET /emergency/access/{token}`):**
   * Lấy token từ URL query parameter sau khi quét QR.
   * Gửi request GET public đến backend.
2. **Hiển thị thông tin y tế tối thiểu:**
   * Backend chỉ trả về các trường được bật trong `privacy_settings` của bệnh nhân.
   * Giao diện cần hiển thị rõ ràng: Họ tên bệnh nhân, Nhóm máu, Danh sách dị ứng, Số điện thoại người thân.
3. **Xử lý các mã lỗi:**
   * **404 Not Found:** QR không tồn tại hoặc đã bị hủy. Hiển thị: "Mã QR không hợp lệ hoặc đã bị thu hồi."
   * **410 Gone:** QR đã hết hạn. Hiển thị: "Mã QR này đã hết hạn hiệu lực."

---

## 2. Tính năng Hệ thống Thông báo (Notifications)

Frontend cần xây dựng trung tâm thông báo (Notification Center) để người dùng theo dõi các sự kiện hệ thống.

1. **Lấy danh sách thông báo (`GET /notifications`):**
   * Gọi API khi mở trang thông báo hoặc định kỳ (polling) để hiển thị danh sách, sắp xếp mới nhất ở đầu.
   * Đếm số lượng thông báo chưa đọc (`is_read = false`) để hiển thị huy hiệu (badge) đỏ trên icon chuông thông báo.
2. **Xử lý nhấp chọn và Đọc thông báo (`PATCH /notifications/{id}/read`):**
   * Khi người dùng nhấp vào một thông báo, gửi request PATCH để đánh dấu đã đọc.
   * Cập nhật trạng thái hiển thị trên giao diện (làm mờ thông báo đã đọc).
3. **Điều hướng theo loại thông báo (`type`):**
   * `access_request`: Chuyển người dùng tới trang quản lý yêu cầu truy cập (`/consent/requests`) để phê duyệt/từ chối quyền cho bác sĩ.
   * `prescription_new`: Chuyển người dùng tới trang xem chi tiết đơn thuốc mới (`/prescriptions`).
   * `prescription_reminder`: Hiển thị nhắc nhở giờ uống thuốc trên màn hình chính và chuyển tới trang lịch trình (`/prescription-logs`).

---

## 3. Xử lý giới hạn tần suất (HTTP 429 Rate Limiting)

Do backend áp dụng cơ chế SlowAPI để chống spam và tấn công brute-force, Frontend bắt buộc phải bắt lỗi và hiển thị thông báo thân thiện với người dùng tại các vị trí sau:

### A. Các Endpoint áp dụng giới hạn:
* **Trang Đăng nhập (`POST /auth/login`):** Giới hạn **5 lần/phút**.
* **Trang Đăng ký (`POST /auth/register` & `/auth/register-doctor`):** Giới hạn **3 lần/phút**.
* **Gửi yêu cầu truy cập (`POST /doctors/request-access`):** Giới hạn **10 lần/ngày**.
* **Quét QR công cộng (`GET /emergency/access/{token}`):** Giới hạn **30 lần/phút**.

### B. Nguyên tắc xử lý trên Frontend:
* **Sử dụng Axios Interceptor** hoặc cơ chế bắt lỗi tập trung của Client.
* Khi nhận được phản hồi HTTP có `status_code === 429`, trích xuất thông điệp từ backend và hiển thị hộp thoại cảnh báo (Toast/Alert):
  * *Mẫu thông báo:* "Bạn đã thực hiện thao tác quá nhanh. Vui lòng đợi một lát trước khi thử lại."
  * Không để ứng dụng bị crash hoặc hiển thị lỗi kỹ thuật thô.

---

## 4. Tích hợp Lịch trình uống thuốc (Prescription Logs)

Hệ thống hỗ trợ 2 chế độ kê đơn cho Bác sĩ khi gọi API `POST /prescriptions/{prescription_id}/items`:

### A. Chế độ Tự động (Auto Mode)
Hệ thống tự động sinh cữ uống theo chu kỳ ngày.
*   **Body gửi lên:**
    ```json
    {
      "medication_name": "Amoxicillin 500mg",
      "dosage": "1 viên x 3 lần/ngày",
      "duration_days": 7,
      "scheduled_times": ["08:00", "13:00", "20:00"],
      "start_date": "2026-05-30", // Tùy chọn (mặc định là hôm nay nếu bỏ qua)
      "custom_logs": null
    }
    ```

### B. Chế độ Thủ công/Tùy chỉnh (Manual Mode)
Bác sĩ tự quyết định cữ uống vào các ngày và giờ cụ thể (không phụ thuộc vào chu kỳ lặp lại).
*   **Body gửi lên:**
    ```json
    {
      "medication_name": "Paracetamol 500mg",
      "dosage": "1 viên khi sốt > 38.5 độ",
      "duration_days": null,
      "scheduled_times": null,
      "start_date": null,
      "custom_logs": [
        { "scheduled_date": "2026-05-30", "scheduled_time": "09:30" },
        { "scheduled_date": "2026-05-30", "scheduled_time": "21:00" },
        { "scheduled_date": "2026-05-31", "scheduled_time": "15:00" }
      ]
    }
    ```

### C. Phía Bệnh nhân (Giao diện hiển thị)
1. **Hiển thị lịch trình uống thuốc (`GET /prescription-logs?prescription_id={id}`):**
   * Hiển thị danh sách cữ uống thuốc dưới dạng lịch trình trực quan (Timeline) sắp xếp theo ngày (`scheduled_date`) và giờ (`scheduled_time`).
   * Bộ lọc theo trạng thái: Đã uống (`taken`), Bỏ qua (`skipped`), Chưa uống (`untaken`).
2. **Cập nhật trạng thái cữ uống (`PATCH /prescription-logs/{log_id}`):**
   * Cung cấp nút bấm "Xác nhận đã uống" -> gửi `{ "status": "taken" }`.
   * Cung cấp nút bấm "Bỏ qua" -> gửi `{ "status": "skipped" }`.
