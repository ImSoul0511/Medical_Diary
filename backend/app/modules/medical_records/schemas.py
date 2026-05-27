from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class MedicalRecordCreateRequest(BaseModel):
    patient_id: UUID
    diagnosis: str
    notes: Optional[str] = None
    attachments: Optional[list[str]] = None


class MedicalRecordResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    diagnosis: str
    notes: Optional[str] = None
    attachments: Optional[list[str]] = None  # list of URLs
    created_at: datetime
