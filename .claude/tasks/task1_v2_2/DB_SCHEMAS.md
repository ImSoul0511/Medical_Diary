---
trigger: always_on
---

# Thiết kế Cơ sở dữ liệu (Database Schemas) - Medical Diary

Tài liệu này đặc tả cấu trúc các bảng trong PostgreSQL (Supabase), các mối quan hệ, ràng buộc và chính sách bảo mật dữ liệu.

> **Lưu ý:** Mỗi bảng dưới đây được map 1:1 với một SQLAlchemy Model trong file `models.py` của module tương ứng. Xem bảng **Module ↔ Model Mapping** ở cuối tài liệu để tra cứu nhanh.

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
- **cccd_encrypted**: `text` (Nullable — Mã hóa pgcrypto — Căn cước công dân)
- **gender**: `varchar(10)` (Check: `'NAM'`, `'Nữ'`)
- **date_of_birth**: `date` (Nullable)
- **blood_type**: `varchar(5)` (Nullable — vd: `"O+"`, `"AB-"`)
- **allergies**: `text` (Nullable — vd: `"Penicillin, Aspirin"`)
- **emergency_contact**: `varchar(20)` (Nullable — SĐT người thân)
- **privacy_settings**: `jsonb` (Default: `{"show_blood_type": true, "show_allergies": true, "show_emergency_contact": true}`)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable - Soft Delete)

> **Lưu ý:** `email` không lưu trong `profiles` (Supabase Auth quản lý email). Tạm thời sử dụng email thay cho phone number để test.

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
Đơn thuốc (chứa nhiều loại thuốc).
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **patient_id**: `uuid` (Not Null, references `profiles.id`)
- **doctor_id**: `uuid` (Not Null, references `profiles.id`)
- **notes**: `text` (Nullable — Ghi chú chung của đơn thuốc)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `prescription_items`
Chi tiết từng loại thuốc trong một đơn.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **prescription_id**: `uuid` (Not Null, references `prescriptions.id`)
- **medication_name**: `varchar(200)` (Not Null)
- **dosage**: `varchar(500)` (Not Null)
- **duration_days**: `integer` (Check: `duration_days > 0`)
- **scheduled_times**: `time[]` (Not Null — Mảng các khung giờ uống thuốc. VD: `['08:00', '13:00', '20:00']`)
- **status**: `varchar(20)` (Check: `active`, `cancelled`) (Default: `active`)
- **created_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Soft Delete)

### Bảng `prescription_logs`
Lịch sử uống thuốc của bệnh nhân. **Tự động tạo bởi DB Trigger** khi bác sĩ thêm thuốc (`INSERT` vào `prescription_items`): hệ thống tạo sẵn `duration_days * số_lần_uống_mỗi_ngày` bản ghi.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **prescription_item_id**: `uuid` (Not Null, references `prescription_items.id`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **scheduled_date**: `date` (Not Null — Ngày dự kiến uống thuốc)
- **scheduled_time**: `time` (Not Null — Giờ dự kiến uống thuốc)
- **status**: `varchar(20)` (Check: `untaken`, `taken`, `skipped`) (Default: `untaken`)
- **taken_at**: `timestamptz` (Nullable — Chỉ có giá trị khi `status = 'taken'`)

---

## 4. Module: Emergency & Logs

### Bảng `emergency_tokens`
Quản lý mã QR truy cập khẩn cấp. User có thể chọn TTL tùy ý, bao gồm cả vĩnh viễn (in ra mang theo).
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **token**: `varchar(255)` (Unique, Not Null)
- **expires_at**: `timestamptz` (Nullable — `NULL` = vĩnh viễn, không hết hạn)
- **created_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable — Soft Delete, vô hiệu hóa token)

### Bảng `emergency_access_logs`
Ghi nhận lịch sử mỗi lần có người quét QR token.
- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **token_id**: `uuid` (Not Null, references `emergency_tokens.id`)
- **accessed_at**: `timestamptz` (Default: `now()` — Thời điểm quét QR)

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

> **Cơ chế Nhắc nhở Tự động:** Supabase `pg_cron` sẽ chạy ngầm mỗi 15 phút, quét bảng `prescription_logs` để tìm các bản ghi có `status = 'untaken'` và `scheduled_time` sắp đến, sau đó tự động `INSERT` vào bảng `notifications` để gửi Push Notification cho user.

---

## Ràng buộc & Chỉ mục (Constraints & Indexes)

1. **Soft Delete**: Mọi câu lệnh `SELECT` của ứng dụng phải thêm điều kiện `WHERE deleted_at IS NULL`.
2. **Audit Trigger**: Gắn Trigger cho các bảng `diaries`, `health_metrics`, `medical_records`, `prescriptions` để tự động chèn vào `data_access_logs`. **Không ghi log** cho truy cập Public View (QR, tìm kiếm). Riêng truy cập QR được ghi vào bảng `emergency_access_logs` (chỉ ghi thời gian).
3. **RLS (Row Level Security)**:
   - User chỉ xem được dữ liệu của chính mình.
   - Doctor chỉ xem được dữ liệu của Patient nếu có bản ghi `active` trong `consent_permissions` với `scope` tương ứng.
   - Doctor được phép **tạo** (INSERT) `medical_records` và `prescriptions` mà **không cần consent**. Consent chỉ áp dụng cho **đọc** (SELECT).
4. **Indexes**:
   - `doctors(license_number)`
   - `consent_requests(patient_id, status)`
   - `consent_permissions(doctor_id, patient_id) WHERE status = 'active'` (Partial Unique)
   - `health_metrics(user_id, recorded_at)`
   - `emergency_tokens(token)`
   - `emergency_tokens(user_id) WHERE deleted_at IS NULL`
   - `emergency_access_logs(token_id, accessed_at)`
   - `data_access_logs(target_user_id, created_at)`
   - `notifications(user_id, is_read)`
   - `prescription_logs(prescription_item_id, scheduled_date, scheduled_time)`

---

## Module ↔ Model Mapping

Bảng tra cứu nhanh giữa bảng DB và SQLAlchemy Model tương ứng:

| Bảng DB | SQLAlchemy Model | File Location |
|---|---|---|
| `profiles` | `Profile` | `app/modules/users/models.py` |
| `doctors` | `Doctor` | `app/modules/users/models.py` |
| `family_members` | `FamilyMember` | `app/modules/users/models.py` |
| `consent_requests` | `ConsentRequest` | `app/modules/consent/models.py` |
| `consent_permissions` | `ConsentPermission` | `app/modules/consent/models.py` |
| `health_metrics` | `HealthMetric` | `app/modules/health_metrics/models.py` |
| `diaries` | `Diary` | `app/modules/diaries/models.py` |
| `medical_records` | `MedicalRecord` | `app/modules/medical_records/models.py` |
| `prescriptions` | `Prescription` | `app/modules/prescriptions/models.py` |
| `prescription_items` | `PrescriptionItem` | `app/modules/prescriptions/models.py` |
| `prescription_logs` | `PrescriptionLog` | `app/modules/prescriptions/models.py` |
| `emergency_tokens` | `EmergencyToken` | `app/modules/emergency/models.py` |
| `emergency_access_logs` | `EmergencyAccessLog` | `app/modules/emergency/models.py` |
| `data_access_logs` | `DataAccessLog` | `app/modules/admin/models.py` |
| `notifications` | `Notification` | `app/modules/notifications/models.py` |
| `allergies` | `Allergy` | `app/modules/allergies/models.py` |
| `vaccines` | `Vaccine` | `app/modules/vaccines/models.py` |

---

## 6. Module: Family Registration (v2.2)

> **Trạng thái:** Đã xác nhận triển khai.

### Bổ sung cột vào bảng `profiles`

```sql
ALTER TABLE profiles ADD COLUMN is_dependent   BOOLEAN   DEFAULT false;
ALTER TABLE profiles ADD COLUMN guardian_id    UUID      REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN birth_cert_encrypted TEXT;
-- birth_cert_encrypted: Mã giấy khai sinh (tùy chọn, mã hóa pgcrypto)
```

**Quy tắc:**
- `is_dependent = true` → profile trẻ em, không có `auth.users` riêng.
- `guardian_id` → trỏ về profile của bố/mẹ.
- Trẻ < 15 tuổi mới được đăng ký theo hộ (Guardian tự khai báo `date_of_birth`, không validate tự động).
- Khi trẻ đủ 18 tuổi: `is_dependent` chuyển thành `false`, `guardian_id` được NULL — account trở thành độc lập.

### Bảng `family_members`

Liên kết quan hệ giữa Guardian và thành viên gia đình.

- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **guardian_id**: `uuid` (Not Null, references `profiles.id`) — Bố/mẹ/người giám hộ
- **member_id**: `uuid` (Not Null, references `profiles.id`) — Trẻ em / thành viên
- **relationship**: `varchar(20)` (Check: `'father'`, `'mother'`, `'guardian'`, `'other'`) (Not Null)
- **is_active**: `boolean` (Default: `true`)
- **created_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable — Soft Delete)

**RLS Policy:** Guardian (`auth.uid() = guardian_id`) có quyền SELECT/INSERT/UPDATE trên toàn bộ dữ liệu của `member_id` tương ứng.

**Tìm kiếm bác sĩ:** `GET /doctors/search-patients` phân tách kết quả — Guardian profile và Children profile được trả về riêng biệt (không lẫn lộn).

---

## 7. Module: Allergies (v2.2)

> **Trạng thái:** Đã xác nhận triển khai. Thay thế `profiles.allergies` text thuần bằng bảng có cấu trúc.

### Bảng `allergies`

- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`)
- **name**: `varchar(200)` (Not Null — Lấy từ danh sách chuẩn ATC Code / ICD-10)
- **allergy_type**: `varchar(20)` (Check: `'medication'`, `'food'`, `'environment'`, `'other'`) (Not Null)
- **severity**: `varchar(20)` (Check: `'mild'`, `'moderate'`, `'severe'`, `'unknown'`) (Default: `'unknown'`)
- **reaction**: `text` (Nullable — Mô tả phản ứng)
- **diagnosed_date**: `date` (Nullable)
- **diagnosed_by**: `uuid` (Nullable, references `profiles.id` — Bác sĩ xác nhận)
- **status**: `varchar(20)` (Check: `'pending'`, `'confirmed'`, `'rejected'`) (Default: `'pending'`)
- **notes**: `text` (Nullable)
- **is_active**: `boolean` (Default: `true` — `false` = đã khỏi)
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable — Soft Delete)

**Workflow:**
```
User nhập → status = 'pending' → Bác sĩ xác nhận → status = 'confirmed'
                                → Bác sĩ từ chối  → status = 'rejected'
```

**Lưu ý:** `profiles.allergies` (text cũ) **giữ nguyên** để backward compatible với Emergency QR. Emergency QR sẽ JOIN bảng `allergies` để trả về structured list khi `privacy_settings.show_allergies = true`.

**Indexes:** `allergies(user_id, status)`, `allergies(user_id, is_active)`

---

## 8. Module: Vaccines (v2.2)

> **Trạng thái:** Đã xác nhận triển khai. Bác sĩ là người INSERT sau mỗi lần tiêm, user chỉ xem.

### Bảng `vaccines`

- **id**: `uuid` (Primary Key, Default: `gen_random_uuid()`)
- **user_id**: `uuid` (Not Null, references `profiles.id`) — Bệnh nhân
- **vaccine_name**: `varchar(200)` (Not Null — Tên vaccine)
- **vaccine_code**: `varchar(50)` (Nullable — Mã WHO ICD-11)
- **dose_number**: `integer` (Not Null, Default: `1` — Mũi số mấy)
- **total_doses**: `integer` (Nullable — Tổng số mũi cần tiêm)
- **administered_date**: `date` (Not Null — Ngày tiêm)
- **next_due_date**: `date` (Nullable — Ngày tiêm nhắc lại)
- **administered_by**: `varchar(200)` (Nullable — Nơi tiêm / Tên bác sĩ)
- **batch_number**: `varchar(100)` (Nullable — Số lô vaccine)
- **manufacturer**: `varchar(200)` (Nullable — Nhà sản xuất)
- **notes**: `text` (Nullable)
- **recorded_by**: `uuid` (Not Null, references `profiles.id`) — Bác sĩ nhập liệu
- **created_at**: `timestamptz` (Default: `now()`)
- **updated_at**: `timestamptz` (Default: `now()`)
- **deleted_at**: `timestamptz` (Nullable — Soft Delete)

**Indexes:** `vaccines(user_id, administered_date)`, `vaccines(user_id, next_due_date) WHERE deleted_at IS NULL`

**Tích hợp Notifications:** `pg_cron` quét `next_due_date` → tự động INSERT vào `notifications` với type `vaccine_reminder`.

### Cập nhật `notifications.type`

Thêm giá trị mới vào CHECK constraint:
```sql
-- Hiện tại: 'access_request', 'prescription_new', 'prescription_reminder', 'emergency_token_expired'
-- Thêm: 'vaccine_reminder'
```

### Cập nhật `profiles.privacy_settings` default

```json
{
    "show_blood_type": true,
    "show_allergies": true,
    "show_emergency_contact": true,
    "show_vaccines": false
}
```

### Cập nhật `consent_requests.requested_scope`

Thêm 2 giá trị hợp lệ mới:
- `'allergies_detail'` — Truy cập bảng `allergies` có cấu trúc (khác với `profiles.allergies` text cũ)
- `'vaccines'` — Truy cập bảng `vaccines`
