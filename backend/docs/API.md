---
trigger: always_on
---

# Tài liệu Đặc tả API (API Specifications) - Medical Diary

Tài liệu này định nghĩa cấu trúc Request và Response cho toàn bộ các Endpoint trong hệ thống.

> **Lưu ý quan trọng:** Tài liệu này cung cấp danh sách Endpoints và các **Request/Response mẫu (Sample)**. Các ví dụ JSON trong tài liệu chỉ mang tính chất minh họa. Để xem chi tiết về cấu trúc dữ liệu, các ràng buộc (validation), và thông tin mặc định, vui lòng tham khảo `SCHEMAS.md` và `DB_SCHEMAS.md`.

## Quy chuẩn chung (Global Standards)

### 1. Headers mặc định
Hầu hết các API (trừ Auth và Public) đều yêu cầu Header xác thực:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### 2. Format Trả về Lỗi (Standard Error Response)
Mọi lỗi (400, 401, 403, 404, 422, 500) đều phải tuân thủ format này:
```json
{
  "error_code": "STRING_CODE_BẬC_CAO",
  "message": "Mô tả lỗi chi tiết cho người dùng/developer",
  "request_id": "uuid-của-request-để-trace-log"
}
```

---

## 1. Module: Core & Auth (`/auth`)

### 1.1 Đăng nhập
* **Endpoint:** `POST /auth/login`
* **Auth:** Public
* **Rate Limit:** 5 req/min/IP
* **Body:**
  ```json
  {
    "email": "test@example.com",
    "password": "securepassword123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbG...",
    "token_type": "bearer",
    "user": {
      "id": "uuid",
      "role": "user",
      "email": "test@example.com"
    }
  }
  ```

### 1.2 Đăng ký (Role mặc định là User)
* **Endpoint:** `POST /auth/register`
* **Auth:** Public
* **Body:**
  ```json
  {
    "email": "test@example.com",
    "phone_number": "0987654321",
    "password": "securepassword123",
    "full_name": "Nguyen Khai",
    "date_of_birth": "1990-01-01",
    "gender": "NAM"
  }
  ```
* **Response (201 Created):** Trả về thông tin user (không kèm token, yêu cầu login lại).

### 1.3 Đăng xuất thiết bị hiện tại
* **Endpoint:** `POST /auth/logout`
* **Auth:** Bắt buộc
* **Body:** Trống
* **Response (200 OK):** `{ "message": "Logged out successfully" }`

### 1.4 Hủy toàn bộ phiên đăng nhập
* **Endpoint:** `POST /auth/revoke-all`
* **Auth:** Bắt buộc
* **Body:**
  ```json
  {
    "password": "securepassword123"
  }
  ```
* **Response (200 OK):** `{ "message": "Đã thu hồi tất cả phiên đăng nhập." }`

### 1.5 Liệt kê các phiên hoạt động
* **Endpoint:** `GET /auth/sessions`
* **Auth:** Bắt buộc
* **Response (200 OK):**
  ```json
  {
    "sessions": [
      {
        "session_id": "uuid",
        "user_id": "uuid",
        "created_at": "2026-04-24T12:00:00Z",
        "updated_at": "2026-04-24T12:00:00Z",
        "user_agent": "Chrome on Windows",
        "ip": "192.168.1.1"
      }
    ]
  }
  ```

### 1.6 Hủy một phiên đăng nhập cụ thể
* **Endpoint:** `POST /auth/revoke-selected-session`
* **Auth:** Bắt buộc (Role: Doctor/Admin)
* **Body:**
  ```json
  {
    "session_id": "uuid-cua-session-can-xoa",
    "password": "securepassword123"
  }
  ```
* **Response (200 OK):** `{ "message": "Đã thu hồi phiên đăng nhập." }`

### 1.7 Đăng ký tài khoản Bác sĩ
* **Endpoint:** `POST /auth/register-doctor`
* **Auth:** Public
* **Body:** `multipart/form-data`
  ```text
  email: doctor@example.com
  phone_number: 0987654321
  password: securepassword123
  full_name: Dr. Tran Van A
  date_of_birth: 1990-01-01
  gender: NAM
  cccd: 012345678901
  license_number: BS-2026-001
  specialty: Cardiology
  hospital: HCMUS Medical Center
  certificate_file: <File_binary>
  ```
* **Response (201 Created):**
  ```json
  {
    "id": "uuid",
    "full_name": "Dr. Tran Van A",
    "status": "pending_verification",
    "certificate_url": "https://supabase.co/storage/certificates/uuid.jpg"
  }
  ```
  Cần Admin duyệt trước khi được hoạt động.

### 1.8 Khởi tạo MFA (TOTP) *(Deferred)*
* **Endpoint:** `POST /auth/mfa/setup`
* **Auth:** Bắt buộc (Role: Doctor/Admin)
* **Trạng thái:** Tạm vô hiệu hóa, sẽ bổ sung sau giai đoạn MVP.

### 1.8 Xác thực mã TOTP *(Deferred)*
* **Endpoint:** `POST /auth/mfa/verify`
* **Auth:** Bắt buộc
* **Trạng thái:** Tạm vô hiệu hóa, sẽ bổ sung sau giai đoạn MVP.

---

## 2. Module: Users & Consent (`/users`, `/consent`)

### 2.1 Lấy thông tin cá nhân
* **Endpoint:** `GET /users/me`
* **Auth:** Bắt buộc
* **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "full_name": "Nguyen Khai",
    "gender": "NAM",
    "date_of_birth": "1990-01-01",
    "blood_type": "O+",
    "allergies": "Penicillin",
    "emergency_contact": "0123456789",
    "privacy_settings": {
      "show_blood_type": true,
      "show_allergies": true,
      "show_emergency_contact": false
    }
  }
  ```

### 2.2 Cập nhật cấu hình Public View
* **Endpoint:** `PATCH /users/privacy`
* **Auth:** Bắt buộc
* **Body:**
  ```json
  {
    "show_blood_type": true,
    "show_allergies": true,
    "show_emergency_contact": false
  }
  ```
* **Response (200 OK):** Trả về object `privacy_settings` đã cập nhật.

### 2.3 Xem danh sách bác sĩ đang có quyền
* **Endpoint:** `GET /consent/history`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):**
  ```json
  [
    {
      "doctor_id": "uuid",
      "doctor_name": "Dr. Tran",
      "scope": ["heart_rate", "prescriptions"],
      "granted_at": "2026-04-20T10:00:00Z"
    }
  ]
  ```

### 2.4 Rút quyền truy cập của bác sĩ
* **Endpoint:** `POST /consent/revoke/{doctor_id}`
* **Auth:** Bắt buộc (Role: User)
* **Body:** Trống
* **Response (200 OK):** `{ "message": "Access revoked successfully" }`

### 2.5 Xuất dữ liệu cá nhân (Export)
* **Endpoint:** `GET /users/me/export?format=json&scope=profile,diaries,medical_records,prescriptions`
* **Auth:** Bắt buộc
* **Query Params:**
  * `format`: `json` (mặc định) hoặc `pdf`
  * `scope`: Danh sách phần dữ liệu cần xuất, phân cách bằng dấu phẩy. Giá trị hợp lệ: `profile`, `health_metrics`, `diaries`, `medical_records`, `prescriptions`.
* **Response (200 OK):**
  * **Headers:** `Content-Disposition: attachment; filename="medical_export.json"` (hoặc `.pdf`)
  * **Body:** File chứa dữ liệu đã chọn.

### 2.6 Xem lịch sử truy cập (Ai đã xem hồ sơ của tôi?)
* **Endpoint:** `GET /users/me/access-history`
* **Auth:** Bắt buộc
* **Response (200 OK):** (Đọc trực tiếp từ bảng `data_access_logs`)
  ```json
  [
    {
      "doctor_name": "Dr. Tran",
      "action": "SELECT",
      "data_type": "medical_records",
      "accessed_at": "2026-04-24T10:15:00Z"
    }
  ]
  ```

### 2.7 Xem danh sách yêu cầu truy cập đang chờ
* **Endpoint:** `GET /consent/access-requests`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):**
  ```json
  [
    {
      "request_id": "uuid",
      "doctor_id": "uuid",
      "doctor_name": "Dr. Tran",
      "requested_scope": ["medical_records", "prescriptions"],
      "reason": "Khám định kỳ",
      "status": "pending",
      "requested_at": "2026-04-24T09:00:00Z"
    }
  ]
  ```

### 2.8 Duyệt / Từ chối yêu cầu truy cập
* **Endpoint:** `PATCH /consent/access-requests/{id}`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "action": "approved",
    "approved_scope": ["medical_records", "heart_rate"] 
  }
  ```
  *Giá trị hợp lệ của `action`: `"approved"` hoặc `"rejected"`.*
  *Nếu `action` là `"approved"`, user có thể truyền `approved_scope` (là tập con của `requested_scope`) để chọn cụ thể những quyền muốn cấp.*
* **Response (200 OK):** `{ "message": "Access request approved successfully" }`

### 2.9 Cập nhật thông tin hồ sơ cá nhân
* **Endpoint:** `PATCH /users/me`
* **Auth:** Bắt buộc
* **Body:**
  ```json
  {
    "full_name": "Nguyen Van B",
    "gender": "NAM",
    "date_of_birth": "1990-01-01",
    "blood_type": "AB+",
    "allergies": "Aspirin",
    "emergency_contact": "0909123456"
  }
  ```
  *Tất cả các trường đều Optional. Chỉ truyền trường cần cập nhật.*
* **Response (200 OK):** Trả về `UserProfileResponse` đã cập nhật.

---

## 3. Module: Doctors & Users Search (`/doctors`, `/users`)

### 3.1 Bác sĩ tìm kiếm bệnh nhân
* **Endpoint:** `GET /doctors/search-patients?phone=0987654321&cccd=012345678912`
* **Auth:** Bắt buộc (Role: Doctor)
* **Response (200 OK):** Chỉ trả về thông tin cơ bản.
  ```json
  [
    {
      "id": "uuid",
      "full_name": "Nguyen Khai"
    }
  ]
  ```

### 3.2 Bác sĩ xem hồ sơ chi tiết của bệnh nhân
* **Endpoint:** `GET /users/{id}`
* **Auth:** Bắt buộc (Role: Doctor)
* **Response (200 OK):** Chỉ trả về những trường mà bệnh nhân cấu hình hiển thị Public (trong `privacy_settings`) HOẶC bác sĩ đã được cấp quyền qua Consent.
  ```json
  {
    "id": "uuid",
    "full_name": "Nguyen Khai",
    "blood_type": "O+",
    "allergies": "Penicillin"
    // emergency_contact sẽ bị ẩn nếu không public và bác sĩ không có quyền
  }
  ```

### 3.3 User tìm kiếm bác sĩ
* **Endpoint:** `GET /users/search-doctors?name=Tran&specialty=Cardiology`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):** Chỉ trả về thông tin public của bác sĩ.
  ```json
  [
    {
      "id": "uuid",
      "full_name": "Dr. Tran Van A",
      "specialty": "Cardiology",
      "hospital": "HCMUS Medical Center"
    }
  ]
  ```

### 3.4 Bác sĩ xin quyền truy cập
* **Endpoint:** `POST /doctors/request-access`
* **Auth:** Bắt buộc (Role: Doctor)
* **Rate Limit:** 10 req/day
* **Body:**
  ```json
  {
    "patient_id": "uuid_của_bệnh_nhân",
    "requested_scope": ["medical_records", "prescriptions", "blood_type"],
    "reason": "Khám định kỳ"
  }
  ```
* **Response (201 Created):** `{ "status": "pending", "message": "Request sent to patient" }`

---

## 4. Module: Medical Data (`/health-metrics`, `/diaries`, `/medical-records`, `/prescriptions`)

### 4.1 Ghi nhận dữ liệu đo lường (Health Metrics)
* **Endpoint:** `POST /health-metrics`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "heart_rate": 72,
    "step_count": 8500,
    "respiratory_rate": 16,
    "recorded_at": "2026-04-24T07:30:00Z"
  }
  ```
* **Response (201 Created):** Trả về bản ghi kèm `id` và `created_at`.

### 4.2 Lấy lịch sử đo lường
* **Endpoint:** `GET /health-metrics?page=1&limit=10&date_from=2026-04-01&date_to=2026-04-24&patient_id={uuid}`
* **Auth:** Bắt buộc (Chủ sở hữu hoặc Bác sĩ có quyền)
* **Ghi chú:** Truyền `patient_id` nếu bác sĩ muốn xem dữ liệu của bệnh nhân.
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "heart_rate": 72,
        "step_count": 8500,
        "respiratory_rate": 16,
        "recorded_at": "2026-04-24T07:30:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 10
  }
  ```

### 4.3 Thêm nhật ký sức khỏe (Diary)
* **Endpoint:** `POST /diaries`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "content": "Hôm nay thấy hơi chóng mặt sau khi tập thể dục",
    "symptoms": [
      { "name": "Đau đầu", "severity": 7 },
      { "name": "Chóng mặt", "severity": 4 }
    ]
  }
  ```
  *`content` và `symptoms` đều là Optional, nhưng ít nhất phải có một trong hai.*
* **Response (201 Created):** Trả về bản ghi vừa tạo kèm `id` và `created_at`.

### 4.4 Lấy danh sách nhật ký
* **Endpoint:** `GET /diaries?page=1&limit=10&date_from=2026-04-01&patient_id={uuid}`
* **Auth:** Bắt buộc (Chủ sở hữu hoặc Bác sĩ có quyền)
* **Ghi chú:** Truyền `patient_id` nếu bác sĩ muốn xem nhật ký của bệnh nhân.
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "content": "Hôm nay thấy hơi chóng mặt",
        "symptoms": [
          { "name": "Đau đầu", "severity": 7 }
        ],
        "created_at": "2026-04-24T08:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
  ```

### 4.5 Xóa mềm (Soft-delete) nhật ký
* **Endpoint:** `DELETE /diaries/{id}`
* **Auth:** Bắt buộc (Chủ sở hữu)
* **Response (204 No Content)**

### 4.6 Bác sĩ tạo hồ sơ y tế
* **Endpoint:** `POST /medical-records`
* **Auth:** Bắt buộc (Role: Doctor) - *Không cần bệnh nhân cấp quyền (consent)*
* **Body:**
  ```json
  {
    "patient_id": "uuid",
    "diagnosis": "Viêm họng cấp",
    "notes": "Cần theo dõi nhiệt độ",
    "attachments": ["[https://supabase.co/storage/file.jpg](https://supabase.co/storage/file.jpg)"]
  }
  ```
* **Response (201 Created)**

### 4.7 Bác sĩ tạo vỏ đơn thuốc (Group)
* **Endpoint:** `POST /prescriptions`
* **Auth:** Bắt buộc (Role: Doctor) - *Không cần bệnh nhân cấp quyền (consent)*
* **Body:**
  ```json
  {
    "patient_id": "uuid",
    "notes": "Đơn thuốc điều trị viêm họng"
  }
  ```
* **Response (201 Created):** Trả về bản ghi đơn thuốc kèm `id`.

### 4.8 Bác sĩ thêm từng loại thuốc vào đơn
* **Endpoint:** `POST /prescriptions/{id}/items`
* **Auth:** Bắt buộc (Role: Doctor)
* **Ghi chú:** Khi thêm loại thuốc, hệ thống tự động tạo các bản ghi `prescription_logs` tương ứng `duration_days` x `scheduled_times`.
* **Body:**
  ```json
  {
    "medication_name": "Paracetamol 500mg",
    "dosage": "1 viên/lần, uống sau khi ăn",
    "duration_days": 5,
    "scheduled_times": ["08:00", "13:00", "20:00"]
  }
  ```
* **Response (201 Created)**

### 4.9 Bệnh nhân xem danh sách đơn thuốc
* **Endpoint:** `GET /prescriptions?page=1&limit=10`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "patient_id": "uuid",
        "doctor_id": "uuid",
        "doctor_name": "Dr. Tran",
        "notes": "Đơn thuốc điều trị viêm họng",
        "items": [
          {
            "id": "uuid",
            "medication_name": "Paracetamol 500mg",
            "dosage": "1 viên/lần",
            "duration_days": 5,
            "scheduled_times": ["08:00", "13:00", "20:00"]
          }
        ],
        "created_at": "2026-04-24T10:00:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10
  }
  ```

### 4.10 Xem lịch sử uống thuốc theo đơn
* **Endpoint:** `GET /prescription-logs?prescription_id={id}`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "prescription_item_id": "uuid",
      "medication_name": "Paracetamol 500mg",
      "scheduled_date": "2026-04-24",
      "scheduled_time": "08:00",
      "status": "untaken",
      "taken_at": null
    }
  ]
  ```

### 4.11 User cập nhật trạng thái uống thuốc của 1 cữ
* **Endpoint:** `PATCH /prescription-logs/{log_id}`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "status": "taken",
    "taken_at": "2026-04-24T08:00:00Z"
  }
  ```
  *Trạng thái hỗ trợ: `taken`, `skipped`, `untaken` (dùng để hoàn tác).*
* **Response (200 OK)**

### 4.12 Xóa mềm (Soft-delete) đơn thuốc
* **Endpoint:** `DELETE /prescriptions/{id}`
* **Auth:** Bắt buộc (Role: Doctor - chủ sở hữu đơn)
* **Response (204 No Content)**

---

## 5. Module: Emergency (`/emergency`)

### 5.1 Bệnh nhân tạo mã QR khẩn cấp
* **Endpoint:** `POST /emergency/token`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "ttl_minutes": 30
  }
  ```
  *Truyền `null` hoặc bỏ trống để tạo mã QR vĩnh viễn (dùng để in ra mang theo)*
* **Response (201 Created):**
  ```json
  {
    "emergency_token": "emg_xyz789...",
    "expires_at": "2026-04-24T12:30:00Z"
  }
  ```
  *`expires_at` sẽ là `null` nếu token vĩnh viễn*

### 5.2 Quản lý mã QR khẩn cấp
* `GET /emergency/tokens`: Bệnh nhân lấy danh sách mã QR đã tạo.
* `PATCH /emergency/tokens/{id}`: Sửa thời hạn (TTL) của mã QR (`ttl_minutes: 60`).
* `DELETE /emergency/tokens/{id}`: Xóa mềm (vô hiệu hóa) mã QR.
* `GET /emergency/tokens/history`: Xem lịch sử ai đã quét mã QR nào, lúc nào.

### 5.3 Truy cập khẩn cấp (Dành cho cấp cứu viên)
* **Endpoint:** `GET /emergency/access/{token}`
* **Auth:** Public
* **Response (200 OK):** Trả về thông tin Public View của bệnh nhân (chỉ các trường User bật trong `privacy_settings`).
  ```json
  {
    "full_name": "Nguyen Khai",
    "blood_type": "O+",
    "allergies": "Penicillin",
    "emergency_contact": "0123456789"
  }
  ```

---

## 6. Module: Admin (`/admin`)

### 6.1 Xem danh sách Bác sĩ chờ duyệt
* **Endpoint:** `GET /admin/doctors/pending`
* **Auth:** Bắt buộc (Role: Admin, IP Allowlist)
* **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "full_name": "Dr. Tran Van A",
      "email": "dr.tran@example.com",
      "specialty": "Cardiology",
      "license_number": "BS-2026-001",
      "registered_at": "2026-04-23T14:00:00Z",
      "status": "pending_verification"
    }
  ]
  ```

### 6.2 Phê duyệt / Từ chối Bác sĩ
* **Endpoint:** `PATCH /admin/doctors/{id}/verify`
* **Auth:** Bắt buộc (Role: Admin)
* **Body:**
  ```json
  {
    "action": "approved",
    "notes": "Chứng chỉ hợp lệ"
  }
  ```
  *Giá trị hợp lệ: `"approved"` hoặc `"rejected"`*
* **Response (200 OK):** `{ "message": "Doctor verified successfully" }`

### 6.3 Tra cứu Nhật ký Kiểm toán (Audit Logs)
* **Endpoint:** `GET /admin/audit-logs?action=SELECT&user_id=uuid&date_from=2026-04-01`
* **Auth:** Bắt buộc (Role: Admin)
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "actor_id": "uuid",
        "actor_name": "Dr. Tran",
        "action": "SELECT",
        "table_name": "medical_records",
        "target_user_id": "uuid",
        "old_data": null,
        "new_data": null,
        "created_at": "2026-04-24T10:15:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
  ```

---

## 7. Module: Notifications (`/notifications`)

### 7.1 Lấy danh sách thông báo
* **Endpoint:** `GET /notifications?page=1&limit=10`
* **Auth:** Bắt buộc
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "type": "access_request",
        "title": "Yêu cầu truy cập mới",
        "message": "Dr. Tran muốn xem hồ sơ của bạn",
        "is_read": false,
        "reference_id": "uuid-of-consent-request",
        "created_at": "2026-04-24T09:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
  ```

### 7.2 Đánh dấu thông báo đã đọc
* **Endpoint:** `PATCH /notifications/{id}/read`
* **Auth:** Bắt buộc
* **Body:** Trống
* **Response (200 OK):** `{ "message": "Notification marked as read" }`

---

## 8. Module: Family Registration (`/auth`, `/users`) — v2.2

### 8.1 Guardian đăng ký hồ sơ thành viên gia đình (trẻ em)
* **Endpoint:** `POST /auth/register-family-member`
* **Auth:** Bắt buộc (Role: User — Guardian)
* **Ghi chú:** Trẻ phải dưới 15 tuổi (Guardian tự khai báo, không validate tự động). Tạo `Profile` mới với `is_dependent=true` và bản ghi `family_members`.
* **Body:**
  ```json
  {
    "full_name": "Nguyen Van Con",
    "date_of_birth": "2020-05-10",
    "gender": "NAM",
    "relationship": "father",
    "birth_certificate_number": "...(optional)"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "member_id": "uuid",
    "full_name": "Nguyen Van Con",
    "relationship": "father",
    "message": "Đã thêm thành viên gia đình thành công."
  }
  ```

### 8.2 Xem danh sách thành viên gia đình
* **Endpoint:** `GET /users/me/family`
* **Auth:** Bắt buộc (Role: User — Guardian)
* **Response (200 OK):**
  ```json
  [
    {
      "member_id": "uuid",
      "full_name": "Nguyen Van Con",
      "date_of_birth": "2020-05-10",
      "gender": "NAM",
      "relationship": "father"
    }
  ]
  ```

### 8.3 Xem hồ sơ thành viên
* **Endpoint:** `GET /users/family/{member_id}`
* **Auth:** Bắt buộc (Role: User — phải là Guardian của member)
* **Response (200 OK):** Trả về `UserProfileResponse` đầy đủ của thành viên.

### 8.4 Cập nhật hồ sơ thành viên
* **Endpoint:** `PATCH /users/family/{member_id}`
* **Auth:** Bắt buộc (Role: User — phải là Guardian của member)
* **Body:** Tương tự `PATCH /users/me` — tất cả trường Optional.
* **Response (200 OK):** Trả về `UserProfileResponse` đã cập nhật.

---

## 9. Module: Allergies (`/allergies`) — v2.2

> **Lưu ý:** Tên chất gây dị ứng lấy từ danh sách chuẩn ATC/ICD-10 (có endpoint gợi ý riêng). Workflow: User nhập (`pending`) → Bác sĩ xác nhận (`confirmed`).

### 9.1 User thêm dị ứng mới
* **Endpoint:** `POST /allergies`
* **Auth:** Bắt buộc (Role: User)
* **Body:**
  ```json
  {
    "name": "Penicillin",
    "allergy_type": "medication",
    "severity": "severe",
    "reaction": "Sốc phản vệ",
    "diagnosed_date": "2020-01-15",
    "notes": "Không dùng bất kỳ kháng sinh nhóm Beta-lactam"
  }
  ```
  *Giá trị hợp lệ `allergy_type`: `medication`, `food`, `environment`, `other`.*
  *Giá trị hợp lệ `severity`: `mild`, `moderate`, `severe`, `unknown`.*
* **Response (201 Created):** Trả về bản ghi vừa tạo với `status = "pending"`.

### 9.2 Xem danh sách dị ứng
* **Endpoint:** `GET /allergies` hoặc `GET /allergies?patient_id={uuid}`
* **Auth:** Bắt buộc
* **Ghi chú:** Bác sĩ truyền `patient_id` cần consent scope `allergies_detail`.
* **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "name": "Penicillin",
      "allergy_type": "medication",
      "severity": "severe",
      "reaction": "Sốc phản vệ",
      "status": "confirmed",
      "is_active": true,
      "diagnosed_date": "2020-01-15"
    }
  ]
  ```

### 9.3 Bác sĩ xác nhận dị ứng
* **Endpoint:** `PATCH /allergies/{id}/confirm`
* **Auth:** Bắt buộc (Role: Doctor)
* **Body:**
  ```json
  { "action": "confirmed" }
  ```
  *Giá trị hợp lệ: `confirmed`, `rejected`.*
* **Response (200 OK):** Trả về bản ghi đã cập nhật `status`.

### 9.4 User cập nhật / xóa dị ứng
* **Endpoint:** `PATCH /allergies/{id}` — Cập nhật severity, reaction, notes.
* **Endpoint:** `DELETE /allergies/{id}` — Soft-delete.
* **Auth:** Bắt buộc (Role: User — chủ sở hữu)

### 9.5 Lấy danh sách gợi ý tên chuẩn (ATC/ICD-10)
* **Endpoint:** `GET /allergies/reference?query=penici`
* **Auth:** Bắt buộc
* **Response (200 OK):**
  ```json
  [
    { "code": "J01CA04", "name": "Amoxicillin", "category": "medication" },
    { "code": "J01CE01", "name": "Benzylpenicillin", "category": "medication" }
  ]
  ```

---

## 10. Module: Vaccines (`/vaccines`) — v2.2

> **Lưu ý:** Bác sĩ là người INSERT/UPDATE. User chỉ xem. Không có upload ảnh sổ tiêm.

### 10.1 Bác sĩ nhập vaccine sau khi tiêm
* **Endpoint:** `POST /vaccines`
* **Auth:** Bắt buộc (Role: Doctor) — *Không cần consent*
* **Body:**
  ```json
  {
    "patient_id": "uuid",
    "vaccine_name": "Vắc xin Sởi - Quai bị - Rubella (MMR)",
    "vaccine_code": "J07BD52",
    "dose_number": 1,
    "total_doses": 2,
    "administered_date": "2026-06-07",
    "next_due_date": "2026-09-07",
    "administered_by": "BV Nhi Đồng 1",
    "batch_number": "A2026-001",
    "manufacturer": "Merck",
    "notes": "Không có phản ứng sau tiêm"
  }
  ```
* **Response (201 Created):** Trả về bản ghi vừa tạo kèm `id`.

### 10.2 User xem lịch sử tiêm chủng của mình
* **Endpoint:** `GET /vaccines`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "vaccine_name": "Vắc xin MMR",
      "dose_number": 1,
      "total_doses": 2,
      "administered_date": "2026-06-07",
      "next_due_date": "2026-09-07",
      "administered_by": "BV Nhi Đồng 1"
    }
  ]
  ```

### 10.3 Bác sĩ xem lịch sử tiêm của bệnh nhân
* **Endpoint:** `GET /vaccines?patient_id={uuid}`
* **Auth:** Bắt buộc (Role: Doctor + consent scope `vaccines`)

### 10.4 Xem lịch tiêm nhắc lại sắp tới
* **Endpoint:** `GET /vaccines/upcoming`
* **Auth:** Bắt buộc (Role: User)
* **Response (200 OK):** Danh sách vaccine có `next_due_date` trong 30 ngày tới.

### 10.5 Bác sĩ cập nhật / xóa bản ghi vaccine
* **Endpoint:** `PATCH /vaccines/{id}` — Bác sĩ cập nhật thông tin.
* **Endpoint:** `DELETE /vaccines/{id}` — Soft-delete.
* **Auth:** Bắt buộc (Role: Doctor — phải là `recorded_by`)

---

## 11. Module: Prescription Stats (`/prescription-logs`) — v2.2

### 11.1 Xem thống kê tuân thủ uống thuốc (Adherence)
* **Endpoint:** `GET /prescription-logs/stats?prescription_id={id}`
* **Auth:** Bắt buộc (Role: User hoặc Doctor có consent `prescriptions`)
* **Response (200 OK):**
  ```json
  {
    "prescription_id": "uuid",
    "items": [
      {
        "prescription_item_id": "uuid",
        "medication_name": "Paracetamol 500mg",
        "total_doses": 15,
        "taken": 12,
        "skipped": 2,
        "untaken": 1,
        "adherence_rate": 80.0
      }
    ]
  }
  ```