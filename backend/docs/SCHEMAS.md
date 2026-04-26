# Bộ Schemas (Pydantic Models) - Medical Diary API

Tài liệu này định nghĩa toàn bộ Pydantic Schemas cho từng module. Mỗi module sử dụng các schemas này trong file `schemas.py` tương ứng.

---

## 0. Shared Schemas (`app/shared/schemas.py`)

### ErrorResponse
```python
class ErrorResponse(BaseModel):
    error_code: str
    message: str
    request_id: str
```

### PaginatedResponse (Generic)
```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
```

### MessageResponse
```python
class MessageResponse(BaseModel):
    message: str
```

---

## 1. Module: Auth (`app/modules/auth/schemas.py`)

### LoginRequest
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
```

### LoginResponse
```python
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief

class UserBrief(BaseModel):
    id: UUID
    role: str   # "user" | "doctor" | "admin"
    email: EmailStr
```

### RegisterRequest
```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
```

### RegisterDoctorRequest
Lưu ý: Endpoint này dùng `multipart/form-data`, không phải JSON thuần.
```python
class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    specialty: str
    license_number: str
    hospital: str
    # certificate_file: UploadFile (xử lý riêng qua FastAPI Form)
```

### RegisterDoctorResponse
```python
class RegisterDoctorResponse(BaseModel):
    id: UUID
    full_name: str
    status: str   # "pending_verification"
    certificate_url: str
```

### SessionResponse
```python
class SessionResponse(BaseModel):
    session_id: UUID
    device: str
    ip_address: str
    last_active: datetime
```

### HealthResponse
```python
class HealthResponse(BaseModel):
    status: str   # "ok"
    timestamp: datetime
```

---

## 2. Module: Users (`app/modules/users/schemas.py`)

### UserProfileResponse
```python
class UserProfileResponse(BaseModel):
    id: UUID
    full_name: str
    blood_type: Optional[str]        # "O+", "AB-", ...
    allergies: Optional[str]
    emergency_contact: Optional[str]
    privacy_settings: dict   # JSONB: {"show_blood_type": true, "show_allergies": true, "show_emergency_contact": false}
```

> **Lưu ý:** `email` không lưu trong `profiles`. Khi cần, JOIN với `auth.users`.

### PrivacyUpdateRequest
```python
class PrivacyUpdateRequest(BaseModel):
    show_blood_type: Optional[bool] = None
    show_allergies: Optional[bool] = None
    show_emergency_contact: Optional[bool] = None
```

### UserProfileUpdateRequest
```python
class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    blood_type: Optional[str] = Field(None, max_length=5)
    allergies: Optional[str] = Field(None, max_length=2000)
    emergency_contact: Optional[str] = Field(None, max_length=20)
```

### AccessHistoryResponse
```python
class AccessHistoryItem(BaseModel):
    doctor_name: str
    action: str           # "SELECT" | "INSERT" | "UPDATE" | "DELETE"
    data_type: str        # "medical_records" | "prescriptions" | "diaries"
    accessed_at: datetime
```

### DoctorPublicResponse (dùng cho `GET /users/search-doctors`)
```python
class DoctorPublicResponse(BaseModel):
    id: UUID
    full_name: str
    specialty: str
    hospital: str
```

---

## 3. Module: Doctors (`app/modules/doctors/schemas.py`)

### PatientPublicResponse (dùng cho `GET /doctors/search-patients`)
```python
class PatientPublicResponse(BaseModel):
    id: UUID
    full_name: str
```

### PatientProfileResponse (dùng cho `GET /users/{id}` - Bác sĩ xem chi tiết)
```python
class PatientProfileResponse(BaseModel):
    id: UUID
    full_name: str
    blood_type: Optional[str]
    allergies: Optional[str]
    emergency_contact: Optional[str]
    # Chỉ trả về các trường Public hoặc được cấp quyền qua Consent
```

### RequestAccessRequest
```python
class RequestAccessRequest(BaseModel):
    patient_id: UUID
    requested_scope: list[str]   # Thêm "blood_type", "allergies", "emergency_contact" nếu muốn xem field chưa public
    reason: str = Field(..., min_length=5, max_length=500)
```

### RequestAccessResponse
```python
class RequestAccessResponse(BaseModel):
    status: str   # "pending"
    message: str
```

---

## 4. Module: Consent (`app/modules/consent/schemas.py`)

### ConsentHistoryResponse
```python
class ConsentHistoryItem(BaseModel):
    doctor_id: UUID
    doctor_name: str
    scope: list[str]       # ["heart_rate", "prescriptions", ...]
    granted_at: datetime
```

### AccessRequestResponse
```python
class AccessRequestItem(BaseModel):
    request_id: UUID
    doctor_id: UUID
    doctor_name: str
    requested_scope: list[str]
    reason: str
    status: str            # "pending" | "approved" | "rejected"
    requested_at: datetime
```

### AccessRequestActionRequest
```python
class AccessRequestActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approved|rejected)$")
    approved_scope: Optional[list[str]] = None
```

---

## 5. Module: Health Metrics (`app/modules/health_metrics/schemas.py`)

### HealthMetricCreateRequest
```python
class HealthMetricCreateRequest(BaseModel):
    heart_rate: Optional[int] = Field(None, ge=30, le=250)
    step_count: Optional[int] = Field(None, ge=0, le=200000)
    respiratory_rate: Optional[int] = Field(None, ge=5, le=60)
    recorded_at: datetime
```

### HealthMetricResponse
```python
class HealthMetricResponse(BaseModel):
    id: UUID
    heart_rate: Optional[int]
    step_count: Optional[int]
    respiratory_rate: Optional[int]
    recorded_at: datetime
```

> **Lưu ý:** `GET /health-metrics` hỗ trợ query param `patient_id` (Optional). Nếu có `patient_id`, hệ thống kiểm tra caller có role `doctor` và consent scope tương ứng. Nếu không có, trả dữ liệu của chính user.

---

## 6. Module: Diaries (`app/modules/diaries/schemas.py`)

### SymptomEntry
```python
class SymptomEntry(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    severity: int = Field(..., ge=1, le=10)
```

### DiaryCreateRequest
```python
class DiaryCreateRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=5000)
    symptoms: Optional[list[SymptomEntry]] = None
    # Validation: ít nhất content hoặc symptoms phải có giá trị
```

### DiaryResponse
```python
class DiaryResponse(BaseModel):
    id: UUID
    content: Optional[str]
    symptoms: Optional[list[SymptomEntry]]
    created_at: datetime
```

> **Lưu ý:** `GET /diaries` hỗ trợ query param `patient_id` (Optional). Nếu có `patient_id`, hệ thống kiểm tra caller có role `doctor` và consent scope `diaries`. Nếu không có, trả dữ liệu của chính user.

---

## 7. Module: Medical Records (`app/modules/medical_records/schemas.py`)

### MedicalRecordCreateRequest
```python
class MedicalRecordCreateRequest(BaseModel):
    patient_id: UUID
    diagnosis: str = Field(..., min_length=3, max_length=2000)
    notes: Optional[str] = Field(None, max_length=5000)
    attachments: Optional[list[str]] = None   # List of Supabase Storage URLs
```

### MedicalRecordResponse
```python
class MedicalRecordResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    diagnosis: str
    notes: Optional[str]
    attachments: Optional[list[str]]
    created_at: datetime
```

---

## 8. Module: Prescriptions (`app/modules/prescriptions/schemas.py`)

### PrescriptionCreateRequest
```python
class PrescriptionCreateRequest(BaseModel):
    patient_id: UUID
    notes: Optional[str] = Field(None, max_length=2000)
```

### PrescriptionItemCreateRequest
```python
class PrescriptionItemCreateRequest(BaseModel):
    medication_name: str = Field(..., min_length=2, max_length=200)
    dosage: str = Field(..., min_length=2, max_length=500)
    duration_days: int = Field(..., ge=1, le=365)
    scheduled_times: list[str] = Field(..., min_length=1)  # VD: ["08:00", "13:00", "20:00"]
    # Model Validator để kiểm tra định dạng HH:MM của scheduled_times
```

### PrescriptionItemResponse
```python
class PrescriptionItemResponse(BaseModel):
    id: UUID
    prescription_id: UUID
    medication_name: str
    dosage: str
    duration_days: int
    scheduled_times: list[str]
    status: str            # "active" | "cancelled"
    created_at: datetime
```

### PrescriptionResponse
```python
class PrescriptionResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    doctor_name: str
    notes: Optional[str]
    items: list[PrescriptionItemResponse]   # Chứa luôn danh sách các loại thuốc
    created_at: datetime
```

### PrescriptionLogUpdateRequest
```python
class PrescriptionLogUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(taken|skipped|untaken)$")
    taken_at: Optional[datetime] = None   # Tự động set = now() nếu status = 'taken' và không truyền
```

> **Lưu ý:** Endpoint là `PATCH /prescription-logs/{log_id}` (cập nhật 1 bản ghi log cụ thể).

### PrescriptionLogResponse
```python
class PrescriptionLogResponse(BaseModel):
    id: UUID
    prescription_item_id: UUID
    medication_name: str       # Lấy từ prescription_items để hiển thị
    scheduled_date: date       # Ngày dự kiến uống thuốc
    scheduled_time: time       # Giờ dự kiến uống thuốc
    status: str                # "untaken" | "taken" | "skipped"
    taken_at: Optional[datetime]   # None nếu chưa uống
```

---

## 9. Module: Emergency (`app/modules/emergency/schemas.py`)

### EmergencyTokenCreateRequest
```python
class EmergencyTokenCreateRequest(BaseModel):
    ttl_minutes: Optional[int] = Field(None, ge=5)   # None = vĩnh viễn (in ra mang theo)
```

### EmergencyTokenResponse
```python
class EmergencyTokenResponse(BaseModel):
    emergency_token: str
    expires_at: Optional[datetime]   # None = vĩnh viễn
```

### EmergencyAccessResponse
```python
class EmergencyAccessResponse(BaseModel):
    full_name: str
    blood_type: Optional[str]
    allergies: Optional[str]
    emergency_contact: Optional[str]
```

### EmergencyTokenListResponse
```python
class EmergencyTokenItem(BaseModel):
    id: UUID
    token: str
    expires_at: Optional[datetime]   # None = vĩnh viễn
    is_expired: bool                 # Computed: True nếu expires_at < now()
    created_at: datetime
```

### EmergencyTokenUpdateRequest
```python
class EmergencyTokenUpdateRequest(BaseModel):
    ttl_minutes: Optional[int] = Field(None, ge=5)   # None = chuyển sang vĩnh viễn
```

### EmergencyAccessLogResponse
```python
class EmergencyAccessLogItem(BaseModel):
    id: UUID
    token_id: UUID
    accessed_at: datetime
```

---

## 10. Module: Admin (`app/modules/admin/schemas.py`)

### PendingDoctorResponse
```python
class PendingDoctorResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    specialty: str
    license_number: str
    certificate_url: str
    registered_at: datetime
    status: str            # "pending_verification"
```

### DoctorVerifyRequest
```python
class DoctorVerifyRequest(BaseModel):
    action: str = Field(..., pattern="^(approved|rejected)$")
    notes: Optional[str] = Field(None, max_length=500)
```

### AuditLogResponse
```python
class AuditLogItem(BaseModel):
    id: UUID
    actor_id: UUID
    actor_name: str
    action: str            # "SELECT" | "INSERT" | "UPDATE" | "DELETE"
    table_name: str
    target_user_id: UUID
    old_data: Optional[dict]
    new_data: Optional[dict]
    created_at: datetime
```

---

## 11. Module: Notifications (`app/modules/notifications/schemas.py`)

### NotificationResponse
```python
class NotificationResponse(BaseModel):
    id: UUID
    type: str              # "access_request" | "prescription_new" | "prescription_reminder" | "emergency_token_expired"
    title: str
    message: str
    is_read: bool
    reference_id: Optional[UUID]   # Trỏ đến bản ghi liên quan (consent_request, prescription, ...)
    created_at: datetime
```

---

## Bảng tổng hợp Consent Scopes

| Scope | Mô tả |
|---|---|
| `blood_type` | Nhóm máu |
| `allergies` | Dị ứng |
| `emergency_contact` | SĐT người thân |
| `medical_records` | Hồ sơ y tế chính thức |
| `prescriptions` | Đơn thuốc |
| `diaries` | Nhật ký cá nhân |
| `heart_rate` | Dữ liệu nhịp tim |
| `step_count` | Số bước chân |
| `respiratory_rate` | Nhịp thở |
