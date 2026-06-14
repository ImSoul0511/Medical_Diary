from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional

class VaccineCreate(BaseModel):
    vaccine_name: str = Field(..., max_length=200)
    disease_targeted: Optional[str] = Field(None, max_length=200)
    dose_number: Optional[str] = Field(None, max_length=50)
    vaccination_date: date
    administered_by: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

class VaccineUpdate(BaseModel):
    vaccine_name: Optional[str] = Field(None, max_length=200)
    disease_targeted: Optional[str] = Field(None, max_length=200)
    dose_number: Optional[str] = Field(None, max_length=50)
    vaccination_date: Optional[date] = None
    administered_by: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

class VaccineResponse(BaseModel):
    id: UUID
    user_id: UUID
    vaccine_name: str
    disease_targeted: Optional[str]
    dose_number: Optional[str]
    vaccination_date: date
    administered_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
