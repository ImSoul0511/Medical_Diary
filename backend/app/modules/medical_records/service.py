import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.modules.medical_records.models import MedicalRecord
from app.modules.medical_records.schemas import MedicalRecordCreateRequest, MedicalRecordResponse
from app.modules.users.models import Doctor, Profile
from app.shared.consent import check_consent

logger = logging.getLogger("medical_diary")


class MedicalRecordsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _records_with_display_fields_query(self):
        patient_profile = aliased(Profile)
        doctor_profile = aliased(Profile)

        return (
            select(
                MedicalRecord,
                patient_profile.full_name.label("patient_name"),
                doctor_profile.full_name.label("doctor_name"),
                Doctor.specialty.label("doctor_specialty"),
                Doctor.hospital.label("doctor_hospital"),
            )
            .join(patient_profile, patient_profile.id == MedicalRecord.patient_id)
            .join(doctor_profile, doctor_profile.id == MedicalRecord.doctor_id)
            .outerjoin(Doctor, Doctor.id == MedicalRecord.doctor_id)
        )

    def _to_response(self, row) -> MedicalRecordResponse:
        record = row[0]

        return MedicalRecordResponse(
            id=record.id,
            patient_id=record.patient_id,
            doctor_id=record.doctor_id,
            patient_name=row.patient_name,
            doctor_name=row.doctor_name,
            doctor_specialty=row.doctor_specialty,
            doctor_hospital=row.doctor_hospital,
            diagnosis=record.diagnosis,
            notes=record.notes,
            attachments=record.attachments,
            created_at=record.created_at,
        )

    async def _get_record_response(self, record_id: UUID) -> MedicalRecordResponse:
        stmt = self._records_with_display_fields_query().where(MedicalRecord.id == record_id)
        result = await self.db.execute(stmt)
        return self._to_response(result.one())

    async def list_own_records(
        self,
        user_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """User xem ho so benh an cua chinh minh."""
        stmt = (
            self._records_with_display_fields_query()
            .where(
                MedicalRecord.patient_id == user_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        logger.info(f"Listed {len(rows)} medical records for user: {user_id}")
        return [self._to_response(row) for row in rows]

    async def create(
        self,
        doctor_id: UUID,
        data: MedicalRecordCreateRequest,
    ) -> MedicalRecordResponse:
        """Bac si tao ho so benh an. Khong can consent."""
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
        return await self._get_record_response(record.id)

    async def list_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
    ) -> list[MedicalRecordResponse]:
        """Bac si xem ho so benh an cua benh nhan. Can consent scope 'medical_records'."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "medical_records",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Khong co quyen truy cap ho so benh an cua benh nhan nay.",
            )

        stmt = (
            self._records_with_display_fields_query()
            .where(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.deleted_at.is_(None),
            )
            .order_by(MedicalRecord.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        logger.info(f"Doctor {doctor_id} listed {len(rows)} medical records for patient {patient_id}")
        return [self._to_response(row) for row in rows]
