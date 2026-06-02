from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class PendingDoctorResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    specialty: str
    license_number: str
    certificate_url: str
    registered_at: datetime
    status: str

class DoctorVerifyRequest(BaseModel):
    action: Literal["approved", "rejected"]
    notes: Optional[str] = Field(None, max_length=500)

    model_config = {
        "json_schema_extra": {
            "example": {
                "action": "approved",
                "notes": "Chứng chỉ hợp lệ, đã xác minh"
            }
        }
    }

class AuditLogItem(BaseModel):
    id: UUID
    actor_id: UUID
    actor_name: str
    action: str
    table_name: str
    target_user_id: Optional[UUID]
    old_data: Optional[dict]
    new_data: Optional[dict]
    created_at: datetime
