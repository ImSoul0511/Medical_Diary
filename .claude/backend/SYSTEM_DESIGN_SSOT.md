---
trigger: always_on
---

# Tài liệu Thiết kế Hệ thống (SSOT) - Medical Diary API (v2.2 - Cập nhật)

## 1. Tổng quan Dự án (Project Overview)
Hệ thống Backend cung cấp API cho ứng dụng Nhật ký Y tế (Medical Diary), cho phép người dùng ghi chép sức khỏe cá nhân, quản lý hồ sơ y tế chính thức, tự tải tài liệu y tế cá nhân, và chia sẻ dữ liệu an toàn với bác sĩ.

* **Framework:** FastAPI (Python)
* **Database & BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime)
* **ORM:** SQLAlchemy 2.0 (Async) — Định nghĩa models & tương tác DB qua Python objects
* **DB Migration:** Alembic — Quản lý phiên bản schema, auto-generate từ SQLAlchemy models
* **Kiến trúc:** Phân chia theo Module (Domain-Driven Design)
* **Mô hình kết nối (Hybrid):** SQLAlchemy AsyncSession cho DB queries. Supabase Client chỉ dùng cho Auth (JWT, session), Storage (upload file chứng chỉ, tài liệu y tế), Realtime (thông báo).
* **Bảo mật Cốt lõi:** JWT Authentication, PostgreSQL RLS (kích hoạt qua `SET LOCAL` trước mỗi query), Mã hóa đối xứng `pgcrypto` cho dữ liệu nhạy cảm, và DB Triggers.
* **Nguyên tắc Dữ liệu:** Không bao giờ Hard-delete (chỉ Soft-delete qua cột `deleted_at`), tuân thủ nghiêm ngặt Consent Management (Quản lý sự đồng ý).
* **Múi giờ hệ thống (Timezone):** Áp dụng múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - UTC+7) làm chuẩn trong tính toán và lập lịch nhắc nhở uống thuốc để tránh sai lệch thời gian thực tế của bệnh nhân.

---

## 2. Các Vai trò & Quyền hạn (Roles & Permissions)

1.  **Public (Khách):**
    * Xem trang chủ dự án, endpoint `/health`.
    * Đăng nhập (`POST /auth/login`), Đăng ký người dùng thường (`POST /auth/register`), Đăng ký bác sĩ (`POST /auth/register-doctor`), Yêu cầu đặt lại mật khẩu.
    * Tra cứu thông tin khẩn cấp qua QR Token (Emergency Access) hợp lệ không cần đăng nhập.
2.  **User (Bệnh nhân):**
    * Quản lý hồ sơ (nhóm máu, dị ứng, liên lạc khẩn cấp), cấu hình Public View (chọn hiển thị trường nào khi quét QR qua `privacy_settings`).
    * **Tầng dữ liệu truy cập:**
      * *Public View:* Nhóm máu, dị ứng, SĐT khẩn cấp (User chọn hiển thị qua `privacy_settings` dạng JSONB).
      * *Private View — Vitals (Tự động):* Nhịp tim, bước chân, nhịp thở (đo từ smartwatch/app sức khỏe). Mặc định Private, mở qua consent.
      * *Private View — Health Metrics (Nhập tay):* Các chỉ số đo cá nhân nhập tay gồm huyết áp, đường huyết, SpO2, nhiệt độ cơ thể, cân nặng, chiều cao.
      * *Private View — Diary:* Ghi chép nhật ký cá nhân (text tự do + đánh giá triệu chứng thang 1→10).
      * *Private View — Medical Documents:* Tài liệu y tế/bệnh án tự tải lên (dạng ảnh, PDF).
    * **Consent Management:** Cấp quyền chi tiết (Scope-based) hoặc thu hồi (Revoke) quyền truy cập của Bác sĩ bất cứ lúc nào đối với từng loại dữ liệu (`heart_rate`, `step_count`, `respiratory_rate`, `manual_health_records`, `diaries`, `medical_records`, `prescriptions`).
    * Xuất dữ liệu cá nhân (Export Data — JSON/PDF, tùy chọn scope).
    * Quản lý trạng thái lịch uống thuốc (`taken` / `skipped` / `untaken`).
3.  **Doctor (Bác sĩ):**
    * Tìm kiếm thông tin bệnh nhân theo số điện thoại (chỉ xem được profile public tối thiểu).
    * Gửi yêu cầu truy cập (Request Access) dữ liệu của bệnh nhân.
    * Khi được bệnh nhân cấp quyền (Consent): xem chi tiết profile, lịch sử chỉ số sức khỏe tự động/nhập tay, nhật ký cá nhân, và các tài liệu tự tải lên của bệnh nhân.
    * Tạo hồ sơ y tế chính thức (Medical Records) đính kèm ảnh kết quả xét nghiệm, và tạo Đơn thuốc (Prescriptions) cho bệnh nhân đang theo dõi (Không cần bệnh nhân cấp quyền trước đối với việc tạo mới bệnh án/đơn thuốc).
    * *(Deferred)* MFA (TOTP) — Sẽ bổ sung sau giai đoạn MVP.
4.  **Admin (Quản trị viên):**
    * Phê duyệt hoặc từ chối tài khoản và chứng chỉ hành nghề của Bác sĩ.
    * Truy xuất Audit Logs hệ thống (bảng `data_access_logs`) để theo dõi vết thay đổi dữ liệu nhạy cảm.

---

## 3. Cấu trúc Thư mục Backend (Directory Structure)

```text
backend/
├── .env                        # Biến môi trường (URL, Key, Secret) (KHÔNG COMMIT LÊN GIT)
├── .gitignore                  # Chặn .env, __pycache__, venv
├── .dockerignore               # Chặn copy file thừa vào Container
├── Dockerfile                  # Thiết lập Docker Image
├── docker-compose.yml          # Cấu hình container chạy dev (dùng Volumes đồng bộ code)
├── requirements.txt            # Thư viện phụ thuộc (fastapi, sqlalchemy, alembic, slowapi, pydantic-settings...)
├── alembic.ini                 # Cấu hình Alembic database URL
├── README.md                   # Hướng dẫn setup và vận hành backend
├── docs/                       # Tài liệu hướng dẫn (alembic.md, module_implement.md)
│
├── app/                        # THƯ MỤC SOURCE CODE CHÍNH
│   ├── main.py                 # Entry point: Khởi tạo FastAPI, nhúng router, gắn middleware và exception handlers
│   ├── core/                   # Cấu hình hệ thống cốt lõi
│   │   ├── config.py           # Load cấu hình từ .env thông qua pydantic-settings (chứa ENCRYPTION_KEY)
│   │   ├── database.py         # Cấu hình SQLAlchemy AsyncEngine, AsyncSession, Base class
│   │   ├── exceptions.py       # Xử lý các exception toàn cục (HTTP, Validation, Rate Limit) kèm request_id
│   │   ├── rate_limiter.py     # Cấu hình giới hạn tần suất yêu cầu (SlowAPI)
│   │   └── security.py         # Hàm hash mật khẩu và xác thực JWT
│   ├── middlewares/            # Các Middleware xử lý trước/sau request
│   │   ├── rls.py              # Middleware thiết lập thông tin người dùng vào DB Session (SET LOCAL request.jwt.claims)
│   │   └── logging.py          # Ghi log request, đo lường thời gian xử lý và cấp request_id
│   ├── shared/                 # Tiện ích dùng chung trong toàn hệ thống
│   │   ├── consent.py          # Tiện ích kiểm tra quyền truy cập (check_consent) dựa trên bảng cấp quyền
│   │   ├── dependencies.py     # Các dependency injection (get_current_user, require_role)
│   │   ├── email.py            # Tiện ích gửi email qua Resend HTTP API (Mock ở dev, gửi qua Resend thật ở production)
│   │   └── schemas.py          # Định nghĩa cấu trúc lỗi và phản hồi chung (ErrorResponse, MessageResponse, PaginatedResponse)
│   │
│   └── modules/                # CÁC NGHIỆP VỤ CHÍNH (DOMAINS)
│       ├── auth/               # Xác thực người dùng, phiên làm việc (sessions), đổi/đặt lại mật khẩu
│       ├── users/              # Thông tin cá nhân, cập nhật settings, tìm kiếm bác sĩ, xuất dữ liệu JSON/PDF
│       ├── doctors/            # Bác sĩ tìm kiếm bệnh nhân, quản lý danh sách bệnh nhân và xin quyền truy cập
│       ├── consent/            # Quản lý yêu cầu xin quyền và danh sách quyền truy cập đã cấp/thu hồi
│       ├── health_metrics/     # Chỉ số đo lường tự động (nhịp tim, bước chân...) & chỉ số đo nhập tay (Manual)
│       ├── diaries/            # Nhật ký cá nhân tự ghi chép và đánh giá mức độ triệu chứng
│       ├── medical_records/    # Hồ sơ bệnh án của bác sĩ tạo và tài liệu y tế cá nhân do bệnh nhân tự tải lên
│       ├── prescriptions/      # Đơn thuốc, chi tiết đơn thuốc, sinh lịch trình uống thuốc, và tự động nhắc nhở uống thuốc
│       ├── emergency/          # Tạo mã QR khẩn cấp, cấp cứu viên truy xuất thông tin public, lịch sử quét QR
│       ├── notifications/      # Quản lý và thông báo realtime cho người dùng qua tích hợp Supabase Realtime
│       └── admin/              # Bảng điều khiển quản trị, duyệt bác sĩ, kiểm toán logs (DataAccessLog)
│
├── alembic/                    # Thư mục quản lý DB Migrations
│   ├── env.py                  # Cấu hình Alembic runtime kết nối DB và load tất cả Models
│   └── versions/               # Lưu trữ các file migration (auto-generated và chỉnh sửa thủ công)
│
└── supabase/                   # Chứa các file SQL cấu hình tính năng nâng cao không qua Alembic
    └── policies/               # SQL scripts cho triggers, functions, pgcrypto, pg_cron, và enable realtime
```

---

## 4. Giải phẫu một Module (Module Anatomy)

Mỗi module nghiệp vụ nằm trong `app/modules/` là một đơn vị độc lập và tuân thủ mô hình phân lớp như sau:

1.  **`models.py` (SQLAlchemy Models):**
    * Định nghĩa cấu trúc các bảng dữ liệu bằng Python class kế thừa từ `Base`.
    * Là Single Source of Truth cho DB schema, hỗ trợ Alembic phát hiện thay đổi cấu trúc tự động.
2.  **`schemas.py` (Pydantic Schemas):**
    * Định nghĩa cấu trúc dữ liệu đầu vào (Request validation) và đầu ra (Response serialization).
    * Đảm bảo tính toàn vẹn dữ liệu trước khi đi vào xử lý nghiệp vụ.
3.  **`service.py` (Business Logic Layer):**
    * Chứa mã nguồn thực thi nghiệp vụ cốt lõi của hệ thống.
    * Tương tác trực tiếp với Database qua SQLAlchemy `AsyncSession`. Hoàn toàn độc lập với các giao thức HTTP.
4.  **`router.py` (API Controller Layer):**
    * Khai báo các API endpoints (`@router.get`, `@router.post`...).
    * Tiếp nhận các yêu cầu HTTP, kiểm tra phân quyền người dùng, gọi lớp `service` xử lý, và trả về dữ liệu chuẩn hóa theo `schemas`.

---

## 5. Chi tiết danh sách API Endpoints (API Specs)

### 5.1. Authentication & Session Management (`/auth`)
* `POST /auth/login`: Xác thực tài khoản, trả về thông tin user kèm JWT `access_token` và lưu `refresh_token` vào HttpOnly cookie. (Rate limit: 100 req/phút).
* `POST /auth/refresh`: Cấp lại `access_token` mới từ `refresh_token` trong cookie.
* `POST /auth/register`: Đăng ký tài khoản người dùng thường (mặc định role = `user`). (Rate limit: 3 req/phút).
* `POST /auth/register-doctor`: Đăng ký bác sĩ. Hỗ trợ upload file chứng chỉ `certificate_file` (tối đa 5MB, định dạng PNG/JPG/JPEG/PDF) qua Multipart Form. File được tải lên Supabase Storage và trả về URL chứng chỉ. (Rate limit: 3 req/phút).
* `POST /auth/logout`: Đăng xuất, xóa refresh cookie và hủy phiên làm việc hiện tại.
* `GET /auth/sessions`: Xem danh sách tất cả các phiên đăng nhập đang hoạt động (thiết bị, IP, thời gian đăng nhập).
* `POST /auth/revoke-all`: Hủy toàn bộ các phiên làm việc đang hoạt động (yêu cầu mật khẩu).
* `POST /auth/revoke-selected-session`: Hủy một phiên làm việc cụ thể dựa trên `session_id` (yêu cầu mật khẩu).
* `POST /auth/password-reset/request`: Yêu cầu đặt lại mật khẩu gửi link qua email. (Rate limit: 3 req/phút).
* `POST /auth/forgot-password`: Yêu cầu quên mật khẩu, sinh link reset mật khẩu gửi về email của user.
* `POST /auth/change-password`: Đổi mật khẩu mới cho user đang đăng nhập.
* `POST /auth/reset-password`: Đặt lại mật khẩu mới cho user sử dụng token đặt lại.

### 5.2. Users & Consent (`/users` và `/consent`)
* `GET /users/me`: Lấy thông tin cá nhân của người dùng hiện tại.
* `PATCH /users/me`: Cập nhật thông tin profile công khai (họ tên, ngày sinh, giới tính, nhóm máu, dị ứng, liên lạc khẩn cấp).
* `PATCH /users/me/private`: Cập nhật thông tin nhạy cảm mã hóa `pgcrypto` (Số điện thoại, số CCCD).
* `PATCH /users/privacy`: Cập nhật cấu hình hiển thị thông tin khẩn cấp `privacy_settings` (dạng JSONB).
* `GET /users/me/export`: Tải file dữ liệu cá nhân dạng JSON/PDF, hỗ trợ các scope tùy chọn (`profile`, `health_metrics`, `diaries`, `medical_records`, `prescriptions`).
* `GET /users/me/access-history`: Xem nhật ký các lần bác sĩ truy cập vào dữ liệu cá nhân của mình.
* `GET /users/search-doctors`: Tìm kiếm bác sĩ đã được phê duyệt trong hệ thống theo tên hoặc chuyên khoa.
* `GET /consent/history`: Xem danh sách bác sĩ đang được cấp quyền truy cập dữ liệu của mình.
* `GET /consent/access-requests`: Xem danh sách yêu cầu truy cập dữ liệu từ bác sĩ đang chờ phê duyệt.
* `PATCH /consent/access-requests/{request_id}`: Phê duyệt hoặc từ chối yêu cầu truy cập từ bác sĩ.
* `POST /consent/revoke/{doctor_id}`: Thu hồi quyền truy cập dữ liệu của bác sĩ ngay lập tức.

### 5.3. Doctors Core (`/doctors`)
* `GET /doctors/search-patients`: Tìm kiếm bệnh nhân theo số điện thoại (chỉ trả về thông tin public cơ bản: ID, họ tên, giới tính).
* `GET /doctors/patients`: Liệt kê danh sách bệnh nhân đang quản lý (đã được phê duyệt quyền truy cập).
* `GET /doctors/patients/{patient_id}`: Xem chi tiết thông tin y tế của bệnh nhân (dữ liệu trả về được lọc tự động dựa theo các scope được cấp trong bảng `consent_permissions`).
* `GET /doctors/patients/{patient_id}/public`: Xem thông tin công khai của bệnh nhân (nhóm máu, dị ứng, thông tin liên hệ khẩn cấp tùy chọn) mà không cần được cấp quyền.
* `POST /doctors/request-access`: Gửi yêu cầu xin quyền truy cập thông tin của bệnh nhân cụ thể. (Rate limit: 10 req/ngày).
* `POST /doctors/patients/{patient_id}/unfollow`: Bác sĩ chủ động ngừng theo dõi và quản lý hồ sơ của bệnh nhân.

### 5.4. Health Metrics (`/health-metrics`)
* **Chỉ số đo tự động (Vitals):**
  * `POST /health-metrics`: Ghi nhận dữ liệu đo tự động (nhịp tim, bước chân, nhịp thở) từ thiết bị đeo thông minh.
  * `GET /health-metrics`: Lấy lịch sử chỉ số sức khỏe tự động. Bác sĩ chỉ xem được nếu bệnh nhân truyền `patient_id` và có consent scope tương ứng (`heart_rate`, `step_count`, `respiratory_rate`).
* **Chỉ số nhập tay (Manual Records):**
  * `POST /health-metrics/manual`: Ghi nhận chỉ số sức khỏe nhập tay. Hỗ trợ các loại chỉ số: huyết áp (`blood_pressure`), đường huyết (`blood_glucose`), SpO2 (`spo2`), nhiệt độ cơ thể (`body_temperature`), cân nặng (`weight`), chiều cao (`height`). Trường dữ liệu được thiết kế động thông qua JSONB payload.
  * `GET /health-metrics/manual`: Xem lịch sử chỉ số nhập tay. Bác sĩ xem cần consent scope `manual_health_records`.
  * `DELETE /health-metrics/manual/{record_id}`: Xóa bản ghi chỉ số nhập tay (soft-delete).

### 5.5. Personal Diaries (`/diaries`)
* `POST /diaries`: Tạo ghi chép nhật ký cá nhân mới gồm ghi chú text tự do và đánh giá mức độ nghiêm trọng của triệu chứng (1-10).
* `GET /diaries`: Lấy danh sách ghi chép nhật ký. Bác sĩ xem của bệnh nhân cần truyền `patient_id` và có consent scope `diaries`.
* `DELETE /diaries/{diary_id}`: Xóa ghi chép nhật ký (soft-delete).

### 5.6. Official Medical Records & Documents (`/medical-records`)
* **Hồ sơ bệnh án chính thức (Bác sĩ tạo):**
  * `POST /medical-records`: Bác sĩ tạo hồ sơ bệnh chẩn đoán y tế chính thức (chẩn đoán, hướng điều trị, đính kèm kết quả xét nghiệm). Cho phép tạo mà không cần bệnh nhân cấp quyền trước.
  * `GET /medical-records/me`: Bệnh nhân xem toàn bộ bệnh án do các bác sĩ tạo cho mình.
  * `GET /medical-records/{patient_id}`: Bác sĩ xem bệnh án của bệnh nhân (yêu cầu consent scope `medical_records`).
  * `POST /medical-records/upload-attachment/{patient_id}`: Bác sĩ tải lên tài liệu đính kèm (ảnh, PDF kết quả xét nghiệm) cho hồ sơ bệnh án của bệnh nhân.
* **Tài liệu y tế cá nhân tự tải (Bệnh nhân upload):**
  * `POST /medical-records/documents/upload`: Bệnh nhân tải file tài liệu y khoa cá nhân của mình lên hệ thống.
  * `GET /medical-records/documents/me`: Bệnh nhân xem danh sách tài liệu cá nhân đã tải của mình.
  * `GET /medical-records/documents/patient/{patient_id}`: Bác sĩ xem danh sách tài liệu y tế cá nhân tự tải của bệnh nhân (cần consent scope `medical_records`).
  * `DELETE /medical-records/documents/{document_id}`: Bệnh nhân xóa tài liệu cá nhân tự tải (soft-delete).

### 5.7. Prescriptions & Medication Logs (`/prescriptions` và `/prescription-logs`)
* `POST /prescriptions`: Bác sĩ khởi tạo đơn thuốc mới cho bệnh nhân (không cần bệnh nhân cấp quyền trước).
* `POST /prescriptions/{prescription_id}/items`: Bác sĩ thêm từng loại thuốc vào đơn. Hỗ trợ 2 chế độ:
  1. *Tự động:* Bác sĩ cung cấp `duration_days` và mảng giờ uống `scheduled_times` -> Trình kích hoạt cơ sở dữ liệu (Database Trigger) tự động sinh danh sách lịch uống thuốc `prescription_logs` tương ứng.
  2. *Thủ công:* Bác sĩ cung cấp danh sách cụ thể các ngày giờ uống thuốc `custom_logs` -> Backend tự sinh lịch trình theo danh sách bác sĩ chỉ định.
* `GET /prescriptions`: Bệnh nhân xem danh sách đơn thuốc kèm chi tiết các loại thuốc uống của mình.
* `GET /prescriptions/patient/{patient_id}`: Bác sĩ xem danh sách đơn thuốc của bệnh nhân (cần consent scope `prescriptions`).
* `DELETE /prescriptions/{prescription_id}`: Bác sĩ xóa đơn thuốc của mình kê (soft-delete).
* `GET /prescription-logs`: Bệnh nhân xem chi tiết danh sách lịch uống thuốc của đơn.
* `PATCH /prescription-logs/{log_id}`: Bệnh nhân cập nhật trạng thái uống thuốc của cữ (`taken`, `skipped`, `untaken`). Nếu chuyển sang `taken`, trường `taken_at` tự động ghi nhận thời gian thực hiện.
* `POST /prescriptions/internal/send-reminders`: **[Internal API]** Gọi bởi database cron job để quét các cữ uống thuốc đã đến giờ/quá giờ trong vòng 2 giờ qua mà chưa gửi thông báo, tiến hành thêm thông báo hệ thống và đưa tác vụ gửi email vào hàng đợi ngầm (FastAPI BackgroundTasks) để phản hồi tức thì cho Cron Job mà không bị timeout. Xác thực qua Header `X-Internal-Token` đối chiếu trực tiếp với `JWT_SECRET`.

### 5.8. Emergency Access (`/emergency`)
* `POST /emergency/token`: Tạo mã QR khẩn cấp với thời gian hết hạn cụ thể (`ttl_minutes`) hoặc mã QR vĩnh viễn (dùng in thẻ đeo).
* `GET /emergency/tokens`: Danh sách các mã QR đã tạo và tình trạng hiệu lực.
* `PATCH /emergency/tokens/{token_id}`: Cập nhật thời gian hết hạn (TTL) của mã QR khẩn cấp.
* `DELETE /emergency/tokens/{token_id}`: Vô hiệu hóa mã QR khẩn cấp (soft-delete).
* `GET /emergency/access/{token}`: **[Public API]** Cấp cứu viên quét mã QR truy xuất thông tin y tế tối thiểu (nhóm máu, dị ứng, liên lạc khẩn cấp) được quy định trong `privacy_settings` của người dùng. Mỗi lần truy cập thành công sẽ tự động lưu lại thông tin vết (thời gian, IP, User-Agent) vào bảng `emergency_access_logs`.
* `GET /emergency/tokens/history`: Bệnh nhân xem lịch sử các lần mã QR của mình được quét.

### 5.9. Notifications Panel (`/notifications`)
* `GET /notifications`: Danh sách thông báo cá nhân, sắp xếp mới nhất lên đầu.
* `PATCH /notifications/{id}/read`: Đánh dấu thông báo cụ thể là đã đọc.
* `POST /notifications/read-all`: Đánh dấu toàn bộ thông báo là đã đọc.

### 5.10. Administration Panel (`/admin`)
* `GET /admin/doctors/pending`: Xem danh sách tài khoản bác sĩ đang chờ phê duyệt.
* `GET /admin/doctors`: Xem danh sách tất cả bác sĩ trong hệ thống (lọc theo trạng thái xác minh).
* `PATCH /admin/doctors/{doctor_id}/verify`: Admin phê duyệt hoặc bác bỏ hồ sơ bác sĩ (ghi nhận thêm ghi chú xác minh).
* `GET /admin/audit-logs`: Xem nhật ký kiểm toán hệ thống (phân trang, hỗ trợ lọc nâng cao theo hành động, user_id, khoảng thời gian).

---

## 6. Chiến lược Cơ sở dữ liệu & Kiến trúc Dữ liệu

### 6.1. Nguyên tắc Xóa mềm (Soft-Delete)
Hệ thống tuân thủ nghiêm ngặt nguyên tắc lưu trữ dữ liệu y khoa: **Tuyệt đối không sử dụng lệnh DELETE cứng.**
Tất cả các bảng dữ liệu nghiệp vụ quan trọng đều tích hợp cột `deleted_at TIMESTAMPTZ`. Khi thực hiện xóa, hệ thống chỉ cập nhật thời gian xóa tại cột này. Toàn bộ các truy vấn lấy dữ liệu mặc định chỉ lấy các bản ghi có `deleted_at IS NULL`.

### 6.2. Row Level Security (RLS) & Hybrid Model
Hệ thống sử dụng cơ chế bảo mật RLS trực tiếp trên cơ sở dữ liệu Supabase:
* Mọi thao tác truy cập dữ liệu đều phải qua kiểm tra quyền sở hữu hoặc được bệnh nhân cấp quyền (dựa trên bảng `consent_permissions`).
* Vì hệ thống sử dụng kết hợp (Hybrid Model): SQLAlchemy AsyncSession kết nối trực tiếp PostgreSQL và Supabase Client chỉ gọi Auth/Storage. Để đảm bảo chính sách RLS hoạt động đồng nhất trên các câu lệnh SQLAlchemy, hệ thống sử dụng một **RLS Middleware**:
  * Trước khi thực thi bất kỳ câu lệnh SQL nào của một request, middleware phân tích JWT token lấy ra thông tin người dùng và chạy câu lệnh `SET LOCAL request.jwt.claims = '{...}'` trong cùng transaction. Điều này giúp database engine nhận diện chính xác danh tính người thực hiện thao tác và áp dụng các chính sách RLS tương ứng.

### 6.3. Mã hóa Dữ liệu Nhạy cảm cốt lõi (pgcrypto)
Các trường dữ liệu cực kỳ nhạy cảm như **Số điện thoại** (`phone_encrypted`) và **Số định danh CCCD** (`cccd_encrypted`) trong bảng `profiles` được mã hóa đối xứng trực tiếp trong Database qua extension `pgcrypto`:
* **Phương thức mã hóa:** Sử dụng hàm `pgp_sym_encrypt(data, key)` khi thêm/sửa và hàm `pgp_sym_decrypt(data::bytea, key)` khi truy vấn.
* **Quản lý khóa (Key Management):** Khóa mã hóa `ENCRYPTION_KEY` được cấu hình tại biến môi trường `.env` của FastAPI backend. Khóa này được nạp cục bộ vào từng transaction bằng câu lệnh `set_config('app.encryption_key', key, true)` trong dependency `get_db()`. Khóa chỉ tồn tại trong vòng đời của transaction đó, đảm bảo an toàn tối đa cho dữ liệu.

### 6.4. Database Triggers (Bảo vệ tính toàn vẹn)
* **Prescription Logs Trigger (`trg_generate_prescription_logs`):** Khi bác sĩ thêm một loại thuốc (`prescription_item`) ở chế độ tự động, trigger này tự động tính toán và sinh ra các bản ghi lịch uống thuốc tương ứng trên bảng `prescription_logs` dựa theo số ngày (`duration_days`) và mảng khung giờ (`scheduled_times`).
* **Audit Log Trigger (`trg_audit_log`):** Tự động ghi nhận mọi sự thay đổi dữ liệu nhạy cảm (INSERT, UPDATE, DELETE) của các bảng y khoa vào bảng tĩnh `data_access_logs`. Quá trình lưu vết được thực hiện hoàn toàn ở tầng DB thông qua Trigger nên đảm bảo tính khách quan và không thể bị sửa đổi hay vượt qua bởi logic ở backend API.

### 6.5. Tự động hóa Lập lịch bằng Railway Cron Service & Resend
Hệ thống tích hợp lập lịch tác vụ tự động gửi email nhắc nhở uống thuốc định kỳ:
* Sử dụng dịch vụ `Railway Cron Service` chạy một container chuyên biệt lập lịch thực thi script `cron_trigger.py` mỗi 5 phút một lần (`*/5 * * * *`).
* Script `cron_trigger.py` thực hiện cuộc gọi HTTP POST đến endpoint nội bộ `/prescriptions/internal/send-reminders` trên FastAPI backend kèm theo token bảo mật xác thực trong Header `X-Internal-Token`.
* Logic xử lý tại backend sẽ quét các cữ uống chưa thực hiện, đối chiếu thời gian theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), gửi email thông báo qua Resend API và lưu thông báo hệ thống.

---

## 7. Giải quyết sai lệch Múi giờ (Vietnam Timezone)
Để đảm bảo bệnh nhân nhận được thông báo nhắc nhở uống thuốc chính xác theo giờ sinh hoạt thực tế tại Việt Nam:
* Mọi cấu hình thời gian uống thuốc (`scheduled_time` dạng `TIME`) và ngày bắt đầu uống thuốc (`start_date` dạng `DATE`) đều được lưu trữ không chứa thông tin múi giờ cố định để tối ưu hóa việc đối chiếu theo múi giờ địa phương.
* Khi thực hiện tác vụ tự động quét và gửi email nhắc nhở trong database, hệ thống sử dụng mệnh đề:
  `pl.scheduled_date + pl.scheduled_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')`
  Giúp ép kiểu múi giờ máy chủ Supabase Cloud (mặc định là UTC) về đúng múi giờ Việt Nam (UTC+7) để so sánh chuẩn xác nhất, loại bỏ hoàn toàn việc lệch giờ nhắc nhở của bệnh nhân.

---

## 8. Vận hành & Hạ tầng (DevOps & Infrastructure)
1.  **Quản lý cấu hình:** Sử dụng file `.env` chứa toàn bộ URL kết nối, khóa JWT_SECRET, khóa ENCRYPTION_KEY, biến `RESEND_API_KEY`, và cấu hình SMTP/Resend email. Lớp cấu hình `Settings` (`app/core/config.py`) sử dụng thư viện `pydantic-settings` để tự động map biến môi trường vào hệ thống.
2.  **Giới hạn tần suất (Rate Limiting):** Sử dụng thư viện `slowapi` bảo vệ các endpoint quan trọng như login, register, request-access, và quét mã QR khẩn cấp trước các nguy cơ tấn công từ chối dịch vụ (DDoS) hoặc spam dữ liệu.
3.  **Realtime Notifications (Supabase Realtime):** Bảng `notifications` được cấu hình bật tính năng Realtime. Khi backend thực hiện thêm mới thông báo, Supabase Cloud tự động broadcast payload thông báo mới qua giao thức WebSocket trực tiếp đến client (frontend) đang online để hiển thị pop-up/toast lập tức, giảm tải gánh nặng polling liên tục cho backend.
4.  **Dịch vụ gửi Email (Resend HTTP API & Background Tasks):** Thay thế giao thức SMTP truyền thống bằng Resend HTTP API (qua cổng bảo mật 443) nhằm tránh các chính sách chặn cổng kết nối (25, 465, 587) từ các nhà cung cấp Cloud như Railway. Tích hợp FastAPI `BackgroundTasks` giúp thực thi tác vụ gửi thư ngầm bên dưới mà không làm nghẽn hoặc quá hạn (Timeout) các yêu cầu HTTP từ Cron Job hay Client.

---
trigger: always_on
---