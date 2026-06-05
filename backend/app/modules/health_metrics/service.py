import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.health_metrics.models import HealthMetric, ManualHealthRecord
from app.modules.health_metrics.schemas import (
    HealthMetricCreateRequest,
    HealthMetricResponse,
    ManualHealthRecordCreateRequest,
    ManualHealthRecordResponse,
    MetricType,
)
from app.shared.consent import check_consent

logger = logging.getLogger("medical_diary")


class HealthMetricsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Wearable Metrics (existing) ──────────────────────────────────────

    async def create(
        self,
        user_id: UUID,
        data: HealthMetricCreateRequest,
    ) -> HealthMetricResponse:
        """Ghi nhận chỉ số đo lường mới. Yêu cầu ít nhất 1 trường không None."""
        if data.heart_rate is None and data.step_count is None and data.respiratory_rate is None:
            raise HTTPException(status_code=400, detail="Phải có ít nhất một chỉ số đo lường.")

        metric = HealthMetric(
            user_id=user_id,
            heart_rate=data.heart_rate,
            step_count=data.step_count,
            respiratory_rate=data.respiratory_rate,
            recorded_at=data.recorded_at,
        )
        self.db.add(metric)
        await self.db.flush()
        await self.db.refresh(metric)  # load server-default id, created_at

        logger.info(f"Health metric created for user: {user_id}")
        return HealthMetricResponse(
            id=metric.id,
            user_id=metric.user_id,
            heart_rate=metric.heart_rate,
            step_count=metric.step_count,
            respiratory_rate=metric.respiratory_rate,
            recorded_at=metric.recorded_at,
            created_at=metric.created_at,
        )

    async def list_own(
        self,
        user_id: UUID,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[HealthMetricResponse]:
        """Lấy danh sách chỉ số của chính user. Hỗ trợ filter theo khoảng thời gian recorded_at."""
        stmt = (
            select(HealthMetric)
            .where(
                HealthMetric.user_id == user_id,
                HealthMetric.deleted_at.is_(None),
            )
            .order_by(HealthMetric.recorded_at.desc())
        )
        if start:
            stmt = stmt.where(HealthMetric.recorded_at >= start)
        if end:
            stmt = stmt.where(HealthMetric.recorded_at <= end)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Listed {len(rows)} health metrics for user: {user_id}")
        return [
            HealthMetricResponse(
                id=row.id,
                user_id=row.user_id,
                heart_rate=row.heart_rate,
                step_count=row.step_count,
                respiratory_rate=row.respiratory_rate,
                recorded_at=row.recorded_at,
                created_at=row.created_at,
            )
            for row in rows
        ]

    async def list_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[HealthMetricResponse]:
        """Doctor xem chỉ số bệnh nhân. Cần consent scope 'vitals'."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "vitals",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập chỉ số của bệnh nhân này.",
            )

        stmt = (
            select(HealthMetric)
            .where(
                HealthMetric.user_id == patient_id,
                HealthMetric.deleted_at.is_(None),
            )
            .order_by(HealthMetric.recorded_at.desc())
        )
        if start:
            stmt = stmt.where(HealthMetric.recorded_at >= start)
        if end:
            stmt = stmt.where(HealthMetric.recorded_at <= end)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Doctor {doctor_id} listed {len(rows)} health metrics for patient {patient_id}")
        return [
            HealthMetricResponse(
                id=row.id,
                user_id=row.user_id,
                heart_rate=row.heart_rate,
                step_count=row.step_count,
                respiratory_rate=row.respiratory_rate,
                recorded_at=row.recorded_at,
                created_at=row.created_at,
            )
            for row in rows
        ]

    # ── Manual Health Records (new) ──────────────────────────────────────

    def _to_manual_response(self, record: ManualHealthRecord) -> ManualHealthRecordResponse:
        """Helper chuyển ORM model sang Pydantic response."""
        return ManualHealthRecordResponse(
            id=record.id,
            user_id=record.user_id,
            metric_type=record.metric_type,
            metrics=record.metrics,
            device_name=record.device_name,
            notes=record.notes,
            recorded_at=record.recorded_at,
            created_at=record.created_at,
        )

    async def create_manual(
        self,
        user_id: UUID,
        data: ManualHealthRecordCreateRequest,
    ) -> ManualHealthRecordResponse:
        """Bệnh nhân tự ghi chỉ số đo lường (BP, Glucose, SpO2, ...)."""
        record = ManualHealthRecord(
            user_id=user_id,
            metric_type=data.metric_type.value,
            metrics=data.metrics,
            device_name=data.device_name,
            notes=data.notes,
            recorded_at=data.recorded_at,
        )
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)

        logger.info(
            f"Manual health record created for user: {user_id} "
            f"(type={data.metric_type.value})"
        )
        return self._to_manual_response(record)

    async def list_own_manual(
        self,
        user_id: UUID,
        metric_type: Optional[MetricType] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[ManualHealthRecordResponse]:
        """Bệnh nhân xem chỉ số nhập tay của mình. Hỗ trợ lọc theo loại và khoảng thời gian."""
        stmt = (
            select(ManualHealthRecord)
            .where(
                ManualHealthRecord.user_id == user_id,
                ManualHealthRecord.deleted_at.is_(None),
            )
            .order_by(ManualHealthRecord.recorded_at.desc())
        )
        if metric_type:
            stmt = stmt.where(ManualHealthRecord.metric_type == metric_type.value)
        if start:
            stmt = stmt.where(ManualHealthRecord.recorded_at >= start)
        if end:
            stmt = stmt.where(ManualHealthRecord.recorded_at <= end)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(
            f"Listed {len(rows)} manual health records for user: {user_id} "
            f"(filter: type={metric_type})"
        )
        return [self._to_manual_response(row) for row in rows]

    async def list_manual_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
        metric_type: Optional[MetricType] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[ManualHealthRecordResponse]:
        """Bác sĩ xem chỉ số nhập tay của bệnh nhân. Cần consent scope 'manual_health_records'."""
        has_consent = await check_consent(
            self.db,
            str(doctor_id),
            str(patient_id),
            "manual_health_records",
        )
        if not has_consent:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập chỉ số nhập tay của bệnh nhân này.",
            )

        stmt = (
            select(ManualHealthRecord)
            .where(
                ManualHealthRecord.user_id == patient_id,
                ManualHealthRecord.deleted_at.is_(None),
            )
            .order_by(ManualHealthRecord.recorded_at.desc())
        )
        if metric_type:
            stmt = stmt.where(ManualHealthRecord.metric_type == metric_type.value)
        if start:
            stmt = stmt.where(ManualHealthRecord.recorded_at >= start)
        if end:
            stmt = stmt.where(ManualHealthRecord.recorded_at <= end)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(
            f"Doctor {doctor_id} listed {len(rows)} manual health records "
            f"for patient {patient_id} (filter: type={metric_type})"
        )
        return [self._to_manual_response(row) for row in rows]
