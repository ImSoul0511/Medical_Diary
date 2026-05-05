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
4. **Error Handling:** Trả lỗi theo format chuẩn `ErrorResponse` đã định nghĩa trong `SCHEMAS.md` (mục 0).
5. **Soft Delete:** Mọi DELETE đều chỉ cập nhật cột `deleted_at`. Query SELECT phải lọc `WHERE deleted_at IS NULL`.

---

## Phase 0: Shared Utilities (Ưu tiên cao nhất)

> Các module nghiệp vụ sẽ import từ đây, nên phải hoàn thành trước.

### 0.1 `app/shared/schemas.py`
- [ ] `ErrorResponse` — Format lỗi chuẩn hóa
- [ ] `PaginatedResponse[T]` — Phân trang generic
- [ ] `MessageResponse` — Response đơn giản `{"message": "..."}`

### 0.2 `app/shared/dependencies.py` (Tạo mới)
- [ ] `get_current_user()` — Dependency giải mã JWT, trả về user object từ DB
- [ ] `require_role(role)` — Dependency kiểm tra role (user/doctor/admin)
- [ ] `get_supabase_client()` — Dependency cung cấp Supabase Client (cho Auth/Storage)

---

## Phase 1: Auth Module (Nền tảng — Các module khác phụ thuộc vào đây)

### 1.1 `app/modules/auth/schemas.py`
- [ ] `LoginRequest`, `LoginResponse`
- [ ] `RegisterRequest`, `RegisterDoctorRequest`
- [ ] `SessionInfo`, `SessionListResponse`

### 1.2 `app/modules/auth/service.py`
- [ ] `login()` — Gọi Supabase Auth `sign_in_with_password`
- [ ] `register()` — Gọi Supabase Auth `sign_up` + tạo `Profile` trong DB
- [ ] `register_doctor()` — Như register + tạo bản ghi `Doctor` (pending_verification)
- [ ] `logout()` — Invalidate session hiện tại
- [ ] `revoke_all_sessions()` — Invalidate tất cả sessions
- [ ] `list_sessions()` — Lấy danh sách sessions

### 1.3 `app/modules/auth/router.py`
- [ ] `POST /auth/login`
- [ ] `POST /auth/register`
- [ ] `POST /auth/register/doctor`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/revoke-all`
- [ ] `GET /auth/sessions`

### 1.4 Đăng ký router trong `app/main.py`
- [ ] `app.include_router(auth_router, prefix="/auth", tags=["Auth"])`

---

## Phase 2: Users & Doctors (Quản lý hồ sơ)

### 2.1 `app/modules/users/schemas.py`
- [ ] `ProfileResponse`, `UpdateProfileRequest`
- [ ] `PrivacySettingsUpdate`
- [ ] `ExportDataResponse`
- [ ] `AccessHistoryResponse`

### 2.2 `app/modules/users/service.py`
- [ ] `get_profile()`, `update_profile()`
- [ ] `update_privacy_settings()`
- [ ] `export_data()` — Truy vấn nhiều bảng, trả JSON/PDF
- [ ] `get_access_history()` — Đọc từ `data_access_logs`

### 2.3 `app/modules/users/router.py`
- [ ] `GET /users/me`, `PATCH /users/me`
- [ ] `PATCH /users/privacy`
- [ ] `GET /users/me/export`
- [ ] `GET /users/me/access-history`

### 2.4 `app/modules/doctors/schemas.py`
- [ ] `DoctorSearchResult`
- [ ] `PatientSearchResult`, `PatientDetailResponse`

### 2.5 `app/modules/doctors/service.py`
- [ ] `search_patients()` — Tìm bệnh nhân qua SĐT/CCCD (giải mã pgcrypto)
- [ ] `get_patient_detail()` — Xem hồ sơ bệnh nhân (kiểm tra consent)
- [ ] `search_doctors()` — User tìm bác sĩ (chỉ trả public info)

### 2.6 `app/modules/doctors/router.py`
- [ ] `GET /doctors/search-patients`
- [ ] `GET /users/{id}`
- [ ] `GET /users/search-doctors`
- [ ] `POST /doctors/request-access`

---

## Phase 3: Consent (Cấp & Thu hồi quyền)

### 3.1 `app/modules/consent/schemas.py`
- [ ] `ConsentRequestResponse`, `ConsentHistoryResponse`
- [ ] `ReviewConsentRequest` (approve/reject + scope)

### 3.2 `app/modules/consent/service.py`
- [ ] `create_access_request()` — Doctor gửi yêu cầu
- [ ] `list_pending_requests()` — Patient xem yêu cầu chờ duyệt
- [ ] `review_request()` — Patient duyệt/từ chối
- [ ] `revoke_permission()` — Patient thu hồi quyền
- [ ] `get_consent_history()` — Danh sách bác sĩ đang có quyền

### 3.3 `app/modules/consent/router.py`
- [ ] `GET /consent/access-requests`
- [ ] `PATCH /consent/access-requests/{id}`
- [ ] `POST /consent/revoke/{doctor_id}`
- [ ] `GET /consent/history`

---

## Phase 4: Medical Data (Dữ liệu y tế — Chạy song song)

> 4 module này độc lập nhau, có thể triển khai song song.

### 4.1 Health Metrics
- [ ] `schemas.py` — `CreateHealthMetric`, `HealthMetricResponse`
- [ ] `service.py` — `create()`, `list_by_user()`, `list_by_patient()` (doctor + consent check)
- [ ] `router.py` — `POST /health-metrics`, `GET /health-metrics`

### 4.2 Diaries
- [ ] `schemas.py` — `CreateDiary`, `DiaryResponse`
- [ ] `service.py` — `create()`, `list_by_user()`, `list_by_patient()`, `soft_delete()`
- [ ] `router.py` — `POST /diaries`, `GET /diaries`, `DELETE /diaries/{id}`

### 4.3 Medical Records
- [ ] `schemas.py` — `CreateMedicalRecord`, `MedicalRecordResponse`
- [ ] `service.py` — `create()` (doctor only, no consent needed), `list_by_patient()`
- [ ] `router.py` — `POST /medical-records`, `GET /medical-records/{user_id}`

### 4.4 Prescriptions
- [ ] `schemas.py` — `CreatePrescription`, `CreatePrescriptionItem`, `PrescriptionLogUpdate`
- [ ] `service.py` — `create_prescription()`, `add_item()`, `list_by_patient()`, `update_log_status()`
- [ ] `router.py` — `POST /prescriptions`, `POST /prescriptions/{id}/items`, `GET /prescriptions`, `GET /prescription-logs`, `PATCH /prescription-logs/{log_id}`, `DELETE /prescriptions/{id}`

---

## Phase 5: Emergency (QR Token)

- [ ] `schemas.py` — `CreateTokenRequest`, `TokenResponse`, `EmergencyProfileResponse`
- [ ] `service.py` — `create_token()`, `list_tokens()`, `update_token()`, `revoke_token()`, `access_by_token()`, `get_access_history()`
- [ ] `router.py` — `POST /emergency/token`, `GET /emergency/tokens`, `PATCH /emergency/tokens/{id}`, `DELETE /emergency/tokens/{id}`, `GET /emergency/access/{token}`, `GET /emergency/tokens/history`

---

## Phase 6: Notifications

- [ ] `schemas.py` — `NotificationResponse`
- [ ] `service.py` — `list_notifications()`, `mark_as_read()`
- [ ] `router.py` — `GET /notifications`, `PATCH /notifications/{id}/read`

---

## Phase 7: Admin

- [ ] `schemas.py` — `PendingDoctorResponse`, `VerifyDoctorRequest`, `AuditLogResponse`
- [ ] `service.py` — `list_pending_doctors()`, `verify_doctor()`, `get_audit_logs()`
- [ ] `router.py` — `GET /admin/doctors/pending`, `PATCH /admin/doctors/{id}/verify`, `GET /admin/audit-logs`

---

## Phase 8: Integration & Polish

- [ ] Đăng ký tất cả routers trong `main.py`
- [ ] Viết RLS Policies SQL vào `supabase/policies/`
- [ ] Viết DB Triggers SQL (audit log, prescription_logs auto-generate)
- [ ] Test toàn bộ luồng qua Swagger UI (`/docs`)
- [ ] Commit & push lên `dev` branch
