from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SymptomEntry(BaseModel):
    name: str
    severity: int = Field(..., ge=1, le=10)


class DiaryCreateRequest(BaseModel):
    content: Optional[str] = None
    symptoms: Optional[list[SymptomEntry]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "content": "Hôm nay cảm thấy đau đầu nhẹ sau khi thức dậy, buổi chiều có triệu chứng chóng mặt.",
                "symptoms": [
                    {"name": "Đau đầu", "severity": 5},
                    {"name": "Chóng mặt", "severity": 3}
                ]
            }
        }
    }


class DiaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    content: Optional[str] = None
    symptoms: Optional[list[SymptomEntry]] = None
    created_at: datetime
    updated_at: datetime
