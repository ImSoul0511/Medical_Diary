import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.health_metrics.models import HealthMetric
from app.modules.health_metrics.schemas import HealthMetricCreateRequest, HealthMetricResponse

logger = logging.getLogger("medical_diary")


async def create(
    db: AsyncSession,
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
    db.add(metric)
    await db.flush()
    await db.refresh(metric)  # load server-default id, created_at

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
    db: AsyncSession,
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

    result = await db.execute(stmt)
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
