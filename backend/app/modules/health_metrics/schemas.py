from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class HealthMetricCreateRequest(BaseModel):
    heart_rate: Optional[int] = Field(None, ge=30, le=250)
    step_count: Optional[int] = Field(None, ge=0)
    respiratory_rate: Optional[int] = Field(None, ge=5, le=60)
    recorded_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "heart_rate": 75,
                "step_count": 8500,
                "respiratory_rate": 16,
                "recorded_at": "2026-05-28T08:00:00Z"
            }
        }
    }


class HealthMetricResponse(BaseModel):
    id: UUID
    user_id: UUID
    heart_rate: Optional[int] = None
    step_count: Optional[int] = None
    respiratory_rate: Optional[int] = None
    recorded_at: datetime
    created_at: datetime
