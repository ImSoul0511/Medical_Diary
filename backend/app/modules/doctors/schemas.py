from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.consent.schemas import VALID_CONSENT_SCOPES


class PatientPublicResponse(BaseModel):
    """Kết quả tìm kiếm bệnh nhân — chỉ trả về thông tin cơ bản."""

    id: UUID
    full_name: str
    gender: str


class PatientProfileResponse(BaseModel):
    """Hồ sơ chi tiết bệnh nhân — chỉ trả về khi bác sĩ có consent hợp lệ."""

    id: UUID
    full_name: str
    gender: str
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None
    consent_scope: list[str] = Field(
        default_factory=list,
        description="Danh sách scope mà bác sĩ được phép xem",
    )


class RequestAccessRequest(BaseModel):
    """Body cho POST /doctors/request-access — Bác sĩ gửi yêu cầu truy cập."""

    patient_id: UUID
    requested_scope: list[str] = Field(
        ...,
        min_length=1,
        description="Ít nhất 1 scope hợp lệ (VD: blood_type, allergies, medical_records, ...)",
    )
    reason: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Lý do lâm sàng cho yêu cầu truy cập",
    )

    @field_validator("requested_scope")
    @classmethod
    def validate_scope(cls, value: list[str]) -> list[str]:
        invalid = set(value) - VALID_CONSENT_SCOPES
        if invalid:
            raise ValueError(f"Invalid consent scopes: {sorted(invalid)}")
        return value


class RequestAccessResponse(BaseModel):
    """Xác nhận sau khi tạo consent request thành công."""

    request_id: UUID
    status: str
    created_at: datetime
