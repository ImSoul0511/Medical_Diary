from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.health_metrics.schemas import HealthMetricCreateRequest, HealthMetricResponse
from app.modules.health_metrics.service import HealthMetricsService
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse, error_responses as _error_responses

router = APIRouter(prefix="/health-metrics", tags=["Health Metrics"])


def _get_service(db: AsyncSession = Depends(get_db)) -> HealthMetricsService:
    return HealthMetricsService(db)


@router.post(
    "",
    response_model=HealthMetricResponse,
    status_code=201,
    responses={400: _error_responses[400], 401: _error_responses[401], 403: _error_responses[403]},
    summary="Ghi nhận chỉ số đo lường",
    description="User ghi nhận chỉ số từ smartwatch/app sức khỏe. Ít nhất 1 trường (heart_rate, step_count, respiratory_rate) phải có giá trị.",
)
async def create_metric(
    data: HealthMetricCreateRequest,
    service: HealthMetricsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> HealthMetricResponse:
    return await service.create(UUID(current_user["sub"]), data)


@router.get(
    "",
    response_model=List[HealthMetricResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem lịch sử chỉ số đo lường của chính mình",
    description="User xem lịch sử chỉ số của chính mình. Hỗ trợ filter theo khoảng thời gian. Không có patient_id — dùng Phase 4B cho Doctor xem của bệnh nhân.",
)
async def list_metrics(
    start: Optional[datetime] = Query(None, description="Lọc từ thời điểm này (ISO 8601)"),
    end: Optional[datetime] = Query(None, description="Lọc đến thời điểm này (ISO 8601)"),
    service: HealthMetricsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[HealthMetricResponse]:
    return await service.list_own(UUID(current_user["sub"]), start, end)
