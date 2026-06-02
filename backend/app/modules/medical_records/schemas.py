from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


<<<<<<< HEAD
class MedicalRecordResponse(BaseModel):
    id: UUID
=======
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
>>>>>>> af481a325f693a35f1ace32e8b82eb35be120a54
    doctor_id: UUID
    diagnosis: str
    notes: Optional[str] = None
    attachments: Optional[list[str]] = None  # list of URLs
    created_at: datetime
