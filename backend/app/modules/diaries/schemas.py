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


class DiaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    content: Optional[str] = None
    symptoms: Optional[list[SymptomEntry]] = None
    created_at: datetime
    updated_at: datetime
