---
trigger: always_on
---

# Kế hoạch Triển khai Code Backend — Medical Diary API

Tài liệu này xác định thứ tự triển khai các module, dựa trên mức độ phụ thuộc lẫn nhau. **Mỗi module được triển khai bao gồm 3 file:** `schemas.py`, `service.py`, `router.py` (file `models.py` đã hoàn tất).

> **Trạng thái hạ tầng:** ✅ SẴN SÀNG
> - Database đã kết nối Supabase (PostgreSQL 17.6)
> - Migration đã chạy thành công (14 bảng + indexes)
> - RLS Middleware đã hoạt động (JWT → SET LOCAL)
> - Docker đã cấu hình xong (build, DNS, hot-reload)

---

## Quy tắc chung khi viết code

1. **Tham chiếu Docs:** Mọi schemas phải khớp với `SCHEMAS.md`. Mọi endpoint phải khớp với `API.md`. Logic luồng phải theo `API_FLOW.md`.
2. **Service Layer:** Tất cả query đều qua `AsyncSession` (dependency `get_db()`). KHÔNG dùng Supabase Client cho CRUD.
3. **Supabase Client:** Chỉ dùng cho 3 việc: Auth (đăng ký/đăng nhập), Storage (upload file), Realtime (nếu cần).
4. **Error Handling:** Trả lỗi theo format chuẩn `ErrorResponse` đã định nghĩa trong `SCHEMAS.md` (mục 0). Exception Handler toàn cục sẽ tự đính kèm `request_id` (xem `app/core/exceptions.py`).
5. **Soft Delete:** Mọi DELETE đều chỉ cập nhật cột `deleted_at`. Query SELECT phải lọc `WHERE deleted_at IS NULL`.
6. **Mã hóa Dữ liệu Nhạy cảm:** Các trường `cccd_encrypted` (cho Bác sĩ) phải dùng `pgp_sym_encrypt()` / `pgp_sym_decrypt()` của pgcrypto. Key lấy từ `current_setting('app.encryption_key')` (được inject qua `get_db()`). Chi tiết xem `Auth_and_Logging_plan.md` Phần C.
7. **OOP Service (BẮT BUỘC):** Tất cả service.py phải triển khai bằng class (VD: `ConsentService`, `DiariesService`). Không dùng hàm tự do.
8. **Commit/Flush:** Service chỉ dùng `flush()`. Tầng `get_db()` chịu trách nhiệm `commit()`.
9. **Ưu tiên ORM:** Ưu tiên SQLAlchemy ORM, hạn chế raw query. Cấm f-string nối SQL (phòng SQL Injection).

---

## Sơ đồ phụ thuộc giữa các Phase

```
Phase 0 (Shared) ──→ Phase 1 (Auth) ──→ Phase 2 (Consent Helper)
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                   Phase 3A              Phase 3B              Phase 3C
                (Users Self-service)    (Consent)         (Medical Data Self-service)
                         │                    │                    │
                         ▼                    │                    ▼
                   Phase 4A ◄─────────────────┘──────────────► Phase 4B
              (Doctors Cross-user)                      (Medical Data Cross-user)
                         │                                         │
                         └──────────────┬──────────────────────────┘
                                        ▼
                              Phase 5 (Emergency)
                              Phase 6 (Notifications)
                              Phase 7 (Admin)
                              Phase 8 (Integration)
```

---

## Phase 0: Shared Utilities ✅ (Đã hoàn thành)

> Các module nghiệp vụ sẽ import từ đây, nên phải hoàn thành trước.

### 0.1 `app/shared/schemas.py`
- [x] `ErrorResponse` — Format lỗi chuẩn hóa
- [x] `PaginatedResponse[T]` — Phân trang generic
- [x] `MessageResponse` — Response đơn giản `{"message": "..."}`

### 0.2 `app/shared/dependencies.py`
- [x] `get_current_user()` — Dependency giải mã JWT, trả về user object từ DB
- [x] `require_role(role)` — Dependency kiểm tra role (user/doctor/admin)
- [x] `get_supabase_client()` — Dependency cung cấp Supabase Client (cho Auth/Storage)

---

## Phase 1: Auth Module ✅ (Đã hoàn thành)

> Nền tảng — Các module khác phụ thuộc vào đây.

### 1.1 `app/modules/auth/schemas.py`
- [x] `LoginRequest`, `LoginResponse`
- [x] `RegisterRequest`, `RegisterDoctorRequest`
- [x] `SessionInfo`, `SessionListResponse`

### 1.2 `app/modules/auth/service.py`
- [x] `login()` — Gọi Supabase Auth `sign_in_with_password`
- [x] `register()` — Gọi Supabase Auth `sign_up` + tạo `Profile` trong DB
- [x] `register_doctor()` — Như register + tạo bản ghi `Doctor` (pending_verification)
- [x] `logout()` — Invalidate session hiện tại
- [x] `revoke_all_sessions()` — Invalidate tất cả sessions
- [x] `list_sessions()` — Lấy danh sách sessions
- [x] `revoke_selected_session()` — Invalidate session được chọn

### 1.3 `app/modules/auth/router.py`
- [x] `POST /auth/login`
- [x] `POST /auth/register`
- [x] `POST /auth/register/doctor`
- [x] `POST /auth/logout`
- [x] `POST /auth/revoke-all`
- [x] `GET /auth/sessions`
- [x] `POST /auth/revoke-selected-session`

### 1.4 Đăng ký router trong `app/main.py`
- [x] `app.include_router(auth_router)`

---

## Phase 2: Consent Helper ✅ (Đã hoàn thành)

> Đây là hàm chia sẻ duy nhất giữa Phase 3A/3B/3C. Tạo xong file này thì 3 coder có thể chạy song song.

### 2.1 `app/shared/consent.py` (Tạo mới)
- [x] `check_consent(db, doctor_id, patient_id, required_scope)` — Kiểm tra bác sĩ có quyền truy cập scope cụ thể của bệnh nhân không. Đọc trực tiếp từ bảng `consent_permissions`.

```python
# Mẫu:
async def check_consent(
    db: AsyncSession, doctor_id: str, patient_id: str, required_scope: str
) -> bool:
    query = text("""
        SELECT 1 FROM consent_permissions
        WHERE doctor_id = :doctor_id AND patient_id = :patient_id
          AND :scope = ANY(scope) AND revoked_at IS NULL
    """)
    result = await db.execute(query, {
        "doctor_id": doctor_id, "patient_id": patient_id, "scope": required_scope
    })
    return result.fetchone() is not None
```

---

## Phase 3: Song song — 3 Coder cùng chạy

> **Điều kiện:** Phase 2 (Consent Helper) đã xong.
> Bảng DB đã tồn tại (migration đã chạy). Mỗi coder chỉ cần import `check_consent` nếu cần.
> **3 nhánh sau đây ĐỘC LẬP, có thể làm đồng thời.**

---

### Phase 3A: Users Self-service (Coder 1) ✅ (Đã hoàn thành)

> User quản lý hồ sơ CỦA CHÍNH MÌNH. Không cần consent.

#### 3A.1 `app/modules/users/schemas.py`
- [x] `UserProfileResponse`, `UserProfileUpdateRequest`
- [x] `PrivacyUpdateRequest`
- [x] `AccessHistoryResponse` (`AccessHistoryItem`)
- [x] `DoctorPublicResponse` (dùng cho search-doctors)

#### 3A.2 `app/modules/users/service.py`
- [x] `get_profile(user_id)` — Lấy thông định cá nhân
- [x] `update_profile(user_id, data)` — Cập nhật hồ sơ
- [x] `update_privacy(user_id, data)` — Cập nhật privacy_settings
- [x] `export_data(user_id, format, scope)` — Xuất dữ liệu (JSON/PDF)
- [x] `get_access_history(user_id)` — Xem lịch sử ai đã truy cập (đọc `data_access_logs`)
- [x] `search_doctors(name, specialty)` — User tìm bác sĩ (chỉ public info)

#### 3A.3 `app/modules/users/router.py`
- [x] `GET /users/me` — Auth: Bắt buộc
- [x] `PATCH /users/me` — Auth: Bắt buộc
- [x] `PATCH /users/privacy` — Auth: Bắt buộc
- [x] `GET /users/me/export` — Auth: Bắt buộc
- [x] `GET /users/me/access-history` — Auth: Bắt buộc
- [x] `GET /users/search-doctors` — Auth: Bắt buộc (Role: User)

---

### Phase 3B: Consent Module (Coder 2) ✅ (Đã hoàn thành)

> Quản lý cấp/thu hồi quyền truy cập giữa User và Doctor.
> Đã bổ sung tính năng **timeout (expires_at)** khi cấp quyền. Đã refactor sang OOP (`ConsentService`).

#### 3B.1 `app/modules/consent/schemas.py`
- [x] `AccessRequestItem` — Response: thông tin 1 yêu cầu truy cập (request_id, doctor_id, doctor_name, status, requested_scope, requested_at)
- [x] `AccessRequestActionRequest` — Request body: input của `PATCH /consent/access-requests/{id}` (action, approved_scope, expires_in_days)
- [x] `ConsentHistoryItem` — Response: thông tin 1 bác sĩ đang có quyền (scope, doctor_id, doctor_name, granted_at, expires_at)
- [x] `ConsentRevokeResponse` — Response: xác nhận thu hồi quyền thành công (doctor_id, revoked_at)

#### 3B.2 `app/modules/consent/service.py` (OOP: `ConsentService`)
- [x] `list_pending_requests(patient_id)` — Patient xem yêu cầu chờ duyệt
- [x] `review_request(request_id, patient_id, action, approved_scope)` — Patient duyệt/từ chối (hỗ trợ expires_in_days)
- [x] `revoke_permission(patient_id, doctor_id)` — Patient thu hồi quyền
- [x] `get_consent_history(patient_id)` — Danh sách bác sĩ đang có quyền (lọc hết hạn)

#### 3B.3 `app/modules/consent/router.py`
- [x] `GET /consent/access-requests` — Auth: Bắt buộc (Role: User)
- [x] `PATCH /consent/access-requests/{id}` — Auth: Bắt buộc (Role: User)
- [x] `POST /consent/revoke/{doctor_id}` — Auth: Bắt buộc (Role: User)
- [x] `GET /consent/history` — Auth: Bắt buộc (Role: User)

---

### Phase 3C: Medical Data Self-service (Coder 3) ✅ (Đã hoàn thành)

> User tự quản lý dữ liệu y tế CỦA CHÍNH MÌNH. Không cần consent.
> 4 sub-module bên dưới cũng độc lập nhau. Đã refactor sang OOP.

#### 3C.1 Health Metrics (User tự ghi/xem) — OOP: `HealthMetricsService`
- [x] `schemas.py` — `HealthMetricCreateRequest`, `HealthMetricResponse`
- [x] `service.py` — `create(user_id, data)`, `list_own(user_id, filters)`
- [x] `router.py` — `POST /health-metrics` (Role: User), `GET /health-metrics` (không có patient_id)

#### 3C.2 Diaries (User tự viết/xem/xóa) — OOP: `DiariesService`
- [x] `schemas.py` — `DiaryCreateRequest`, `DiaryResponse`, `SymptomEntry`
- [x] `service.py` — `create(user_id, data)`, `list_own(user_id, filters)`, `soft_delete(user_id, diary_id)`
- [x] `router.py` — `POST /diaries` (Role: User), `GET /diaries` (không có patient_id), `DELETE /diaries/{id}` (Chủ sở hữu)

#### 3C.3 Prescriptions (User tự xem đơn thuốc + cập nhật trạng thái uống) — OOP: `PrescriptionsService`
- [x] `schemas.py` — `PrescriptionResponse`, `PrescriptionItemResponse`, `PrescriptionLogResponse`, `PrescriptionLogUpdateRequest`
- [x] `service.py` — `list_own_prescriptions(user_id)`, `list_logs(user_id, prescription_id)`, `update_log_status(user_id, log_id, data)`
- [x] `router.py` — `GET /prescriptions` (Role: User), `GET /prescription-logs` (Role: User), `PATCH /prescription-logs/{log_id}` (Role: User)

#### 3C.4 Medical Records (User tự xem hồ sơ bệnh án của mình) — OOP: `MedicalRecordsService`
- [x] `schemas.py` — `MedicalRecordResponse`
- [x] `service.py` — `list_own_records(user_id)`
- [x] `router.py` — `GET /medical-records/me` (Role: User)

---

## Phase 4: Cross-user Features (Sau khi Phase 3B hoàn thành)

> **Điều kiện:** Phase 3B (Consent) đã xong → bảng `consent_permissions` có dữ liệu để test.
> Các function ở phase này đều cần gọi `check_consent()` từ `app/shared/consent.py`.
> **2 nhánh sau ĐỘC LẬP, có thể làm đồng thời.**

---

### Phase 4A: Doctors Cross-user (Linh)

> Bác sĩ tìm kiếm, xem hồ sơ, và xin quyền truy cập bệnh nhân.

#### 4A.1 `app/modules/doctors/schemas.py`
- [ ] `PatientPublicResponse` (kết quả tìm kiếm)
- [ ] `PatientProfileResponse` (hồ sơ chi tiết — lọc theo consent)
- [ ] `RequestAccessRequest`, `RequestAccessResponse`

#### 4A.2 `app/modules/doctors/service.py`
- [ ] `search_patients(query)` — Tìm bệnh nhân (chỉ trả về tên, ID)
- [ ] `get_patient_detail(doctor_id, patient_id)` — Xem hồ sơ bệnh nhân (**cần consent check**)
- [ ] `request_access(doctor_id, data)` — Gửi yêu cầu truy cập (tạo bản ghi `consent_requests`)

#### 4A.3 `app/modules/doctors/router.py`
- [ ] `GET /doctors/search-patients` — Auth: Bắt buộc (Role: Doctor)
- [ ] `GET /users/{id}` — Auth: Bắt buộc (Role: Doctor)
- [ ] `POST /doctors/request-access` — Auth: Bắt buộc (Role: Doctor)

---

### Phase 4B: Medical Data Cross-user (Triết)

> Bác sĩ tạo/xem dữ liệu y tế CỦA BỆNH NHÂN. Cần consent check.

#### 4B.1 Health Metrics (Doctor xem dữ liệu bệnh nhân)
- [ ] `service.py` — `list_by_patient(doctor_id, patient_id, filters)` (**cần consent scope: heart_rate, step_count, respiratory_rate**)
- [ ] `router.py` — `GET /health-metrics?patient_id={id}` (Role: Doctor)

#### 4B.2 Diaries (Doctor xem nhật ký bệnh nhân)
- [ ] `service.py` — `list_by_patient(doctor_id, patient_id, filters)` (**cần consent scope: diaries**)
- [ ] `router.py` — `GET /diaries?patient_id={id}` (Role: Doctor)

#### 4B.3 Medical Records (Doctor tạo hồ sơ bệnh án)
- [ ] `schemas.py` — `MedicalRecordCreateRequest`
- [ ] `service.py` — `create(doctor_id, data)` (doctor only, **không cần consent**), `list_by_patient(doctor_id, patient_id)` (**cần consent scope: medical_records**)
- [ ] `router.py` — `POST /medical-records` (Role: Doctor), `GET /medical-records/{user_id}` (Role: Doctor)

#### 4B.4 Prescriptions (Doctor tạo đơn thuốc)
- [ ] `schemas.py` — `PrescriptionCreateRequest`, `PrescriptionItemCreateRequest`
- [ ] `service.py` — `create_prescription(doctor_id, data)` (**không cần consent**), `add_item(doctor_id, prescription_id, data)`, `soft_delete_prescription(doctor_id, prescription_id)`
- [ ] `router.py` — `POST /prescriptions` (Role: Doctor), `POST /prescriptions/{id}/items` (Role: Doctor), `DELETE /prescriptions/{id}` (Role: Doctor)

---

## Phase 5: Emergency (Trường)

> **Điều kiện:** Phase 3A (Users) đã xong — cần đọc `profiles` + `privacy_settings`.

- [ ] `schemas.py` — `EmergencyTokenCreateRequest`, `EmergencyTokenResponse`, `EmergencyAccessResponse`, `EmergencyTokenItem`, `EmergencyTokenUpdateRequest`, `EmergencyAccessLogItem`
- [ ] `service.py` — `create_token()`, `list_tokens()`, `update_token()`, `revoke_token()`, `access_by_token()`, `get_access_history()`
- [ ] `router.py` — `POST /emergency/token` (Role: User), `GET /emergency/tokens` (Role: User), `PATCH /emergency/tokens/{id}` (Role: User), `DELETE /emergency/tokens/{id}` (Role: User), `GET /emergency/access/{token}` (Public), `GET /emergency/tokens/history` (Role: User)

---

## Phase 6: Notifications

> **Điều kiện:** Phase 3B (Consent) + Phase 4B (Prescriptions) đã xong — notification được trigger từ các sự kiện đó.

- [ ] `schemas.py` — `NotificationResponse`
- [ ] `service.py` — `list_notifications()`, `mark_as_read()`
- [ ] `router.py` — `GET /notifications` (Auth: Bắt buộc), `PATCH /notifications/{id}/read` (Auth: Bắt buộc)

---

## Phase 7: Admin (Trường)

> **Điều kiện:** Phase 3A (Users/Doctors) đã xong — cần dữ liệu doctors để verify.

- [ ] `schemas.py` — `PendingDoctorResponse`, `DoctorVerifyRequest`, `AuditLogResponse`
- [ ] `service.py` — `list_pending_doctors()`, `verify_doctor()`, `get_audit_logs()`
- [ ] `router.py` — `GET /admin/doctors/pending` (Role: Admin), `PATCH /admin/doctors/{id}/verify` (Role: Admin), `GET /admin/audit-logs` (Role: Admin)

---

## Phase 8: Integration & Polish

- [ ] Đăng ký tất cả routers trong `main.py`
- [ ] Viết RLS Policies SQL vào `supabase/policies/`
- [ ] Viết DB Triggers SQL (audit log, prescription_logs auto-generate)
- [ ] **Rate Limiting (`slowapi`):**
  - [ ] Khởi tạo `Limiter` instance trong `app/core/rate_limit.py` (key_func = `get_remote_address`)
  - [ ] Gắn `SlowAPIMiddleware` + `SlowAPIASGIMiddleware` vào `main.py` (global error handler cho 429)
  - [ ] Gắn `@limiter.limit("5/minute")` vào `POST /auth/login`
  - [ ] Gắn `@limiter.limit("10/day")` vào `POST /doctors/request-access`
  - [ ] Gắn rate limit mặc định cho các endpoint nhạy cảm khác (register, emergency access, v.v.)
- [ ] Test toàn bộ luồng qua Swagger UI (`/docs`)
- [ ] Commit & push lên `dev` branch

---

## Bảng phân công tham khảo

| Giai đoạn | Coder 1 | Coder 2 | Coder 3 |
|---|---|---|---|
| **Song song (Tuần 1)** | Phase 3A: Users Self-service | Phase 3B: Consent Module | Phase 3C: Medical Data Self-service |
| **Phase 2 (Tuần 2 - Đang triển khai)** | **Phase 4A:** Doctors Cross-user (Tìm kiếm bệnh nhân, Xin quyền) | **Phase 5 & 7:** Emergency (QR Token) & Admin (Duyệt Bác sĩ) | **Phase 4B:** Medical Data Cross-user (Bác sĩ tạo/xem dữ liệu bệnh nhân) |
| **Phase 3 (Cuối cùng)** | Phase 6: Notifications | Phase 8: Integration & Rate Limit | Phase 8: Integration & Triggers |

---

---

# KẾ HOẠCH TRIỂN KHAI V2.2 — Family Registration, Allergies & Vaccines

> **Điều kiện bắt đầu:** Phase 0–8 (v2.1) đã hoàn thành.
> **Nguồn tham chiếu:** `project_audit.md`, `DB_SCHEMAS.md` (Section 6–8), `API.md` (Section 8–11), `SCHEMAS.md` (Section 12–15).
> **Quy tắc chung:** Tuân thủ toàn bộ Golden Rules trong `module_implement.md`. Không tự ý quyết định, không bỏ qua bước hỏi user khi có mâu thuẫn.

## Sơ đồ phụ thuộc v2.2

```
Phase 9 (Infrastructure) ──→ Phase 10 (SQL Policies + pg_cron)
                                        │
               ┌────────────────────────┤
               ▼                        ▼
     Phase 11A (Allergies)    Phase 11B (Vaccines)    Phase 11C (Family Reg. Endpoints)
               │                        │                        │
               └────────────────────────┴────────────────────────┘
                                        ▼
                               Phase 12 (Updates + Docs)
```

---

## Phase 9: Infrastructure — Migration & Shared Files

> **Mục tiêu:** Tạo đủ nền tảng DB và shared code trước khi viết bất kỳ module mới nào.
> **Điều kiện:** Không phụ thuộc vào phase nào trước.

### 9.1 `app/shared/constants.py` (Tạo mới)

- [ ] Tạo file `app/shared/constants.py`
- [ ] Định nghĩa `VALID_CONSENT_SCOPES` tập trung:

```python
VALID_CONSENT_SCOPES = [
    'blood_type', 'allergies', 'emergency_contact',
    'medical_records', 'prescriptions', 'diaries',
    'heart_rate', 'step_count', 'respiratory_rate',
    'allergies_detail',  # v2.2
    'vaccines',          # v2.2
]
```

- [ ] Cập nhật `consent/schemas.py` và `doctors/service.py` để import từ đây thay vì hard-code.

### 9.2 Alembic Migration — Family Registration

- [ ] Chạy: `alembic revision --autogenerate -m "add family_members and dependent profile support"`
- [ ] Kiểm tra migration file, đảm bảo có:
  - `CREATE TABLE family_members` (guardian_id, member_id, relationship CHECK, is_active, created_at, deleted_at)
  - `ALTER TABLE profiles ADD COLUMN is_dependent BOOLEAN DEFAULT false`
  - `ALTER TABLE profiles ADD COLUMN guardian_id UUID REFERENCES profiles(id)`
  - `ALTER TABLE profiles ADD COLUMN birth_cert_encrypted TEXT`
- [ ] Thêm model `FamilyMember` vào `app/modules/users/models.py`
- [ ] Chạy: `alembic upgrade head`

### 9.3 Alembic Migration — Allergy Reference Table

- [ ] Chạy: `alembic revision -m "add allergy_reference table"`
- [ ] Viết migration thủ công (không autogenerate vì là reference data):

```python
# upgrade():
op.create_table('allergy_reference',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), primary_key=True),
    sa.Column('code', sa.String(50), nullable=False),
    sa.Column('name', sa.String(200), nullable=False),
    sa.Column('category', sa.String(20), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
)
op.create_index('ix_allergy_reference_category', 'allergy_reference', ['category'])
op.create_index('ix_allergy_reference_name', 'allergy_reference', ['name'])
```

- [ ] Thêm model `AllergyReference` vào `app/modules/allergies/models.py` (chuẩn bị sẵn)
- [ ] Chạy: `alembic upgrade head`

### 9.4 Alembic Migration — Allergies & Vaccines Tables

- [ ] Chạy: `alembic revision --autogenerate -m "add allergies and vaccines tables"`
- [ ] Kiểm tra migration file, đảm bảo có đủ:
  - **Bảng `allergies`:** user_id, name, allergy_type CHECK, severity CHECK, reaction, diagnosed_date, diagnosed_by, status CHECK (`pending/confirmed/rejected`), notes, is_active, created_at, updated_at, deleted_at
  - **Bảng `vaccines`:** user_id, vaccine_name, vaccine_code, dose_number, total_doses, administered_date, next_due_date, administered_by, batch_number, manufacturer, notes, recorded_by (NOT NULL), created_at, updated_at, deleted_at
  - Indexes: `allergies(user_id, status)`, `allergies(user_id, is_active)`, `vaccines(user_id, administered_date)`, `vaccines(user_id, next_due_date) WHERE deleted_at IS NULL`
- [ ] Chạy: `alembic upgrade head`

### 9.5 SQL — Cập nhật CHECK Constraints hiện có

> **Lý do:** Alembic không tự detect thay đổi CHECK constraint của bảng đã tồn tại.

- [ ] Tạo `supabase/policies/alter_constraints_v2.sql` với nội dung:

```sql
-- 1. notifications.type: them vaccine_reminder
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN ('access_request','prescription_new','prescription_reminder','emergency_token_expired','vaccine_reminder'));

-- 2. consent scope (kiem tra ten constraint thuc te truoc khi chay)
-- Them 'allergies_detail', 'vaccines' vao danh sach scope hop le
-- (Cap nhat theo constraint hien co cua consent_requests.requested_scope)
```

- [ ] **Yêu cầu user chạy file này trên Supabase Dashboard → SQL Editor.**
- [ ] Xác nhận user đã chạy thành công → tiếp tục.

---

## Phase 10: SQL Policies, Triggers & pg_cron Jobs

> **Điều kiện:** Phase 9 (tất cả Migration) đã chạy thành công trên Supabase.
> **Lưu ý:** Tất cả file SQL phải được user chạy thủ công trên Supabase Dashboard.

### 10.1 RLS Policies — 4 bảng mới

- [ ] Tạo `supabase/policies/rls_family_members.sql`
  - SELECT/INSERT/UPDATE: `auth.uid() = guardian_id`

- [ ] Tạo `supabase/policies/rls_allergies.sql`
  - User SELECT/INSERT/UPDATE: `user_id = auth.uid()`
  - Doctor SELECT (với consent `allergies_detail`): JOIN `consent_permissions`
  - Doctor UPDATE `/confirm`: kiểm tra role doctor + consent

- [ ] Tạo `supabase/policies/rls_vaccines.sql`
  - User SELECT: `user_id = auth.uid()`
  - Doctor INSERT/PATCH: `recorded_by = auth.uid()` + role check
  - Doctor SELECT: `user_id = patient_id` + consent `vaccines`

- [ ] Tạo `supabase/policies/rls_allergy_reference.sql`
  - SELECT: tất cả authenticated users
  - INSERT/UPDATE/DELETE: chỉ Admin (role = 'admin')

- [ ] **Yêu cầu user chạy 4 file SQL trên Supabase Dashboard.**

### 10.2 Audit Triggers — 2 bảng mới

- [ ] Tạo `supabase/policies/audit_trigger_v2.sql`
  - Thêm trigger ghi `data_access_logs` cho bảng `allergies` (INSERT/UPDATE/DELETE)
  - Thêm trigger ghi `data_access_logs` cho bảng `vaccines` (INSERT/UPDATE/DELETE)
  - Pattern giống trigger hiện có cho `medical_records`, `prescriptions`

- [ ] **Yêu cầu user chạy file SQL trên Supabase Dashboard.**

### 10.3 pg_cron — Vaccine Reminder (hàng ngày)

- [ ] Tạo `supabase/policies/pg_cron_vaccine_reminder.sql`

```sql
SELECT cron.schedule(
  'vaccine-reminder-daily',
  '0 0 * * *',
  $$
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    SELECT
      user_id,
      'vaccine_reminder',
      'Lich tiem vaccine sap den',
      'Ban co lich tiem ' || vaccine_name || ' vao ngay ' || next_due_date::text,
      id
    FROM vaccines
    WHERE next_due_date = CURRENT_DATE + INTERVAL '7 days'
      AND deleted_at IS NULL;
  $$
);
```

- [ ] **Yêu cầu user chạy trên Supabase Dashboard.**

### 10.4 pg_cron — Chuyển Account Độc lập (00:00 ngày 01/01 hàng năm)

> **Thiết kế có chủ ý:** Trẻ đủ 18 trong năm phải đợi đến 01/01 năm sau mới được chuyển. Không phải lỗi.

- [ ] Tạo `supabase/policies/pg_cron_dependent_graduation.sql`

```sql
SELECT cron.schedule(
  'dependent-graduation-yearly',
  '0 0 1 1 *',
  $$
    UPDATE profiles
    SET is_dependent = false, guardian_id = NULL
    WHERE is_dependent = true
      AND date_of_birth <= CURRENT_DATE - INTERVAL '18 years';

    UPDATE family_members
    SET is_active = false, deleted_at = now()
    WHERE member_id IN (
      SELECT id FROM profiles
      WHERE is_dependent = false AND guardian_id IS NULL
    ) AND is_active = true;
  $$
);
```

- [ ] **Yêu cầu user chạy trên Supabase Dashboard.**

### 10.5 Seed Data — Allergy Reference

- [ ] Tạo `supabase/policies/seed_allergy_reference.sql`
  - Chèn danh sách thuốc/chất gây dị ứng phổ biến (ATC Code subset + thực phẩm thông thường)
  - Tối thiểu: 50 thuốc phổ biến (Penicillin, Aspirin, Ibuprofen, ...) + 20 thực phẩm + 10 môi trường

- [ ] **Yêu cầu user chạy trên Supabase Dashboard.**

---

## Phase 11: Module Mới — Song song 3 nhánh

> **Điều kiện:** Phase 10 (tất cả SQL Policies) đã được user chạy thành công.
> **Thứ tự xây dựng mỗi module:** `schemas.py → service.py → router.py → gắn vào main.py`

---

### Phase 11A: Module Allergies

> Xem chi tiết endpoint tại `API.md` Section 9, schema tại `SCHEMAS.md` Section 13.

#### 11A.1 `app/modules/allergies/models.py`
- [ ] `Allergy` — map bảng `allergies`
- [ ] `AllergyReference` — map bảng `allergy_reference`

#### 11A.2 `app/modules/allergies/schemas.py`
- [ ] `AllergyCreateRequest` — name (từ reference), allergy_type, severity, reaction, diagnosed_date, notes
- [ ] `AllergyUpdateRequest` — tất cả Optional; **khi update bất kỳ field → service tự set `status = 'pending'`**
- [ ] `AllergyConfirmRequest` — action: `Literal['confirmed', 'rejected']`
- [ ] `AllergyResponse` — đầy đủ fields + status
- [ ] `AllergyReferenceItem` — code, name, category

#### 11A.3 `app/modules/allergies/service.py` (OOP: `AllergiesService`)
- [ ] `create(user_id, data)` — tạo allergy với status = 'pending'
- [ ] `list_own(user_id)` — lấy danh sách của user
- [ ] `list_by_patient(doctor_id, patient_id)` — cần consent `allergies_detail`
- [ ] `update(user_id, allergy_id, data)` — **bắt buộc reset status về 'pending' khi có thay đổi**
- [ ] `confirm(doctor_id, allergy_id, action)` — bác sĩ confirm/reject
- [ ] `soft_delete(user_id, allergy_id)` — set deleted_at
- [ ] `list_reference(query)` — tìm kiếm trong `allergy_reference` theo tên/code

#### 11A.4 `app/modules/allergies/router.py`
- [ ] `POST /allergies` — Auth: User
- [ ] `GET /allergies` — Auth: User (own) hoặc Doctor (patient_id + consent)
- [ ] `PATCH /allergies/{id}` — Auth: User (chủ sở hữu)
- [ ] `PATCH /allergies/{id}/confirm` — Auth: Doctor
- [ ] `DELETE /allergies/{id}` — Auth: User (chủ sở hữu)
- [ ] `GET /allergies/reference` — Auth: Bắt buộc, query param `?query=`

#### 11A.5 Gắn vào `app/main.py`
- [ ] Import và `app.include_router(allergies_router)`

---

### Phase 11B: Module Vaccines

> Xem chi tiết endpoint tại `API.md` Section 10, schema tại `SCHEMAS.md` Section 14.

#### 11B.1 `app/modules/vaccines/models.py`
- [ ] `Vaccine` — map bảng `vaccines`

#### 11B.2 `app/modules/vaccines/schemas.py`
- [ ] `VaccineCreateRequest` — patient_id, vaccine_name, vaccine_code, dose_number, total_doses, administered_date, next_due_date, administered_by, batch_number, manufacturer, notes
- [ ] `VaccineUpdateRequest` — next_due_date, notes, batch_number (chỉ bác sĩ)
- [ ] `VaccineResponse` — đầy đủ fields + recorded_by

#### 11B.3 `app/modules/vaccines/service.py` (OOP: `VaccinesService`)
- [ ] `create(doctor_id, data)` — bác sĩ tạo, `recorded_by = doctor_id`
- [ ] `list_own(user_id)` — user xem vaccine của mình
- [ ] `list_by_patient(doctor_id, patient_id)` — cần consent `vaccines`
- [ ] `list_upcoming(user_id)` — `next_due_date` trong 30 ngày tới
- [ ] `update(doctor_id, vaccine_id, data)` — chỉ bác sĩ là `recorded_by` mới được sửa
- [ ] `soft_delete(doctor_id, vaccine_id)` — chỉ bác sĩ là `recorded_by`

#### 11B.4 `app/modules/vaccines/router.py`
- [ ] `POST /vaccines` — Auth: Doctor (require_role)
- [ ] `GET /vaccines` — Auth: User (own) hoặc Doctor (patient_id + consent)
- [ ] `GET /vaccines/upcoming` — Auth: User
- [ ] `PATCH /vaccines/{id}` — Auth: Doctor (phải là recorded_by)
- [ ] `DELETE /vaccines/{id}` — Auth: Doctor (phải là recorded_by)

#### 11B.5 Gắn vào `app/main.py`
- [ ] Import và `app.include_router(vaccines_router)`

---

### Phase 11C: Family Registration Endpoints

> Thêm vào các module hiện có, không tạo module mới. Xem `API.md` Section 8, `SCHEMAS.md` Section 12.

#### 11C.1 Thêm Schemas vào `app/modules/auth/schemas.py` và `app/modules/users/schemas.py`
- [ ] `RegisterFamilyMemberRequest` — full_name, date_of_birth, gender, relationship, birth_certificate_number (optional)
- [ ] `FamilyMemberResponse` — member_id, full_name, date_of_birth, gender, relationship
- [ ] `FamilyMemberCreateResponse` — member_id, full_name, relationship, message
- [ ] Cập nhật `SCHEMAS.md` Section 12 nếu có thay đổi

#### 11C.2 Thêm Functions vào `app/modules/auth/service.py`
- [ ] `register_family_member(guardian_id, data)`:
  - Tạo `Profile` mới với `is_dependent=True`, `guardian_id=guardian_id`
  - Mã hóa `birth_cert_encrypted` nếu có số giấy khai sinh (pgp_sym_encrypt)
  - Tạo bản ghi `FamilyMember` liên kết
  - **Không** tạo Supabase Auth account cho trẻ

#### 11C.3 Thêm Functions vào `app/modules/users/service.py`
- [ ] `list_family_members(guardian_id)` — lấy danh sách thành viên gia đình
- [ ] `get_family_member(guardian_id, member_id)` — xem chi tiết (verify guardian_id)
- [ ] `update_family_member(guardian_id, member_id, data)` — cập nhật hồ sơ thành viên

#### 11C.4 Thêm Endpoints vào `app/modules/auth/router.py`
- [ ] `POST /auth/register-family-member` — Auth: User (Guardian)

#### 11C.5 Thêm Endpoints vào `app/modules/users/router.py`
- [ ] `GET /users/me/family` — Auth: User (Guardian)
- [ ] `GET /users/family/{member_id}` — Auth: User (phải là Guardian của member)
- [ ] `PATCH /users/family/{member_id}` — Auth: User (phải là Guardian của member)

#### 11C.6 Cập nhật `app/modules/prescriptions/service.py` và `router.py`
> Xem `API.md` Section 11 — Prescription Stats.

- [ ] Thêm function `get_stats(user_id, prescription_id)` — tính adherence rate từ `prescription_logs`
- [ ] Thêm endpoint `GET /prescription-logs/stats` — Auth: User hoặc Doctor (consent `prescriptions`)
- [ ] Thêm `PrescriptionStatsResponse`, `PrescriptionItemStatsResponse` vào `prescriptions/schemas.py`

---

## Phase 12: Cập nhật Code Hiện có & Docs

> **Điều kiện:** Phase 11 (các module mới) đã hoàn thành.
> **Mục tiêu:** Đồng bộ code hiện có với dữ liệu mới và cập nhật toàn bộ tài liệu.

### 12.1 Cập nhật `app/modules/emergency/service.py`

- [ ] Sửa logic lấy dữ liệu allergies trong `access_by_token()`:
  - Query bảng `allergies` WHERE `status='confirmed' AND is_active=true AND deleted_at IS NULL`
  - Nếu có kết quả → trả về `list[AllergyBriefItem]`
  - Nếu rỗng → fallback về `profiles.allergies` (text cũ)

### 12.2 Cập nhật `app/modules/users/service.py`

- [ ] Sửa `update_privacy()`: thêm xử lý field `show_vaccines` trong JSONB merge

### 12.3 Cập nhật `app/modules/doctors/service.py`

- [ ] Sửa `search_patients()`: mặc định lọc `WHERE is_dependent = false` (chỉ tìm Guardian)
- [ ] Hỗ trợ query param `?type=dependent` để tìm children profiles (nếu cần)

### 12.4 Cập nhật Schemas (SCHEMAS.md + code tương ứng)

- [ ] `UserBrief` — xóa `email` và `phone_number` (không lưu trong profiles). Chỉ giữ `id`, `role`
- [ ] `EmergencyAccessResponse` — thêm `AllergyBriefItem`, đổi `allergies: str` → `allergies: list[AllergyBriefItem]`, giữ `allergies_legacy: str` làm fallback
- [ ] `PrivacyUpdateRequest` — thêm `show_vaccines: Optional[bool] = None`
- [ ] `PatientPublicResponse` — thêm `profile_type: Literal['guardian', 'dependent']`
- [ ] Cập nhật `SCHEMAS.md` tất cả section tương ứng

### 12.5 Cập nhật Tài liệu

- [ ] `SYSTEM_DESIGN_SSOT.md`:
  - Đổi version `v2.1` → `v2.2`
  - Thêm `allergies/`, `vaccines/` vào Directory Structure
  - Thêm Guardian/Dependent vào Section 2 (Roles)
  - Thêm endpoints v2.2 vào Section 5
  - Thêm `vaccine_reminder` vào Notification Types
  - Thêm `birth_cert_encrypted` vào danh sách encrypted fields
- [ ] `API_FLOW.md`:
  - Flow: Guardian đăng ký trẻ em → Bác sĩ xem hồ sơ → Bác sĩ nhập vaccine
  - Flow: User thêm dị ứng (pending) → Bác sĩ xác nhận → Hiển thị trên Emergency QR

### 12.6 Checklist Cuối (v2.2)

- [ ] Tất cả module mới có logger đúng chuẩn (logger trước mỗi `return`)
- [ ] Tất cả function là `async def`
- [ ] Service chỉ dùng `flush()`, không `commit()`
- [ ] Prefix khai báo trong `router.py`, không phải `main.py`
- [ ] Không có f-string nối SQL trực tiếp (phòng SQL Injection)
- [ ] RLS Policies đã được user xác nhận chạy thành công
- [ ] Audit Triggers đã được user xác nhận chạy thành công
- [ ] pg_cron Jobs đã được user xác nhận chạy thành công
- [ ] Test toàn bộ luồng v2.2 qua Swagger UI (`/docs`)
- [ ] Commit & push lên `dev` branch
