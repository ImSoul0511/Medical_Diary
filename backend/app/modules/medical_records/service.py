import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.medical_records.models import MedicalRecord
from app.modules.medical_records.schemas import MedicalRecordResponse

logger = logging.getLogger("medical_diary")


async def list_own_records(
    db: AsyncSession,
    user_id: UUID,
) -> list[MedicalRecordResponse]:
    """User xem hồ sơ bệnh án của chính mình. Bác sĩ xem của bệnh nhân → Phase 4B."""
    stmt = (
        select(MedicalRecord)
        .where(
            MedicalRecord.patient_id == user_id,
            MedicalRecord.deleted_at.is_(None),
        )
        .order_by(MedicalRecord.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    logger.info(f"Listed {len(rows)} medical records for user: {user_id}")
    return [
        MedicalRecordResponse(
            id=row.id,
            doctor_id=row.doctor_id,
            diagnosis=row.diagnosis,
            notes=row.notes,
            attachments=row.attachments,
            created_at=row.created_at,
        )
        for row in rows
    ]
