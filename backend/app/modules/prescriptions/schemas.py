from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PrescriptionItemResponse(BaseModel):
    id: UUID
    medication_name: str
    dosage: str
    duration_days: int
    scheduled_times: list[str]  # e.g. ["08:00", "13:00", "20:00"]
    status: str  # "active" | "cancelled"


class PrescriptionResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    notes: Optional[str] = None
    items: list[PrescriptionItemResponse]
    created_at: datetime


class PrescriptionLogResponse(BaseModel):
    id: UUID
    prescription_item_id: UUID
    scheduled_date: date
    scheduled_time: str  # "HH:MM:SS" — Python time serialized as string
    status: str  # "untaken" | "taken" | "skipped"
    taken_at: Optional[datetime] = None


class PrescriptionLogUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(taken|skipped|untaken)$")
