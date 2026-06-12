# Phân tích Kế hoạch v2.2 vs Codebase Hiện tại

> **Phạm vi:** Task 1 (Family Registration cho trẻ em) + Task 2 (Allergies, Vaccines, Prescription Stats)
> **Ngày phân tích:** 2026-06-11
> **Source:** [task1_v2_2/](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/.claude/tasks/task1_v2_2)

---

## 📊 Tổng hợp nhanh: Những gì ĐÃ THAY ĐỔI

Kế hoạch cũ được viết dựa trên trạng thái codebase trước đó. Kể từ khi kế hoạch được soạn, codebase đã có **12 thay đổi quan trọng** ảnh hưởng trực tiếp đến kế hoạch triển khai.

| # | Thay đổi | Ảnh hưởng đến Phase |
|---|----------|---------------------|
| 1 | Gender dùng `'male'/'female'` thay vì `'NAM'/'Nữ'` | Phase 11C |
| 2 | `UserBrief` không có `email` và `phone_number` | ✅ Đã khớp |
| 3 | Consent Scopes đã centralized bằng `Literal` type + `VALID_CONSENT_SCOPES` set | Phase 9 |
| 4 | Auth schemas đã thêm password flows (forgot, change, reset) | Phase 11C |
| 5 | Emergency tokens đã có per-token visibility (`show_blood_type`, etc.) | Phase 12 |
| 6 | `DoctorService.search_patients()` tìm bằng `phone_number` (không phải CCCD) | Phase 12 |
| 7 | `PrescriptionItemCreateRequest` đã đổi cấu trúc (`custom_logs`, `start_date`) | Phase 11C |
| 8 | `PrescriptionResponse` thêm `patient_name`, `doctor_hospital`, `doctor_specialty` | Phase 11C |
| 9 | `doctors/schemas.py` import scope từ `consent/schemas.py` (không phải `constants.py`) | Phase 9 |
| 10 | `profiles` model không có `models.py` trong `auth/` (auth module không có models) | Phase 11C |
| 11 | `PrivacyUpdateRequest` chưa có `show_vaccines` | Phase 12 |
| 12 | Consent scopes đã thêm `manual_health_records` (không có trong kế hoạch cũ) | Phase 9 |

---

## 🔍 Phân tích Chi tiết Từng Discrepancy

### 1. Gender Values — `'male'/'female'` thay vì `'NAM'/'Nữ'`

> [!WARNING]
> Kế hoạch cũ viết `Literal['NAM', 'Nữ']` nhưng codebase hiện tại dùng `'male'/'female'`.

**Kế hoạch cũ:**
```python
# feature_brainstorm.md, SCHEMAS.md
gender: Literal['NAM', 'Nữ']
```

**Codebase hiện tại:**
- [models.py:L46](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/users/models.py#L46): `CheckConstraint("gender IN ('male', 'female')")`
- [users/schemas.py:L22](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/users/schemas.py#L22): `Literal['male', 'female']`
- [auth/schemas.py:L40](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/auth/schemas.py#L40): `gender: str` (no Literal, nhưng example dùng `"male"`)

**Ảnh hưởng:** `RegisterFamilyMemberRequest` trong kế hoạch cũ dùng `Literal['NAM', 'Nữ']` → phải sửa thành `Literal['male', 'female']`.

---

### 2. UserBrief — Đã loại bỏ `email` và `phone_number`

**Kế hoạch cũ (SCHEMAS.md):**
```python
class UserBrief(BaseModel):
    id: UUID
    role: str
    email: EmailStr       # ← plan nói giữ
    phone_number: str     # ← plan nói giữ
```

**Codebase hiện tại — [auth/schemas.py:L19-21](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/auth/schemas.py#L19-L21):**
```python
class UserBrief(BaseModel):
    id: UUID
    role: str  # user / doctor / admin
```

**Ảnh hưởng:** Kế hoạch 12.4 nói "xóa `email` và `phone_number` khỏi `UserBrief`" → **đã được thực hiện rồi**. ✅ Không cần làm gì thêm.

---

### 3. Consent Scopes — Đã centralized nhưng KHÁC cách kế hoạch đề xuất

> [!IMPORTANT]
> Đây là thay đổi quan trọng nhất. Kế hoạch đề xuất tạo `app/shared/constants.py`, nhưng codebase hiện tại đã centralize scopes trong `consent/schemas.py` bằng `Literal` type.

**Kế hoạch cũ (Phase 9.1):** Tạo `app/shared/constants.py` với list VALID_CONSENT_SCOPES

**Codebase hiện tại — [consent/schemas.py:L8-21](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/consent/schemas.py#L8-L21):**
```python
ConsentScope = Literal[
    "blood_type", "allergies", "emergency_contact",
    "medical_records", "prescriptions", "diaries",
    "heart_rate", "step_count", "respiratory_rate",
    "manual_health_records",  # ← Không có trong kế hoạch cũ!
]
VALID_CONSENT_SCOPES = set(get_args(ConsentScope))
```

**Ai import:**
- [doctors/schemas.py:L7](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/doctors/schemas.py#L7): `from app.modules.consent.schemas import ConsentScope, VALID_CONSENT_SCOPES`

**Cập nhật cần làm:**
- **KHÔNG tạo** `app/shared/constants.py` — giữ nguyên pattern hiện tại
- Thêm 2 scope mới `"allergies_detail"` và `"vaccines"` vào `ConsentScope` Literal trong `consent/schemas.py`
- Scope `"manual_health_records"` (có trong codebase, không có trong kế hoạch) — **giữ nguyên**

---

### 4. Auth Module — Đã thêm nhiều chức năng password

**Kế hoạch cũ nói Auth đã hoàn thành (Phase 1 ✅)**

**Codebase hiện tại thêm:**
- `ForgotPasswordRequest`, `ChangePasswordRequest`, `ResetPasswordRequest` — [auth/schemas.py:L93-101](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/auth/schemas.py#L93-L101)
- `forgot_password()`, `change_password()`, `reset_password()`, `refresh_session()` — [auth/service.py](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/auth/service.py)

**Ảnh hưởng:** Khi thêm `register_family_member()` vào `auth/service.py` (Phase 11C), cần lưu ý file đã lớn hơn kế hoạch dự kiến (~353 dòng). Cần import cẩn thận.

---

### 5. Emergency Tokens — Per-token Visibility

> [!NOTE]
> Emergency tokens đã có cơ chế visibility riêng (`show_blood_type`, `show_allergies`, `show_emergency_contact` per token), KHÔNG chỉ dựa vào `privacy_settings` của profile.

**Kế hoạch cũ (feature_brainstorm.md):**
```python
# Nếu privacy_settings.show_allergies = true → hiển thị allergies
```

**Codebase hiện tại — [emergency/service.py:L220-236](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/emergency/service.py#L220-L236):**
```python
# Token-specific settings can only narrow the user's global privacy settings.
blood_type = (
    profile.blood_type
    if token.show_blood_type and self._profile_allows_public_field(profile, "show_blood_type")
    else None
)
```

**Ảnh hưởng trên Phase 12.1:**
- Khi cập nhật `access_by_token()` để JOIN bảng `allergies`, logic phải kiểm tra **CẢ HAI** điều kiện:
  1. `token.show_allergies == True`
  2. `profile.privacy_settings["show_allergies"] == True`
- Kế hoạch cũ chỉ nói kiểm tra `privacy_settings` → **cần cập nhật logic**

---

### 6. DoctorService.search_patients() — Tìm bằng phone, không phải CCCD

**Kế hoạch cũ (Phase 12.3):**
```python
# Sửa search_patients(): mặc định lọc WHERE is_dependent = false
```

**Codebase hiện tại — [doctors/service.py:L31-54](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/doctors/service.py#L31-L54):**
- Tìm bằng `phone_number` (giải mã pgcrypto), KHÔNG tìm bằng `cccd`
- Không có tìm bằng `name` (khác với kế hoạch nói `phone=0987...&cccd=012...`)
- Đã filter `Profile.role == "user"`

**Cập nhật cần làm cho Phase 12.3:**
- Thêm điều kiện `Profile.is_dependent == False` (sau khi thêm cột)
- Hoặc hỗ trợ param `include_dependents=true` để tìm cả profile trẻ em

---

### 7. PrescriptionItemCreateRequest — Cấu trúc đã thay đổi

**Kế hoạch cũ (SCHEMAS.md):**
```python
class PrescriptionItemCreateRequest(BaseModel):
    medication_name: str
    dosage: str
    duration_days: int = Field(..., ge=1, le=365)
    scheduled_times: list[str] = Field(..., min_length=1)
```

**Codebase hiện tại — [prescriptions/schemas.py:L13-32](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/prescriptions/schemas.py#L13-L32):**
```python
class PrescriptionItemCreateRequest(BaseModel):
    medication_name: str
    dosage: str
    duration_days: Optional[int] = Field(None, gt=0)        # ← Optional, không required!
    scheduled_times: Optional[list[str]] = None              # ← Optional!
    start_date: Optional[date] = None                        # ← MỚI
    custom_logs: Optional[list[CustomLogCreate]] = None      # ← MỚI (chế độ thủ công)
```

**Ảnh hưởng trên Phase 11C.6 (Prescription Stats):**
- `PrescriptionStatsResponse` vẫn hoạt động được vì đọc từ `prescription_logs` (không phụ thuộc cách tạo)
- Nhưng cần test trường hợp `custom_logs` — dữ liệu prescription logs có thể không đều đặn

---

### 8. PrescriptionResponse — Thêm nhiều fields

**Kế hoạch cũ:**
```python
class PrescriptionResponse(BaseModel):
    doctor_name: str
```

**Codebase hiện tại — [prescriptions/schemas.py:L59-69](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/prescriptions/schemas.py#L59-L69):**
```python
class PrescriptionResponse(BaseModel):
    patient_name: Optional[str] = None      # ← MỚI
    doctor_hospital: Optional[str] = None   # ← MỚI
    doctor_specialty: Optional[str] = None  # ← MỚI
```

**Ảnh hưởng:** Không ảnh hưởng trực tiếp đến v2.2, nhưng `PrescriptionStatsResponse` cần đảm bảo consistent.

---

### 9. Consent Scope có thêm `manual_health_records`

**Kế hoạch cũ:** 9 scopes gốc + 2 mới (`allergies_detail`, `vaccines`)

**Codebase hiện tại:** 10 scopes (đã thêm `manual_health_records`)

**Ảnh hưởng:** Khi thêm 2 scope v2.2, tổng sẽ là **12 scopes** (không phải 11 như kế hoạch cũ dự kiến). Cần cập nhật bảng tổng hợp.

---

### 10. Auth Module KHÔNG có `models.py`

**Kế hoạch cũ (Phase 11C.2):** "Thêm Functions vào `app/modules/auth/service.py`"

**Codebase hiện tại:** `auth/` chỉ có `router.py`, `schemas.py`, `service.py` — KHÔNG có `models.py`. Profile model nằm ở `users/models.py`.

**Ảnh hưởng:** `register_family_member()` trong `auth/service.py` cần import `Profile` từ `users/models.py` (giống `register()` hiện tại dùng raw SQL) và import `FamilyMember` model (cần tạo mới trong `users/models.py`).

---

### 11. PrivacyUpdateRequest — Chưa có `show_vaccines`

**Codebase hiện tại — [users/schemas.py:L51-54](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/users/schemas.py#L51-L54):**
```python
class PrivacyUpdateRequest(BaseModel):
    show_blood_type: Optional[bool] = None
    show_allergies: Optional[bool] = None
    show_emergency_contact: Optional[bool] = None
    # ← THIẾU show_vaccines
```

**Cập nhật Phase 12.2:** Thêm `show_vaccines: Optional[bool] = None` ✅

---

### 12. `UserProfileResponse` có `email`, `phone_number`, `cccd`

**Kế hoạch cũ:** `UserProfileResponse` không có `email`

**Codebase hiện tại — [users/schemas.py:L6-17](file:///d:/2025-2026_Second/TDTT_PROJECT/MEDICAL_DIARY/backend/app/modules/users/schemas.py#L6-L17):**
```python
class UserProfileResponse(BaseModel):
    email: Optional[str] = None       # ← Có!
    phone_number: Optional[str] = None  # ← Có!
    cccd: Optional[str] = None          # ← Có!
```

**Ảnh hưởng:** Khi hiển thị profile trẻ em (dependent), `email` sẽ là `None` (vì không có Supabase Auth account). Điều này tự nhiên hoạt động đúng.

---

## 🛠️ Hướng Giải Quyết — Kế hoạch Cập nhật

### Phase 9: Infrastructure (CẬP NHẬT)

| Task cũ | Trạng thái | Thay đổi |
|---------|-----------|----------|
| 9.1 Tạo `constants.py` | ❌ Bỏ | Thêm scope vào `consent/schemas.py` thay thế |
| 9.2 Migration Family | ✅ Giữ nguyên | Sửa gender values trong docs nếu cần |
| 9.3 Migration Allergy Reference | ✅ Giữ nguyên | — |
| 9.4 Migration Allergies & Vaccines | ✅ Giữ nguyên | — |
| 9.5 SQL ALTER Constraints | ✅ Giữ nguyên | — |

**Phase 9.1 mới:**
```python
# consent/schemas.py — Thêm 2 scope v2.2
ConsentScope = Literal[
    "blood_type", "allergies", "emergency_contact",
    "medical_records", "prescriptions", "diaries",
    "heart_rate", "step_count", "respiratory_rate",
    "manual_health_records",
    "allergies_detail",    # v2.2 — bảng allergies có cấu trúc
    "vaccines",            # v2.2 — lịch sử tiêm chủng
]
```

### Phase 10: SQL Policies (KHÔNG ĐỔI)

Giữ nguyên toàn bộ — các SQL policies không bị ảnh hưởng bởi code changes.

### Phase 11A: Module Allergies (KHÔNG ĐỔI)

Module mới hoàn toàn, không bị ảnh hưởng.

### Phase 11B: Module Vaccines (KHÔNG ĐỔI)

Module mới hoàn toàn, không bị ảnh hưởng.

### Phase 11C: Family Registration (CẬP NHẬT)

| Task cũ | Thay đổi cần thiết |
|---------|-------------------|
| 11C.1 `RegisterFamilyMemberRequest` | Sửa `gender: Literal['male', 'female']` (thay vì `'NAM', 'Nữ'`) |
| 11C.2 `register_family_member()` trong `auth/service.py` | Import `FamilyMember` từ `users/models.py`, raw SQL cho INSERT (giống pattern `register()`) |
| 11C.3 Functions trong `users/service.py` | Cần import `FamilyMember` model mới |
| 11C.4 Endpoint `POST /auth/register-family-member` | Giữ nguyên |
| 11C.5 Endpoints trong `users/router.py` | Giữ nguyên |
| 11C.6 Prescription Stats | Giữ nguyên — `PrescriptionStatsResponse` đọc từ `prescription_logs` |

### Phase 12: Updates (CẬP NHẬT)

| Task cũ | Thay đổi cần thiết |
|---------|-------------------|
| 12.1 Emergency `access_by_token()` | Phải kiểm tra **CẢ** `token.show_allergies` + `profile.privacy_settings["show_allergies"]` khi JOIN bảng `allergies` |
| 12.2 `update_privacy()` | Thêm `show_vaccines` — **không đổi** |
| 12.3 `search_patients()` | Filter `is_dependent=false` vào query hiện tại (dùng phone_number, không phải CCCD) |
| 12.4 Schema updates | `UserBrief` đã đúng ✅. `EmergencyAccessResponse` cần thêm `allergies_structured: Optional[list]` |

---

## ❓ Câu hỏi Cần Quyết định

> [!IMPORTANT]
> **1. Task 1 — Phương án định danh (A hoặc B):**
> Kế hoạch cũ vẫn chưa chọn giữa Phone OTP (A) và CCCD (B). **Cần quyết định trước khi bắt đầu triển khai.** Khuyến nghị: Phương án B (CCCD → email ảo) vì:
> - Không tốn chi phí SMS
> - Phù hợp thực tế VN (mọi công dân ≥14 tuổi đều có CCCD)
> - Codebase hiện tại đã hỗ trợ `cccd_encrypted` trong profiles

> [!IMPORTANT]
> **2. Scope `allergies` vs `allergies_detail`:**
> Kế hoạch có 2 scope: `allergies` (text cũ trong profiles) và `allergies_detail` (bảng mới). Có nên gộp thành 1 scope `allergies` (sử dụng bảng mới, fallback về text cũ) hay giữ riêng?

> [!IMPORTANT]
> **3. Các câu hỏi cũ chưa được trả lời:**
> - Tuổi giới hạn đăng ký hộ gia đình: <15 hay <18?
> - Trẻ đủ 18 có thể tách ra tạo account độc lập không?
> - Bác sĩ có thể tìm thấy profile trẻ em (dependent) không?
> - Allergies: User tự nhập hay chờ bác sĩ?
> - Vaccines: User tự nhập hay chỉ bác sĩ?

---

## 📋 Checklist Hành Động (Theo thứ tự ưu tiên)

- [ ] **Trả lời câu hỏi** — Chọn phương án A hoặc B cho định danh
- [ ] **Cập nhật `consent/schemas.py`** — Thêm 2 scope mới
- [ ] **Tạo `FamilyMember` model** trong `users/models.py`
- [ ] **Chạy Alembic migrations** — 3 migration files
- [ ] **Tạo module `allergies/`** — models, schemas, service, router
- [ ] **Tạo module `vaccines/`** — models, schemas, service, router
- [ ] **Thêm Family endpoints** — auth/service + users/service + routers
- [ ] **Cập nhật Emergency** — Structured allergies in QR
- [ ] **Cập nhật Doctors** — Filter dependent profiles
- [ ] **Cập nhật Privacy** — `show_vaccines`
- [ ] **SQL Policies & Triggers** — 4 RLS + 2 audit + 2 pg_cron
- [ ] **Cập nhật docs** — SSOT, API_FLOW
