from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.consent.schemas import ConsentScope, VALID_CONSENT_SCOPES


class PatientPublicResponse(BaseModel):
    """Kết quả tìm kiếm bệnh nhân — chỉ trả về thông tin cơ bản."""

    id: UUID
    full_name: str
    gender: str


class PatientProfileResponse(BaseModel):
    """Hồ sơ chi tiết bệnh nhân — chỉ trả về khi bác sĩ có consent hợp lệ."""

    full_name: str
    gender: str
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None


class RequestAccessRequest(BaseModel):
    """Body cho POST /doctors/request-access — Bác sĩ gửi yêu cầu truy cập."""

    patient_id: UUID
    requested_scope: list[ConsentScope] = Field(
        ...,
        min_length=1,
        description="Danh sách scope yêu cầu truy cập. Các giá trị hợp lệ: blood_type, allergies, emergency_contact, medical_records, prescriptions, diaries, heart_rate, step_count, respiratory_rate",
    )
    reason: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Lý do lâm sàng cho yêu cầu truy cập",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "patient_id": "string",
                "requested_scope": [
                    "blood_type",
                    "allergies",
                    "emergency_contact",
                    "medical_records",
                    "prescriptions",
                    "diaries",
                    "heart_rate",
                    "step_count",
                    "respiratory_rate"
                ],
                "reason": "Yêu cầu quyền truy cập để xem lịch sử y tế và các chỉ số sức khỏe phục vụ chẩn đoán bệnh."
            }
        }
    }

    @field_validator("requested_scope")
    @classmethod
    def validate_scope(cls, value: list[ConsentScope]) -> list[ConsentScope]:
        invalid = set(value) - VALID_CONSENT_SCOPES
        if invalid:
            raise ValueError(f"Invalid consent scopes: {sorted(invalid)}")
        return value


class RequestAccessResponse(BaseModel):
    """Xác nhận sau khi tạo consent request thành công."""

    request_id: UUID
    status: str
    created_at: datetime
