from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class AllergyCreate(BaseModel):
    allergen: str = Field(..., max_length=200)
    severity: Optional[str] = Field(None, max_length=50)
    reaction: Optional[str] = None
    notes: Optional[str] = None

class AllergyUpdate(BaseModel):
    allergen: Optional[str] = Field(None, max_length=200)
    severity: Optional[str] = Field(None, max_length=50)
    reaction: Optional[str] = None
    notes: Optional[str] = None

class AllergyResponse(BaseModel):
    id: UUID
    user_id: UUID
    allergen: str
    severity: Optional[str]
    reaction: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
