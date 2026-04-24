# Thiết kế Cơ sở dữ liệu (Database Schemas) - Medical Diary

Tài liệu này đặc tả cấu trúc các bảng trong PostgreSQL (Supabase), các mối quan hệ, ràng buộc và chính sách bảo mật dữ liệu.

## Kiến trúc dữ liệu 3 tầng (Data Visibility Tiers)

| Tầng | Mô tả | Ai xem được | Bảng liên quan |
|---|---|---|---|
| **Public View** | Nhóm máu, dị ứng, SĐT khẩn cấp | Ai quét QR hợp lệ (User chọn hiển thị trường nào qua `privacy_settings`) | `profiles` |
| **Private View — Vitals** | Nhịp tim, bước chân, nhịp thở (từ smartwatch/app) | Chủ sở hữu + Doctor có consent scope tương ứng (qua luồng request-access) | `health_metrics` |
| **Private View — Diary** | Ghi chép cá nhân (text tự do + đánh giá triệu chứng 1→10) | Chủ sở hữu + Doctor có consent scope `diaries` | `diaries` |

---

## 1. Module: Core & Profiles

### Bảng `profiles`
Lưu trữ thông tin người dùng cơ bản, mở rộng từ bảng `auth.users` của Supabase.
- **id**: `uuid` (Primary Key, references `auth.users`)
- **full_name**: `varchar(100)` (Not Null)
- **role**: `varchar(20)` (Check: `user`, `doctor`, `admin`) (Default: `user`)
- **phone_encrypted**: `text` (Mã hóa pgcrypto)
- **cccd_encrypted**: `text` (Mã hóa pgcrypto — Căn cước công dân)
- **blood_type**: `varchar(5)` (Nullable — vd: `"O+"`, `"AB-"`)
- **allergies**: `text` (Nullable — vd: `"Penicillin, Aspirin"`)
- **emergency_contact**: `varchar(20)` (Nullable — SĐT người thân)
- **privacy_settings**: `jsonb` (Default: `{"show_blood_type": true, "show_allergies": true, "show_emergency_contact": true}`)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable - Soft Delete)

> **Lưu ý:** `email` không lưu trong `profiles`. Khi cần email, JOIN với `auth.users`.

### Bảng `doctors`
Thông tin bổ sung cho người dùng có role là `doctor`.
- **id**: `uuid` (Primary Key, references `profiles.id`)
- **specialty**: `varchar(100)` (Not Null)
- **license_number**: `varchar(50)` (Unique, Not Null)
- **hospital**: `varchar(200)` (Not Null)
- **certificate_url**: `text` (Not Null)
- **verification_status**: `varchar(20)` (Check: `pending_verification`, `approved`, `rejected`) (Default: `pending_verification`)
- **verification_notes**: `text`
- **verified_at**: `timestamptz`
- **verified_by**: `uuid` (References `profiles.id` - Admin)

---

## 2. Module: Consent & Permissions

### Bảng `consent_requests`
Bác sĩ xin quyền truy cập dữ liệu bệnh nhân.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **doctor_id**: `uuid` (Not Null, references `profiles.id`)
- **patient_id**: `uuid` (Not Null, references `profiles.id`)
- **requested_scope**: `text[]` (Gồm: `blood_type`, `allergies`, `emergency_contact`, `medical_records`, `prescriptions`, `diaries`, `heart_rate`, `step_count`, `respiratory_rate`)
- **reason**: `text` (Not Null)
- **status**: `varchar(20)` (Check: `pending`, `approved`, `rejected`) (Default: `pending`)
- **created_at**: `timestamptz` (Default: `now()`)
- **responded_at**: `timestamptz`

### Bảng `consent_permissions`
Quyền truy cập thực tế đã được bệnh nhân phê duyệt.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **doctor_id**: `uuid` (Not Null, references `profiles.id`)
- **patient_id**: `uuid` (Not Null, references `profiles.id`)
- **scope**: `text[]` (Tập con của requested_scope)
- **status**: `varchar(20)` (Check: `active`, `revoked`) (Default: `active`)
- **granted_at**: `timestamptz` (Default: `now()`)
- **revoked_at**: `timestamptz`
- **Partial Unique Index**: `UNIQUE(doctor_id, patient_id) WHERE status = 'active'`

---

## 3. Module: Medical Data

### Bảng `health_metrics` (Private View — Vitals)
Dữ liệu đo lường tự động từ app/smartwatch.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **heart_rate**: `integer` (Nullable, Check: `heart_rate >= 30 AND heart_rate <= 250`)
- **step_count**: `integer` (Nullable, Check: `step_count >= 0`)
- **respiratory_rate**: `integer` (Nullable, Check: `respiratory_rate >= 5 AND respiratory_rate <= 60`)
- **recorded_at**: `timestamptz` (Not Null — Thời điểm đo, có thể khác thời điểm gửi)
- **created_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `diaries` (Private View — Diary)
Nhật ký sức khỏe cá nhân do bệnh nhân tự ghi.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **content**: `text` (Nullable — Ghi chép tự do bằng chữ)
- **symptoms**: `jsonb` (Nullable — Đánh giá triệu chứng có cấu trúc. Ví dụ: `[{"name": "Đau đầu", "severity": 7}, {"name": "Chóng mặt", "severity": 4}]`)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `medical_records`
Hồ sơ bệnh án chính thức do bác sĩ tạo.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **patient_id**: `uuid` (Not Null, references `profiles.id`)
- **doctor_id**: `uuid` (Not Null, references `profiles.id`)
- **diagnosis**: `text` (Not Null)
- **notes**: `text`
- **attachments**: `jsonb` (Mảng URLs: `["url1", "url2"]`)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `prescriptions`
Đơn thuốc do bác sĩ kê.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **patient_id**: `uuid` (Not Null, references `profiles.id`)
- **doctor_id**: `uuid` (Not Null, references `profiles.id`)
- **medication_name**: `varchar(200)` (Not Null)
- **dosage**: `varchar(500)` (Not Null)
- **duration_days**: `integer` (Check: `duration_days > 0`)
- **status**: `varchar(20)` (Check: `active`, `cancelled`) (Default: `active`)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `prescription_logs`
Lịch sử uống thuốc của bệnh nhân.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **prescription_id**: `uuid` (Not Null, references `prescriptions.id`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **status**: `varchar(20)` (Check: `taken`, `skipped`)
- **taken_at**: `timestamptz` (Default: `now()`)

---

## 4. Module: Emergency & Logs

### Bảng `emergency_tokens`
Quản lý mã QR truy cập khẩn cấp. User có thể chọn TTL tùy ý, bao gồm cả vĩnh viễn (in ra mang theo).
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **token**: `varchar(255)` (Unique, Not Null)
- **expires_at**: `timestamptz` (Nullable — `NULL` = vĩnh viễn, không hết hạn)
- **created_at**: `timestamptz` (Default: `now()`)

### Bảng `data_access_logs` (Audit Logs)
Bảng ghi lại mọi thao tác truy xuất/thay đổi dữ liệu y tế. **Không ghi log** cho truy cập Public View (QR/search).
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **actor_id**: `uuid` (Not Null, references `profiles.id`)
- **actor_name**: `varchar(100)`
- **action**: `varchar(20)` (Check: `SELECT`, `INSERT`, `UPDATE`, `DELETE`)
- **table_name**: `varchar(50)`
- **target_user_id**: `uuid` (Chủ sở hữu dữ liệu)
- **old_data**: `jsonb`
- **new_data**: `jsonb`
- **created_at**: `timestamptz` (Default: `now()`)

---

## 5. Module: Notifications

### Bảng `notifications`
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **type**: `varchar(50)` (Check: `access_request`, `prescription_new`, `prescription_reminder`, `emergency_token_expired`)
- **title**: `varchar(200)` (Not Null)
- **message**: `text` (Not Null)
- **reference_id**: `uuid` (Nullable — Trỏ đến bản ghi liên quan tùy `type`)
- **is_read**: `boolean` (Default: `false`)
- **created_at**: `timestamptz` (Default: `now()`)

---

## Ràng buộc & Chỉ mục (Constraints & Indexes)

1. **Soft Delete**: Mọi câu lệnh `SELECT` của ứng dụng phải thêm điều kiện `WHERE deleted_at IS NULL`.
2. **Audit Trigger**: Gắn Trigger cho các bảng `diaries`, `health_metrics`, `medical_records`, `prescriptions` để tự động chèn vào `data_access_logs`. **Không ghi log** cho truy cập Public View (QR, tìm kiếm).
3. **RLS (Row Level Security)**:
   - User chỉ xem được dữ liệu của chính mình.
   - Doctor chỉ xem được dữ liệu của Patient nếu có bản ghi `active` trong `consent_permissions` với `scope` tương ứng.
4. **Indexes**:
   - `doctors(license_number)`
   - `consent_requests(patient_id, status)` (Tìm pending requests nhanh)
   - `consent_permissions(doctor_id, patient_id) WHERE status = 'active'` (Partial Unique)
   - `health_metrics(user_id, recorded_at)`
   - `emergency_tokens(token)`
   - `data_access_logs(target_user_id, created_at)`
   - `notifications(user_id, is_read)`
