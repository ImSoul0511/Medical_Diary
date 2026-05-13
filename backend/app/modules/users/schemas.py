from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import List, Optional, Literal

class UserProfileResponse(BaseModel):
    id: UUID
    full_name: str
    gender: str
    date_of_birth: Optional[date]
    blood_type: Optional[str]
    allergies: Optional[str]
    emergency_contact: Optional[str]
    privacy_settings: dict

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    gender: Optional[Literal['NAM', 'Nữ']] = None
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = Field(None, max_length=5)
    allergies: Optional[str] = Field(None, max_length=2000)
    emergency_contact: Optional[str] = Field(None, max_length=20)

class PrivacyUpdateRequest(BaseModel):
    show_blood_type: Optional[bool] = None
    show_allergies: Optional[bool] = None
    show_emergency_contact: Optional[bool] = None

class AccessHistoryItem(BaseModel):
    doctor_name: str
    action: str           # "SELECT" | "INSERT" | "UPDATE" | "DELETE"
    data_type: str        # "medical_records" | "prescriptions" | "diaries"
    accessed_at: datetime

class DoctorPublicResponse(BaseModel):
    id: UUID
    full_name: str
    specialty: str
    hospital: str
