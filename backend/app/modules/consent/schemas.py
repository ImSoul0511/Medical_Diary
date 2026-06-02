from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


VALID_CONSENT_SCOPES = {
    "blood_type",
    "allergies",
    "emergency_contact",
    "medical_records",
    "prescriptions",
    "diaries",
    "heart_rate",
    "step_count",
    "respiratory_rate",
}


class ConsentHistoryItem(BaseModel):
    doctor_id: UUID
    doctor_name: str
    scope: list[str]
    granted_at: datetime
    expires_at: Optional[datetime] = None


class AccessRequestItem(BaseModel):
    request_id: UUID
    doctor_id: UUID
    doctor_name: str
    requested_scope: list[str]
    reason: str
    status: str
    requested_at: datetime


class AccessRequestActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approved|rejected)$")
    approved_scope: Optional[list[str]] = None
    expires_in_days: Optional[int] = Field(
        default=30,
        ge=1,
        le=365,
        description="Số ngày quyền truy cập có hiệu lực. Mặc định 30 ngày. None = vĩnh viễn."
    )

<<<<<<< HEAD
=======
    model_config = {
        "json_schema_extra": {
            "example": {
                "action": "approved",
                "approved_scope": [
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
                "expires_in_days": 30
            }
        }
    }

>>>>>>> af481a325f693a35f1ace32e8b82eb35be120a54
    @field_validator("approved_scope")
    @classmethod
    def validate_approved_scope(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value

        invalid_scopes = set(value) - VALID_CONSENT_SCOPES
        if invalid_scopes:
            raise ValueError(f"Invalid consent scopes: {sorted(invalid_scopes)}")

        return value
