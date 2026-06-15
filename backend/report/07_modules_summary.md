# Tổng hợp Hệ thống: Các Module Backend và Module Notification Frontend

Tài liệu này tổng hợp toàn bộ các module backend cùng nhiệm vụ chi tiết của từng module, đồng thời phân tích kiến trúc và chức năng của module Notification riêng biệt ở phía frontend của hệ thống Medical Diary.

---

## 1. Các Module Backend và Nhiệm vụ Chi tiết

Hệ thống Backend được phát triển bằng **FastAPI**, sử dụng kiến trúc Domain-Driven Design (DDD) chia thành các module độc lập trong thư mục `backend/app/modules/`. Mỗi module bao gồm đầy đủ bộ ba: Schemas (validate dữ liệu), Service (chứa logic nghiệp vụ) và Router (khai báo endpoint API).

### 1.1. Module Auth (Xác thực & Phân quyền)
* **Nhiệm vụ:**
  * **Đăng nhập (`/auth/login`):** Xác thực thông tin qua Supabase Auth, trả về Access Token, đồng thời lưu trữ Refresh Token trong HTTP-Only Cookie để tự động làm mới phiên đăng nhập.
  * **Đăng ký người dùng (`/auth/register`):** Tạo tài khoản đăng nhập cho bệnh nhân thông qua địa chỉ email và lưu trữ thông tin ban đầu vào bảng `profiles`.
  * **Đăng ký bác sĩ (`/auth/register-doctor`):** Tiếp nhận thông tin qua `multipart/form-data`, xác thực và upload file chứng chỉ y khoa hành nghề (PNG, JPG, JPEG, PDF ≤ 5MB) lên Supabase Storage, mã hóa số CCCD bằng hàm `pgp_sym_encrypt` của PostgreSQL.
  * **Quản lý phiên đăng nhập (Sessions):** Cung cấp các API lấy danh sách phiên hoạt động (`/auth/sessions`), thu hồi phiên cụ thể từ xa (`/auth/revoke-selected-session`), hoặc đăng xuất khỏi tất cả các thiết bị (`/auth/revoke-all`).
  * **Khôi phục mật khẩu:** Gửi email yêu cầu đặt lại mật khẩu (`/auth/forgot-password`) và thay đổi mật khẩu (`/auth/change-password`, `/auth/reset-password`).

### 1.2. Module Users (Hồ sơ Người dùng)
* **Nhiệm vụ:**
  * **Hồ sơ Cá nhân (`/users/me`):** Xem và cập nhật các thông tin cơ bản của người dùng (họ tên, giới tính, ngày sinh, nhóm máu, dị ứng...).
  * **Thông tin Nhạy cảm (`/users/me/private`):** Xem/cập nhật số điện thoại và CCCD của người dùng (dữ liệu được mã hóa bảo mật thông qua `pgcrypto`).
  * **Quyền riêng tư (`/users/privacy`):** Cấu hình hiển thị (`privacy_settings` dưới dạng JSONB) cho phép ẩn/hiện nhóm máu, dị ứng, liên hệ khẩn cấp đối với bác sĩ hoặc khi quét mã QR cấp cứu.
  * **Lịch sử Truy cập (`/users/me/access-history`):** Truy xuất lịch sử các bác sĩ hoặc bên liên quan đã xem thông tin sức khỏe của bệnh nhân.
  * **Xuất dữ liệu (`/users/me/export`):** Xuất toàn bộ hồ sơ y tế cá nhân ra file JSON hoặc PDF chuyên nghiệp hỗ trợ hiển thị tiếng Việt (font Roboto) và chừa sẵn khung dán ảnh thẻ.

### 1.3. Module Doctors (Nghiệp vụ Bác sĩ)
* **Nhiệm vụ:**
  * **Phân quyền Bác sĩ:** Chặn các bác sĩ chưa được kiểm duyệt bằng middleware kiểm tra trường `verification_status == 'approved'`.
  * **Tìm kiếm Bệnh nhân (`/doctors/search-patients`):** Tìm kiếm bệnh nhân theo số điện thoại được giải mã.
  * **Quản lý Bệnh nhân (`/doctors/patients`):** Quản lý danh sách bệnh nhân đang được bác sĩ theo dõi điều trị.
  * **Xem Hồ sơ chi tiết (`/doctors/patients/{patient_id}`):** Xem chi tiết thông tin sức khỏe của bệnh nhân dựa trên các quyền đồng ý (Consent Scopes) đã được bệnh nhân phê duyệt.
  * **Yêu cầu Quyền truy cập (`/doctors/request-access`):** Gửi yêu cầu xin quyền truy cập các trường dữ liệu sức khỏe của bệnh nhân kèm giới hạn rate limit (tối đa 10 lượt/ngày).

### 1.4. Module Consent (Đồng ý & Quyền truy cập)
* **Nhiệm vụ:**
  * **Danh sách Yêu cầu (`/consent/access-requests`):** Bệnh nhân xem danh sách các yêu cầu xin quyền truy cập từ các bác sĩ.
  * **Phê duyệt/Từ chối (`/consent/access-requests/{request_id}`):** Bệnh nhân chấp nhận hoặc từ chối yêu cầu, đồng thời giới hạn phạm vi truy cập (Consent Scopes như `blood_type`, `prescriptions`, `diaries`, `heart_rate`...) và đặt thời gian hết hạn cụ thể cho quyền.
  * **Thu hồi Quyền (`/consent/revoke/{doctor_id}`):** Cho phép bệnh nhân hủy bỏ quyền truy cập dữ liệu của một bác sĩ cụ thể bất kỳ lúc nào.
  * **Lịch sử Đồng ý (`/consent/history`):** Lưu trữ lịch sử toàn bộ hoạt động cấp quyền, thay đổi và thu hồi quyền để kiểm toán an ninh.

### 1.5. Module Diaries (Nhật ký Sức khỏe)
* **Nhiệm vụ:**
  * **Tạo Nhật ký (`/diaries` POST):** Cho phép bệnh nhân tự ghi chép triệu chứng sức khỏe hàng ngày (ghi chú tự do kèm mức độ triệu chứng theo thang điểm từ 1-10).
  * **Xem Nhật ký (`/diaries` GET):** Bệnh nhân tự xem lại danh sách nhật ký của mình. Bác sĩ chỉ xem được danh sách của bệnh nhân khác khi có consent scope `diaries`.
  * **Xóa Nhật ký (Soft Delete):** Xóa nhật ký của người dùng bằng cách đặt giá trị cho cột `deleted_at`.

### 1.6. Module Health Metrics (Chỉ số Sức khỏe)
* **Nhiệm vụ:**
  * **Đo lường tự động (`/health-metrics`):** Ghi nhận dữ liệu đồng bộ tự động từ smartwatch/thiết bị đeo gồm nhịp tim, số bước chân, nhịp thở.
  * **Đo lường nhập tay (`/health-metrics/manual`):** Ghi nhận các chỉ số đo lường độc lập do người dùng tự nhập (huyết áp, đường huyết, SpO2, nhiệt độ, cân nặng).
  * **Tra cứu lịch sử:** Hỗ trợ xem lại lịch sử các chỉ số của chính bệnh nhân hoặc bác sĩ xem dữ liệu bệnh nhân (chỉ khi có quyền đồng ý tương ứng cho từng loại chỉ số).

### 1.7. Module Prescriptions (Đơn thuốc & Lịch uống)
* **Nhiệm vụ:**
  * **Kê đơn thuốc:** Bác sĩ lập đơn thuốc mới cho bệnh nhân (`/prescriptions`) và thêm chi tiết loại thuốc, liều lượng, số ngày uống, giờ uống (`/prescriptions/{id}/items`).
  * **Tự động sinh lịch uống:** Cơ sở dữ liệu sử dụng trigger tự động tạo lịch trình cữ uống chi tiết (Prescription Logs) dựa vào số ngày uống và số lần uống trong ngày.
  * **Đánh dấu uống thuốc (`/prescription-logs/{log_id}`):** Bệnh nhân đánh dấu tình trạng cữ uống thuốc là đã uống (`taken`), bỏ qua (`skipped`) hoặc chưa uống (`untaken`).
  * **Email nhắc nhở uống thuốc (`/prescriptions/internal/send-reminders`):** API nội bộ quét cơ sở dữ liệu các cữ uống sắp tới để tự động gửi email thông báo nhắc nhở (kích hoạt bằng DB Cron Job thông qua token an toàn `X-Internal-Token`).

### 1.8. Module Medical Records (Bệnh án & Tài liệu Y tế)
* **Nhiệm vụ:**
  * **Hồ sơ Bệnh án (`/medical-records`):** Bác sĩ lưu hồ sơ bệnh án khám bệnh, chuẩn đoán cho bệnh nhân.
  * **Tải Tài liệu y tế cá nhân (`/medical-records/documents/upload`):** Bệnh nhân tự tải lên các tài liệu y khoa cá nhân cũ (ảnh chụp, PDF xét nghiệm) lưu trên Supabase Storage.
  * **Tải Đính kèm bệnh án (`/medical-records/upload-attachment/{patient_id}`):** Bác sĩ tải lên tài liệu đính kèm trực tiếp vào hồ sơ bệnh án khám hiện tại.
  * **Kiểm soát truy cập:** Chỉ cho phép bác sĩ xem tài liệu đính kèm và tài liệu y tế của bệnh nhân khi có consent scope `medical_records`.

### 1.9. Module Emergency (Truy cập Khẩn cấp)
* **Nhiệm vụ:**
  * **Quản lý QR Token (`/emergency/token`):** Bệnh nhân tự tạo mã QR cấp cứu tạm thời (có TTL) hoặc vĩnh viễn (in ra mang theo người).
  * **Truy cập Khẩn cấp (`/emergency/access/{token}`):** Endpoint công khai (không yêu cầu đăng nhập, giới hạn rate limit 30 lượt/phút) để cấp cứu viên quét QR xem thông tin y tế cốt lõi (nhóm máu, dị ứng, liên hệ khẩn cấp) tùy theo cấu hình ẩn/hiện của bệnh nhân.
  * **Nhật ký Quét:** Lưu trữ và hiển thị lịch sử quét QR của bệnh nhân.

### 1.10. Module Admin (Quản trị Hệ thống)
* **Nhiệm vụ:**
  * **Phê duyệt Bác sĩ (`/admin/doctors/{doctor_id}/verify`):** Admin duyệt hoặc từ chối chứng chỉ hành nghề của bác sĩ trên hệ thống.
  * **Nhật ký Kiểm toán (`/admin/audit-logs`):** Xem nhật ký ghi lại tất cả các hành động nhạy cảm hoặc thay đổi hệ thống của người dùng/bác sĩ/admin.

### 1.11. Module Notifications (Thông báo)
* **Nhiệm vụ:**
  * Quản lý trạng thái đọc của thông báo hệ thống.
  * **On-Demand Reminders:** Tự động kiểm tra cữ uống thuốc quá giờ chưa thông báo trong 7 ngày gần nhất để sinh thông báo nhắc nhở ngay khi bệnh nhân tải trang.

---

## 2. Module Notification riêng của Frontend

Module Notification ở phía frontend được tổ chức riêng biệt để đồng bộ và cập nhật thông báo tức thời tới người dùng mà không cần tải lại trang web nhờ tích hợp WebSocket.

```
frontend/src/
├── types/
│   └── notification.ts            # Kiểu dữ liệu TypeScript
├── api/
│   └── notifications/
│       ├── types.ts               # Kiểu dữ liệu Response DTO
│       └── notificationsApi.ts    # Các hàm gọi API Axios
├── mappers/
│   └── notificationMapper.ts      # Chuyển đổi Snake Case -> Camel Case
├── store/
│   └── notificationStore.ts       # Quản lý trạng thái toàn cục (Zustand)
├── realtime/
│   └── notificationsRealtime.ts   # Lắng nghe sự kiện qua Supabase Realtime
├── hooks/
│   └── useNotifications.ts        # Custom React Hook tiêu thụ dữ liệu
└── components/
    └── Topbar.tsx                 # Giao diện thông báo & điều hướng
```

### 2.1. Chi tiết Nhiệm vụ và Hoạt động của từng Thành phần

* **Định nghĩa Kiểu dữ liệu (`types/notification.ts`):**
  * Định nghĩa thực thể thông báo `Notification` sử dụng trong ứng dụng (id, type, title, message, referenceId, isRead, createdAt).
  * Phân loại các sự kiện thông báo (`access_request`, `prescription_new`, `prescription_reminder`, `emergency_token_expired`).
* **Hàm gọi API (`api/notifications/notificationsApi.ts`):**
  * Kết nối trực tiếp đến backend thông qua `apiClient`: lấy danh sách thông báo (`list()`), đánh dấu đã đọc (`markAsRead()`), và đánh dấu đã đọc tất cả (`markAllAsRead()`).
* **Ánh xạ DTO (`mappers/notificationMapper.ts`):**
  * Đảm bảo tính nhất quán của mã nguồn frontend bằng cách chuyển đổi dữ liệu thô nhận từ API (Snake Case từ DB/Python) sang định dạng Camel Case tiêu chuẩn của Javascript/TypeScript.
* **Quản lý Trạng thái (`store/notificationStore.ts`):**
  * Sử dụng thư viện **Zustand** để tạo store lưu trữ toàn cục `useNotificationStore`.
  * Quản lý số lượng thông báo chưa đọc (`unreadCount`), danh sách thông báo (`items`), trạng thái tải (`isLoading`) và lỗi (`error`).
  * Thực hiện **Optimistic Updates** (cập nhật giao diện trước, gọi API sau) khi bấm "Đánh dấu tất cả đã đọc" để mang lại cảm giác phản hồi tức thì cho người dùng.
* **Thời gian thực Realtime (`realtime/notificationsRealtime.ts`):**
  * Đăng ký một kênh kết nối WebSocket trực tiếp đến bảng `notifications` của Supabase bằng lệnh `postgres_changes` với bộ lọc `user_id = eq.{userId}` và sự kiện `INSERT`.
  * Mỗi khi backend lưu thông báo mới vào cơ sở dữ liệu, WebSocket sẽ đẩy thông tin đó lên client ngay lập tức. Client map dữ liệu và nạp thẳng vào Zustand Store để cập nhật giao diện mà không cần refresh trang.
* **Custom Hook (`hooks/useNotifications.ts`):**
  * Đóng gói các thuộc tính và hành động từ Zustand Store thành một React hook `useNotifications()` đơn giản để các Component giao diện sử dụng dễ dàng.
* **Thành phần Giao diện & Điều hướng (`components/Topbar.tsx`):**
  * Hiển thị biểu tượng hình quả chuông trên thanh Topbar cùng Badge số thông báo chưa đọc.
  * Tích hợp hàm `translateNotification` để tự động chuyển ngữ các nội dung thông báo thô từ Backend sang tiếng Việt có dấu hoàn chỉnh và dịch các Consent Scopes dễ hiểu đối với người dùng cuối.
  * Tự động điều hướng người dùng dựa theo loại thông báo khi họ nhấn vào thông báo:
    * Nhấp vào thông báo xin quyền truy cập (`access_request`) → Tự động chuyển hướng tới trang Quản lý đồng ý (`/consent`).
    * Nhấp vào thông báo đơn thuốc mới/nhắc nhở uống thuốc (`prescription_new`, `prescription_reminder`) → Tự động chuyển hướng tới trang Đơn thuốc (`/prescriptions`).
