from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    type: str        # 'access_request' | 'prescription_new' | 'prescription_reminder' | 'emergency_token_expired'
    title: str
    message: str
    reference_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "type": "access_request",
                "title": "Yêu cầu truy cập mới",
                "message": "Bác sĩ Nguyễn Văn A yêu cầu quyền truy cập hồ sơ của bạn.",
                "reference_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "is_read": False,
                "created_at": "2026-05-28T08:00:00Z"
            }
        }
    }
