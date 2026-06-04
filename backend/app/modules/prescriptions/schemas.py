from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CustomLogCreate(BaseModel):
    scheduled_date: date
    scheduled_time: str = Field(..., description="Giờ uống, định dạng HH:MM hoặc HH:MM:SS")


class PrescriptionItemCreateRequest(BaseModel):
    medication_name: str
    dosage: str
    duration_days: Optional[int] = Field(None, gt=0)
    scheduled_times: Optional[list[str]] = Field(None, description="Danh sách giờ uống, VD: ['08:00', '13:00', '20:00']")
    start_date: Optional[date] = Field(None, description="Ngày bắt đầu uống thuốc (dành cho chế độ tự động)")
    custom_logs: Optional[list[CustomLogCreate]] = Field(None, description="Danh sách cữ uống tùy chỉnh (dành cho chế độ thủ công)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "medication_name": "Amoxicillin 500mg",
                "dosage": "1 viên x 3 lần/ngày",
                "duration_days": 7,
                "scheduled_times": ["08:00", "13:00", "20:00"],
                "start_date": "2026-05-30",
                "custom_logs": None
            }
        }
    }


class PrescriptionCreateRequest(BaseModel):
    patient_id: UUID
    notes: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "patient_id": "string",
                "notes": "Uống thuốc sau bữa ăn, tránh rượu bia"
            }
        }
    }


class PrescriptionItemResponse(BaseModel):
    id: UUID
    medication_name: str
    dosage: str
    duration_days: Optional[int] = None
    scheduled_times: Optional[list[str]] = None  # e.g. ["08:00", "13:00", "20:00"]
    start_date: Optional[date] = None
    status: str  # "active" | "cancelled"


class PrescriptionResponse(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: Optional[str] = None
    doctor_id: UUID
    doctor_name: Optional[str] = None
    doctor_hospital: Optional[str] = None
    doctor_specialty: Optional[str] = None
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

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "taken"
            }
        }
    }
