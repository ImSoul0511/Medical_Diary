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

## Phase 2: Consent Helper (1 người — Làm trước khi tách nhóm)

> Đây là hàm chia sẻ duy nhất giữa Phase 3A/3B/3C. Tạo xong file này thì 3 coder có thể chạy song song.

### 2.1 `app/shared/consent.py` (Tạo mới)
- [ ] `check_consent(db, doctor_id, patient_id, required_scope)` — Kiểm tra bác sĩ có quyền truy cập scope cụ thể của bệnh nhân không. Đọc trực tiếp từ bảng `consent_permissions`.

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

### Phase 3A: Users Self-service (Coder 1)

> User quản lý hồ sơ CỦA CHÍNH MÌNH. Không cần consent.

#### 3A.1 `app/modules/users/schemas.py`
- [ ] `UserProfileResponse`, `UserProfileUpdateRequest`
- [ ] `PrivacyUpdateRequest`
- [ ] `AccessHistoryResponse` (`AccessHistoryItem`)
- [ ] `DoctorPublicResponse` (dùng cho search-doctors)

#### 3A.2 `app/modules/users/service.py`
- [ ] `get_profile(user_id)` — Lấy thông tin cá nhân
- [ ] `update_profile(user_id, data)` — Cập nhật hồ sơ
- [ ] `update_privacy(user_id, data)` — Cập nhật privacy_settings
- [ ] `export_data(user_id, format, scope)` — Xuất dữ liệu (JSON/PDF)
- [ ] `get_access_history(user_id)` — Xem lịch sử ai đã truy cập (đọc `data_access_logs`)
- [ ] `search_doctors(name, specialty)` — User tìm bác sĩ (chỉ public info)

#### 3A.3 `app/modules/users/router.py`
- [ ] `GET /users/me` — Auth: Bắt buộc
- [ ] `PATCH /users/me` — Auth: Bắt buộc
- [ ] `PATCH /users/privacy` — Auth: Bắt buộc
- [ ] `GET /users/me/export` — Auth: Bắt buộc
- [ ] `GET /users/me/access-history` — Auth: Bắt buộc
- [ ] `GET /users/search-doctors` — Auth: Bắt buộc (Role: User)

---

### Phase 3B: Consent Module (Coder 2)

> Quản lý cấp/thu hồi quyền truy cập giữa User và Doctor.

#### 3B.1 `app/modules/consent/schemas.py`
- [ ] `AccessRequestItem` — Thông tin yêu cầu truy cập
- [ ] `AccessRequestActionRequest` — Duyệt/từ chối (action + approved_scope)
- [ ] `ConsentHistoryItem` — Bác sĩ đang có quyền gì

#### 3B.2 `app/modules/consent/service.py`
- [ ] `list_pending_requests(patient_id)` — Patient xem yêu cầu chờ duyệt
- [ ] `review_request(request_id, patient_id, action, approved_scope)` — Patient duyệt/từ chối
- [ ] `revoke_permission(patient_id, doctor_id)` — Patient thu hồi quyền
- [ ] `get_consent_history(patient_id)` — Danh sách bác sĩ đang có quyền

#### 3B.3 `app/modules/consent/router.py`
- [ ] `GET /consent/access-requests` — Auth: Bắt buộc (Role: User)
- [ ] `PATCH /consent/access-requests/{id}` — Auth: Bắt buộc (Role: User)
- [ ] `POST /consent/revoke/{doctor_id}` — Auth: Bắt buộc (Role: User)
- [ ] `GET /consent/history` — Auth: Bắt buộc (Role: User)

---

### Phase 3C: Medical Data Self-service (Coder 3)

> User tự quản lý dữ liệu y tế CỦA CHÍNH MÌNH. Không cần consent.
> 4 sub-module bên dưới cũng độc lập nhau.

#### 3C.1 Health Metrics (User tự ghi/xem)
- [ ] `schemas.py` — `HealthMetricCreateRequest`, `HealthMetricResponse`
- [ ] `service.py` — `create(user_id, data)`, `list_own(user_id, filters)`
- [ ] `router.py` — `POST /health-metrics` (Role: User), `GET /health-metrics` (không có patient_id)

#### 3C.2 Diaries (User tự viết/xem/xóa)
- [ ] `schemas.py` — `DiaryCreateRequest`, `DiaryResponse`, `SymptomEntry`
- [ ] `service.py` — `create(user_id, data)`, `list_own(user_id, filters)`, `soft_delete(user_id, diary_id)`
- [ ] `router.py` — `POST /diaries` (Role: User), `GET /diaries` (không có patient_id), `DELETE /diaries/{id}` (Chủ sở hữu)

#### 3C.3 Prescriptions (User tự xem đơn thuốc + cập nhật trạng thái uống)
- [ ] `schemas.py` — `PrescriptionResponse`, `PrescriptionItemResponse`, `PrescriptionLogResponse`, `PrescriptionLogUpdateRequest`
- [ ] `service.py` — `list_own_prescriptions(user_id)`, `list_logs(user_id, prescription_id)`, `update_log_status(user_id, log_id, data)`
- [ ] `router.py` — `GET /prescriptions` (Role: User), `GET /prescription-logs` (Role: User), `PATCH /prescription-logs/{log_id}` (Role: User)

#### 3C.4 Medical Records (User tự xem hồ sơ bệnh án của mình)
- [ ] `schemas.py` — `MedicalRecordResponse`
- [ ] `service.py` — `list_own_records(user_id)`
- [ ] `router.py` — (Endpoint xem hồ sơ bệnh án của chính mình — sẽ ghép chung với GET ở Phase 4B)

---

## Phase 4: Cross-user Features (Sau khi Phase 3B hoàn thành)

> **Điều kiện:** Phase 3B (Consent) đã xong → bảng `consent_permissions` có dữ liệu để test.
> Các function ở phase này đều cần gọi `check_consent()` từ `app/shared/consent.py`.
> **2 nhánh sau ĐỘC LẬP, có thể làm đồng thời.**

---

### Phase 4A: Doctors Cross-user (Coder 1 hoặc 2)

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

### Phase 4B: Medical Data Cross-user (Coder 3)

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

## Phase 5: Emergency (QR Token)

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

## Phase 7: Admin

> **Điều kiện:** Phase 3A (Users/Doctors) đã xong — cần dữ liệu doctors để verify.

- [ ] `schemas.py` — `PendingDoctorResponse`, `DoctorVerifyRequest`, `AuditLogResponse`
- [ ] `service.py` — `list_pending_doctors()`, `verify_doctor()`, `get_audit_logs()`
- [ ] `router.py` — `GET /admin/doctors/pending` (Role: Admin), `PATCH /admin/doctors/{id}/verify` (Role: Admin), `GET /admin/audit-logs` (Role: Admin)

---

## Phase 8: Integration & Polish

- [ ] Đăng ký tất cả routers trong `main.py`
- [ ] Viết RLS Policies SQL vào `supabase/policies/`
- [ ] Viết DB Triggers SQL (audit log, prescription_logs auto-generate)
- [ ] Test toàn bộ luồng qua Swagger UI (`/docs`)
- [ ] Commit & push lên `dev` branch

---

## Bảng phân công tham khảo

| Giai đoạn | Coder 1 | Coder 2 | Coder 3 |
|---|---|---|---|
| **Song song (Tuần 1)** | Phase 3A: Users Self-service | Phase 3B: Consent Module | Phase 3C: Medical Data Self-service |
| **Song song (Tuần 2)** | Phase 4A: Doctors Cross-user | Phase 5: Emergency HOẶC Phase 7: Admin | Phase 4B: Medical Data Cross-user |
| **Cuối cùng** | Phase 6: Notifications | Phase 8: Integration | Phase 8: Integration |
