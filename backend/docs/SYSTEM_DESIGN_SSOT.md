# Tài liệu Thiết kế Hệ thống (SSOT) - Medical Diary API (v2.1)

## 1. Tổng quan Dự án (Project Overview)
Hệ thống Backend cung cấp API cho ứng dụng Nhật ký Y tế (Medical Diary), cho phép người dùng ghi chép sức khỏe cá nhân, quản lý hồ sơ y tế chính thức, và chia sẻ dữ liệu an toàn với bác sĩ.

* **Framework:** FastAPI (Python)
* **Database & BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime)
* **Kiến trúc:** Phân chia theo Module (Domain-Driven Design)
* **Bảo mật Cốt lõi:** JWT Authentication, PostgreSQL RLS, Mã hóa `pgcrypto`, và DB Triggers.
* **Nguyên tắc Dữ liệu:** Không bao giờ Hard-delete (chỉ Soft-delete), tuân thủ nghiêm ngặt Consent Management (Quản lý sự đồng ý).

---

## 2. Các Vai trò & Quyền hạn (Roles & Permissions)

1.  **Public (Khách):**
    * Xem trang chủ dự án, endpoint `/health`.
    * Tra cứu thông tin khẩn cấp qua QR Token (Emergency Access) hợp lệ.
2.  **User (Bệnh nhân):**
    * Quản lý hồ sơ (nhóm máu, dị ứng, liên lạc khẩn cấp), cấu hình Public View (chọn hiển thị trường nào khi quét QR).
    * **3 tầng dữ liệu:**
      * *Public View:* Nhóm máu, dị ứng, SĐT khẩn cấp (User chọn trường nào hiển thị qua `privacy_settings`).
      * *Private View — Vitals:* Nhịp tim, bước chân, nhịp thở (từ smartwatch/app sức khỏe). Mặc định Private, mở qua consent.
      * *Private View — Diary:* Ghi chép cá nhân (text tự do + đánh giá triệu chứng thang 1→10).
    * **Consent Management:** Cấp quyền chi tiết (Scope-based) hoặc thu hồi (Revoke) quyền truy cập của Bác sĩ bất cứ lúc nào.
    * Xuất dữ liệu cá nhân (Export Data — JSON/PDF, tùy chọn scope).
3.  **Doctor (Bác sĩ):**
    * *(Deferred)* MFA (TOTP) — Sẽ bổ sung sau giai đoạn MVP.
    * Xin quyền truy cập (Request Access) hồ sơ của bệnh nhân.
    * Tạo và quản lý Hồ sơ y tế chính thức (Medical Records) và Đơn thuốc (Prescriptions) cho bệnh nhân đã cấp quyền.
4.  **Admin (Quản trị viên):**
    * Truy cập Dashboard qua IP Allowlist nội bộ.
    * Phê duyệt tài khoản và chứng chỉ của Bác sĩ.
    * Truy xuất Audit Logs (Nhật ký kiểm toán hệ thống).

---

## 3. Cấu trúc Thư mục Toàn dự án (Directory Structure)

Dự án được tổ chức tách biệt rõ ràng giữa cấu hình môi trường, thư viện và source code ứng dụng.

```text
medical_diary_backend/
├── .env                        # Biến môi trường (URL, Key, Secret) (KHÔNG COMMIT LÊN GIT)
├── .gitignore                  # Chặn .env, __pycache__, venv
├── .dockerignore               # Chặn copy file thừa vào Container
├── Dockerfile                  # Bản thiết kế Image (Dùng COPY cho Production)
├── docker-compose.yml          # Trạm điều khiển (Dùng VOLUMES cho Development)
├── requirements.txt            # Danh sách thư viện (fastapi, uvicorn, pydantic-settings...)
├── README.md                   # Hướng dẫn setup dự án
├── docs/                       # Tài liệu dự án (chứa file SSOT này)
│
├── app/                        # THƯ MỤC SOURCE CODE CHÍNH
│   ├── main.py                 # Entry point: Khởi tạo FastAPI, nhúng các router, gắn middleware
│   ├── core/                   # Cấu hình lõi (Load .env, cấu hình Database, Security)
│   ├── middlewares/            # Logic chạy ngầm trước/sau request (CORS, Rate Limiter)
│   ├── shared/                 # Tiện ích dùng chung (Format thời gian, Gửi Email)
│   │
│   └── modules/                # CÁC NGHIỆP VỤ CHÍNH (DOMAINS)
│       ├── auth/               # Đăng nhập, Token, Sessions, MFA
│       ├── users/              # Hồ sơ, Quyền riêng tư (JSONB), Export Data
│       ├── doctors/            # Tìm kiếm, Yêu cầu quyền truy cập
│       ├── consent/            # Lịch sử đồng ý / Thu hồi quyền
│       ├── health_metrics/     # Dữ liệu đo lường (nhịp tim, bước chân, nhịp thở)
│       ├── diaries/            # Nhật ký cá nhân (ghi chép + đánh giá triệu chứng)
│       ├── medical_records/    # Hồ sơ y tế chính thức (bác sĩ tạo)
│       ├── prescriptions/      # Đơn thuốc
│       ├── emergency/          # Cấp QR Token ngắn hạn & Truy xuất khẩn cấp
│       ├── notifications/      # Nhắc nhở, thông báo hệ thống
│       └── admin/              # Phê duyệt bác sĩ, Audit logs
│
└── supabase/                   # Chứa script quản lý DB (Chạy qua CLI Supabase)
    └── migrations/             # Chứa script tạo Bảng, DB Triggers, pgcrypto
```

---

## 4. Giải phẫu một Module (Module Anatomy)

Mỗi thư mục bên trong `app/modules/` là một "mini-app" độc lập. Nó luôn tuân thủ cấu trúc 3 file cốt lõi sau để đảm bảo Separation of Concerns (Tách biệt mối quan tâm):

1.  **`schemas.py` (Trạm kiểm lâm - Pydantic Validation):**
    * **Nhiệm vụ:** Định nghĩa cấu trúc dữ liệu đầu vào (Request) và đầu ra (Response).
    * **Đặc điểm:** Chặn đứng mọi dữ liệu sai định dạng trước khi chúng lọt vào hệ thống. Xử lý các quy tắc ràng buộc (ví dụ: `heart_rate` phải từ 30-250).
2.  **`service.py` (Nhà máy xử lý - Business Logic):**
    * **Nhiệm vụ:** Chứa "não bộ" của module. Nhận dữ liệu sạch, thực hiện các tính toán nghiệp vụ, và tương tác trực tiếp với Database (Supabase Client).
    * **Đặc điểm:** Tách biệt hoàn toàn khỏi HTTP (không nhận trực tiếp Request). Nếu sau này chuyển từ Supabase sang DB khác, chỉ cần sửa file này.
3.  **`router.py` (Nơi tiếp khách - API Controller):**
    * **Nhiệm vụ:** Khai báo các đường dẫn API (`@router.get`, `@router.post`), tiếp nhận Request, gọi hàm từ `service.py`, và trả về kết quả qua `schemas.py`.
    * **Đặc điểm:** Code phải cực kỳ mỏng. Không chứa câu lệnh truy vấn Database hay logic tính toán phức tạp.

---

## 5. Danh sách API Endpoints (API Specs)

*Lưu ý: Mọi Response lỗi đều tuân thủ format chuẩn hóa: `{ "error_code": "...", "message": "...", "request_id": "..." }`*

### 5.1. Core & Auth
* `GET /health`: Kiểm tra trạng thái hệ thống.
* `POST /auth/login`: Xác thực, trả về JWT. (Rate limit: 5 req/phút/IP).
* `POST /auth/register`: Đăng ký tài khoản (Role mặc định là User).
* `POST /auth/register/doctor`: Đăng ký tài khoản Bác sĩ (Kèm chứng chỉ `certificate_url`, cần Admin duyệt).
* `GET /auth/sessions`: Liệt kê các phiên đang đăng nhập.
* `POST /auth/revoke-all`: Đăng xuất khỏi mọi thiết bị.
* `POST /auth/mfa/setup`: *(Deferred)* Khởi tạo MFA (TOTP) cho Doctor/Admin.
* `POST /auth/mfa/verify`: *(Deferred)* Xác thực mã TOTP khi đăng nhập.

### 5.2. Users & Consent
* `GET /users/me`: Lấy thông tin cá nhân.
* `PATCH /users/me`: Cập nhật hồ sơ (nhóm máu, dị ứng, liên lạc khẩn cấp, họ tên).
* `PATCH /users/privacy`: Cập nhật cấu hình Public View (vd: `{"show_blood_type": true, "show_allergies": true, "show_emergency_contact": false}`).
* `GET /users/me/export`: Tải về dữ liệu (JSON/PDF). Hỗ trợ `?format=json|pdf&scope=profile,health_metrics,diaries,medical_records,prescriptions`.
* `GET /users/me/access-history`: Xem lịch sử ai đã truy cập dữ liệu (Đọc từ log DB).
* `GET /consent/history`: Xem danh sách Bác sĩ đang có quyền.
* `GET /consent/access-requests`: Xem danh sách yêu cầu truy cập đang chờ duyệt.
* `PATCH /consent/access-requests/{id}`: Duyệt hoặc từ chối yêu cầu truy cập của Bác sĩ.
* `POST /consent/revoke/{doctor_id}`: Rút quyền truy cập ngay lập tức.

### 5.3. Doctors & Users Search
* `GET /doctors/search-patients`: Bác sĩ tìm kiếm bệnh nhân (theo SĐT, CCCD). Chỉ trả về thông tin cơ bản.
* `GET /users/{id}`: Bác sĩ xem hồ sơ chi tiết bệnh nhân (chỉ trả về trường Public hoặc đã được cấp quyền qua Consent).
* `GET /users/search-doctors`: User tìm kiếm bác sĩ đã được duyệt (theo tên, chuyên khoa). Chỉ trả về thông tin public của bác sĩ.
* `POST /doctors/request-access`: Bác sĩ gửi yêu cầu xem dữ liệu (Rate limit: 10 req/ngày).

### 5.4. Medical Data (Health Metrics, Diaries, Records, Prescriptions)
* **Health Metrics (Dữ liệu đo lường — Private View Vitals):**
  * `POST /health-metrics`: Ghi nhận dữ liệu đo (nhịp tim, bước chân, nhịp thở).
  * `GET /health-metrics`: Lấy lịch sử đo (Hỗ trợ filter theo khoảng thời gian, pagination).
* **Diaries (Nhật ký cá nhân — Private View Diary):**
  * `POST /diaries`: Thêm nhật ký (ghi chép text + đánh giá triệu chứng 1→10).
  * `GET /diaries`: Lấy danh sách (Hỗ trợ filter, pagination).
  * `DELETE /diaries/{id}`: Soft-delete (cập nhật cột `deleted_at`).
* **Medical Records (Bác sĩ ghi nhận):**
  * `POST /medical-records`: Bác sĩ thêm chẩn đoán, xét nghiệm.
  * `GET /medical-records/{user_id}`: Bác sĩ xem hồ sơ bệnh án (cần quyền Approve).
* **Prescriptions:**
  * `POST /prescriptions`: Bác sĩ kê đơn.
  * `GET /prescriptions`: Bệnh nhân xem danh sách đơn thuốc (Hỗ trợ filter, pagination).
  * `PATCH /prescriptions/{id}/status`: User check trạng thái "đã uống thuốc".
  * `DELETE /prescriptions/{id}`: Soft-delete đơn thuốc.

### 5.5. Emergency (Truy cập khẩn cấp)
* `POST /emergency/token`: User tạo mã QR. TTL tùy chọn: phút, giờ, hoặc vĩnh viễn (`ttl_minutes = null`).
* `GET /emergency/access/{token}`: Ai quét QR cũng lấy được thông tin Public View (chỉ các trường User bật trong `privacy_settings`). Không ghi Audit Log.

### 5.6. Admin (Quản trị hệ thống)
* `GET /admin/doctors/pending`: Xem danh sách Bác sĩ đang chờ phê duyệt.
* `PATCH /admin/doctors/{id}/verify`: Phê duyệt hoặc từ chối chứng chỉ Bác sĩ.
* `GET /admin/audit-logs`: Truy xuất nhật ký kiểm toán (filter theo action, user, thời gian).

### 5.7. Notifications (Thông báo — Supabase Realtime)
* `GET /notifications`: Lấy danh sách thông báo của User (Hỗ trợ pagination).
* `PATCH /notifications/{id}/read`: Đánh dấu thông báo đã đọc.
* **Notification Types:** `access_request`, `prescription_new`, `prescription_reminder`, `emergency_token_expired`.

---

## 6. Chiến lược Database & Kiến trúc Dữ liệu

### 6.1. Bảng Dữ liệu Nhạy cảm cốt lõi
* `consent_requests` + `consent_permissions`: Quản lý phạm vi (scope) quyền truy cập giữa User và Doctor.
* `emergency_tokens`: Quản lý chu kỳ sống của mã QR khẩn cấp.
* `data_access_logs`: Bảng Audit Log tĩnh, lưu vết mọi thao tác thay đổi dữ liệu (không ghi log cho Public View).

### 6.2. Chính sách Bảo vệ Dữ liệu (Data Protection)
1.  **Soft-Delete Toàn cục:** Các bảng y tế đều có cột `deleted_at TIMESTAMPTZ`. Không thực hiện hành động DELETE cứng.
2.  **Row Level Security (RLS):** Thiết lập trực tiếp trên Supabase. Database tự động lọc dữ liệu dựa trên `auth.uid()` và trạng thái trong bảng `consent_permissions`.
3.  **Mã hóa tại Database (Encryption at Rest):** Sử dụng extension `pgcrypto`. Field nhạy cảm (CCCD, SĐT) được mã hóa/giải mã trực tiếp bằng SQL Query, bảo vệ dữ liệu khỏi cả Admin cấp cao.

### 6.3. Chiến lược Audit Log (Nhật ký Hệ thống bằng Trigger)
* **Tuyệt đối không ghi log bằng API Backend.** Mọi tác động (INSERT, UPDATE, DELETE) vào các bảng hồ sơ y tế sẽ bị bắt lại bởi **PostgreSQL Triggers**.
* Trigger tự động tạo bản ghi (bao gồm `old_data`, `new_data`, `auth.uid()`) và ném vào bảng `data_access_logs`. Điều này đảm bảo tính toàn vẹn của Log ngay cả khi database bị can thiệp qua giao diện quản lý.

---

## 7. Chiến lược Phát triển & Docker
* **Giai đoạn Dev:** Sử dụng **Docker Volumes** để đồng bộ code từ máy thật vào Container.
* **Hot-reload:** Chạy Uvicorn với cờ `--reload` để tự động cập nhật khi lưu file.
* **Database:** Kết nối trực tiếp với **Supabase Cloud** qua biến môi trường trong `.env`.

---

## 8. Vận hành & Hạ tầng (DevOps & Infra)

1.  **Quản lý Cấu hình:** Thông tin nhạy cảm (DB URL, API Keys) lưu tại `.env` và được load qua `pydantic-settings` trong `app/core/config.py`.
2.  **Rate Limiting & Validation:** Sử dụng `slowapi` trong Middleware để chống Spam/DDoS. Strict Mode của Pydantic để chống rác dữ liệu.
3.  **MFA & Security:** *(Deferred — Sẽ bổ sung sau MVP)* TOTP cho Admin/Doctor qua Supabase Auth.
4.  **Backup & Monitoring:** Hỗ trợ PITR (Point-In-Time Recovery) của Supabase. Khuyên dùng Sentry bắt exception 5xx.