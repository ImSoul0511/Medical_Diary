import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.medical_records.models import MedicalRecord
from app.modules.medical_records.schemas import MedicalRecordCreateRequest, MedicalRecordResponse
from app.shared.consent import check_consent

logger = logging.getLogger("medical_diary")


class MedicalRecordsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _to_response(self, record: MedicalRecord) -> MedicalRecordResponse:
        return MedicalRecordResponse(
            id=record.id,
            patient_id=record.patient_id,
            doctor_id=record.doctor_id,
            diagnosis=record.diagnosis,
            notes=record.notes,
            attachments=record.attachments,
            created_at=record.created_at,
        )

    async def list_own_records(
        self,
        user_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """User xem hồ sơ bệnh án của chính mình."""
        stmt = (
            select(MedicalRecord)
            .where(
                MedicalRecord.patient_id == user_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Listed {len(rows)} medical records for user: {user_id}")
        return [self._to_response(row) for row in rows]

    async def create(
        self,
        doctor_id: UUID,
        data: MedicalRecordCreateRequest,
    ) -> MedicalRecordResponse:
        """Bác sĩ tạo hồ sơ bệnh án. Không cần consent."""
        record = MedicalRecord(
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            diagnosis=data.diagnosis,
            notes=data.notes,
            attachments=data.attachments,
        )
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)

        logger.info(f"Medical record created by doctor {doctor_id} for patient {data.patient_id}")
        return self._to_response(record)

    async def list_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """Bác sĩ xem hồ sơ bệnh án của bệnh nhân. Cần consent scope 'medical_records'."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "medical_records",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập hồ sơ bệnh án của bệnh nhân này.",
            )

        stmt = (
            select(MedicalRecord)
            .where(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Doctor {doctor_id} listed {len(rows)} medical records for patient {patient_id}")
        return [self._to_response(row) for row in rows]
