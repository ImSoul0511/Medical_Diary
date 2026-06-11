import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.consent.schemas import HEALTH_METRIC_SCOPES
from app.modules.health_metrics.models import HealthMetric, ManualHealthRecord
from app.modules.health_metrics.schemas import (
    HealthMetricCreateRequest,
    HealthMetricResponse,
    ManualHealthRecordCreateRequest,
    ManualHealthRecordResponse,
    MetricType,
)
from app.shared.consent import check_consent, get_consent_scopes

logger = logging.getLogger("medical_diary")


class HealthMetricsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _consolidate_past_days(self, user_id: UUID, new_recorded_at: datetime) -> None:
        """
        Consolidates raw metrics on days prior to the new record's date.
        Replaces raw records for each past day with a single aggregated record:
        - heart_rate: average
        - respiratory_rate: average
        - step_count: sum (total)
        - recorded_at: set to 23:59:59 of that day
        """
        new_date = new_recorded_at.date()
        
        # Query older records that are not soft-deleted
        stmt = (
            select(HealthMetric)
            .where(
                HealthMetric.user_id == user_id,
                HealthMetric.deleted_at.is_(None),
                func.date(HealthMetric.recorded_at) < new_date
            )
        )
        result = await self.db.execute(stmt)
        records = result.scalars().all()
        
        if not records:
            return

        # Group records by date
        from collections import defaultdict
        import datetime as dt
        
        grouped = defaultdict(list)
        for r in records:
            day = r.recorded_at.date()
            grouped[day].append(r)
            
        for day, group in grouped.items():
            # Only consolidate if there is more than 1 record, or if the single record's time is not 23:59:59
            if len(group) == 1 and group[0].recorded_at.time() == dt.time(23, 59, 59):
                continue
                
            heart_rates = [r.heart_rate for r in group if r.heart_rate is not None]
            respiratory_rates = [r.respiratory_rate for r in group if r.respiratory_rate is not None]
            step_counts = [r.step_count for r in group if r.step_count is not None]
            
            # Calculate average heart rate
            avg_heart_rate = None
            if heart_rates:
                val = int(round(sum(heart_rates) / len(heart_rates)))
                avg_heart_rate = max(30, min(250, val)) # Clamp to DB check constraints
                
            # Calculate average respiratory rate
            avg_respiratory_rate = None
            if respiratory_rates:
                val = int(round(sum(respiratory_rates) / len(respiratory_rates)))
                avg_respiratory_rate = max(5, min(60, val)) # Clamp to DB check constraints
                
            # Calculate total step count
            total_step_count = None
            if step_counts:
                val = sum(step_counts)
                total_step_count = max(0, val) # Clamp to DB check constraints
                
            # Construct the consolidated time using timezone of the first record
            tz = group[0].recorded_at.tzinfo
            consolidated_time = dt.datetime.combine(day, dt.time(23, 59, 59), tzinfo=tz)
            
            # Delete the raw records
            for r in group:
                await self.db.delete(r)
                
            # Create consolidated record
            consolidated = HealthMetric(
                user_id=user_id,
                heart_rate=avg_heart_rate,
                step_count=total_step_count,
                respiratory_rate=avg_respiratory_rate,
                recorded_at=consolidated_time
            )
            self.db.add(consolidated)
            
        await self.db.flush()
        logger.info(f"Consolidated past health metrics for user {user_id} before date {new_date}")

    async def create(
        self,
        user_id: UUID,
        data: HealthMetricCreateRequest,
    ) -> HealthMetricResponse:
        """Ghi nhận chỉ số đo lường mới. Yêu cầu ít nhất 1 trường không None."""
        if data.heart_rate is None and data.step_count is None and data.respiratory_rate is None:
            raise HTTPException(status_code=400, detail="Phải có ít nhất một chỉ số đo lường.")

        # Consolidate past days health metrics
        await self._consolidate_past_days(user_id, data.recorded_at)

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
        """Doctor xem chi so benh nhan theo health metric scopes duoc cap."""
        granted_scopes = await get_consent_scopes(
            self.db,
            str(doctor_id),
            str(patient_id),
            HEALTH_METRIC_SCOPES,
        )
        if not granted_scopes:
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
        visible_metric_filters = []
        if "heart_rate" in granted_scopes:
            visible_metric_filters.append(HealthMetric.heart_rate.is_not(None))
        if "step_count" in granted_scopes:
            visible_metric_filters.append(HealthMetric.step_count.is_not(None))
        if "respiratory_rate" in granted_scopes:
            visible_metric_filters.append(HealthMetric.respiratory_rate.is_not(None))
        stmt = stmt.where(or_(*visible_metric_filters))

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
                heart_rate=row.heart_rate if "heart_rate" in granted_scopes else None,
                step_count=row.step_count if "step_count" in granted_scopes else None,
                respiratory_rate=(
                    row.respiratory_rate if "respiratory_rate" in granted_scopes else None
                ),
                recorded_at=row.recorded_at,
                created_at=row.created_at,
            )
            for row in rows
        ]

    async def _to_manual_response(self, record: ManualHealthRecord) -> ManualHealthRecordResponse:
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
        return await self._to_manual_response(record)

    async def list_own_manual(
        self,
        user_id: UUID,
        metric_type: Optional[MetricType] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[ManualHealthRecordResponse]:
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
        responses: list[ManualHealthRecordResponse] = []
        for row in rows:
            responses.append(await self._to_manual_response(row))
        return responses

    async def list_manual_by_patient(
        self,
        doctor_id: UUID,
        patient_id: UUID,
        metric_type: Optional[MetricType] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> list[ManualHealthRecordResponse]:
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
        responses: list[ManualHealthRecordResponse] = []
        for row in rows:
            responses.append(await self._to_manual_response(row))
        return responses
