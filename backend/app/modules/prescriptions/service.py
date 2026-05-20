import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.prescriptions.models import Prescription, PrescriptionItem, PrescriptionLog
from app.modules.prescriptions.schemas import (
    PrescriptionItemResponse,
    PrescriptionLogResponse,
    PrescriptionLogUpdateRequest,
    PrescriptionResponse,
)

logger = logging.getLogger("medical_diary")


class PrescriptionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_own_prescriptions(
        self,
        user_id: UUID,
    ) -> list[PrescriptionResponse]:
        """User xem danh sách đơn thuốc của mình, kèm chi tiết từng loại thuốc."""
        rx_stmt = (
            select(Prescription)
            .where(
                Prescription.patient_id == user_id,
                Prescription.deleted_at.is_(None),
            )
            .order_by(Prescription.created_at.desc())
        )
        rx_result = await self.db.execute(rx_stmt)
        prescriptions = rx_result.scalars().all()

        responses = []
        for rx in prescriptions:
            items_stmt = select(PrescriptionItem).where(
                PrescriptionItem.prescription_id == rx.id,
                PrescriptionItem.deleted_at.is_(None),
            )
            items_result = await self.db.execute(items_stmt)
            items = items_result.scalars().all()

            responses.append(PrescriptionResponse(
                id=rx.id,
                doctor_id=rx.doctor_id,
                notes=rx.notes,
                items=[
                    PrescriptionItemResponse(
                        id=item.id,
                        medication_name=item.medication_name,
                        dosage=item.dosage,
                        duration_days=item.duration_days,
                        scheduled_times=[str(t) for t in (item.scheduled_times or [])],
                        status=item.status,
                    )
                    for item in items
                ],
                created_at=rx.created_at,
            ))

        logger.info(f"Listed {len(responses)} prescriptions for user: {user_id}")
        return responses

    async def list_logs(
        self,
        user_id: UUID,
        prescription_id: UUID,
    ) -> list[PrescriptionLogResponse]:
        """User xem lịch uống thuốc của 1 đơn. Verify ownership trước."""
        # Kiểm tra đơn thuốc thuộc về user
        rx_stmt = select(Prescription).where(
            Prescription.id == prescription_id,
            Prescription.patient_id == user_id,
            Prescription.deleted_at.is_(None),
        )
        rx_result = await self.db.execute(rx_stmt)
        if rx_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Đơn thuốc không tồn tại.")

        # Lấy logs qua JOIN prescription_items → prescription_logs
        stmt = (
            select(PrescriptionLog)
            .join(PrescriptionItem, PrescriptionItem.id == PrescriptionLog.prescription_item_id)
            .where(
                PrescriptionItem.prescription_id == prescription_id,
                PrescriptionItem.deleted_at.is_(None),
            )
            .order_by(PrescriptionLog.scheduled_date, PrescriptionLog.scheduled_time)
        )
        result = await self.db.execute(stmt)
        logs = result.scalars().all()

        logger.info(f"Listed {len(logs)} logs for prescription: {prescription_id}")
        return [
            PrescriptionLogResponse(
                id=log.id,
                prescription_item_id=log.prescription_item_id,
                scheduled_date=log.scheduled_date,
                scheduled_time=str(log.scheduled_time),
                status=log.status,
                taken_at=log.taken_at,
            )
            for log in logs
        ]

    async def update_log_status(
        self,
        user_id: UUID,
        log_id: UUID,
        data: PrescriptionLogUpdateRequest,
    ) -> PrescriptionLogResponse:
        """User cập nhật trạng thái 1 cữ uống thuốc. taken_at tự set khi status='taken'."""
        stmt = select(PrescriptionLog).where(
            PrescriptionLog.id == log_id,
            PrescriptionLog.user_id == user_id,  # ownership check
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()

        if log is None:
            raise HTTPException(status_code=404, detail="Log uống thuốc không tồn tại.")

        log.status = data.status
        log.taken_at = datetime.now(timezone.utc) if data.status == "taken" else None
        await self.db.flush()

        logger.info(f"Log {log_id} updated to '{data.status}' by user: {user_id}")
        return PrescriptionLogResponse(
            id=log.id,
            prescription_item_id=log.prescription_item_id,
            scheduled_date=log.scheduled_date,
            scheduled_time=str(log.scheduled_time),
            status=log.status,
            taken_at=log.taken_at,
        )
