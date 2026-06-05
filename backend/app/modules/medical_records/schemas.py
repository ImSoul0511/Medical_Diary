from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class MedicalRecordCreateRequest(BaseModel):
    patient_id: UUID
    diagnosis: str
    notes: Optional[str] = None
    attachments: Optional[list[str]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "patient_id": "string",
                "diagnosis": "Viêm họng cấp tính, không biến chứng",
                "notes": "Bệnh nhân cần tái khám sau 7 ngày",
                "attachments": []
            }
        }
    }


class MedicalRecordResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    doctor_hospital: Optional[str] = None
    diagnosis: str
    notes: Optional[str] = None
    attachments: Optional[list[str]] = None  # list of URLs
    created_at: datetime
