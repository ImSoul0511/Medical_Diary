from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.health_metrics.schemas import (
    HealthMetricCreateRequest,
    HealthMetricResponse,
    ManualHealthRecordCreateRequest,
    ManualHealthRecordResponse,
    MetricType,
)
from app.modules.health_metrics.service import HealthMetricsService
from app.shared.dependencies import require_role
from app.shared.schemas import error_responses as _error_responses

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
    summary="Xem lịch sử chỉ số đo lường",
    description="User xem của mình (không truyền patient_id). Doctor xem của bệnh nhân (truyền patient_id, cần consent scope heart_rate, step_count hoặc respiratory_rate).",
)
async def list_metrics(
    patient_id: Optional[UUID] = Query(None, description="Doctor only — ID bệnh nhân cần xem"),
    start: Optional[datetime] = Query(None, description="Lọc từ thời điểm này (ISO 8601)"),
    end: Optional[datetime] = Query(None, description="Lọc đến thời điểm này (ISO 8601)"),
    service: HealthMetricsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user", "doctor"])),
) -> List[HealthMetricResponse]:
    role = current_user.get("role")

    if patient_id is not None:
        if role != "doctor":
            raise HTTPException(status_code=403, detail="Chỉ bác sĩ mới có thể truy cập dữ liệu của bệnh nhân khác.")
        return await service.list_by_patient(UUID(current_user["sub"]), patient_id, start, end)

    if role != "user":
        raise HTTPException(status_code=400, detail="Bác sĩ phải cung cấp patient_id.")
    return await service.list_own(UUID(current_user["sub"]), start, end)


@router.post(
    "/manual",
    response_model=ManualHealthRecordResponse,
    status_code=201,
    responses={400: _error_responses[400], 401: _error_responses[401], 403: _error_responses[403]},
    summary="Ghi chi so suc khoe nhap tay",
    description=(
        "User ghi chi so do tu thiet bi ca nhan. "
        "Metrics payload phu thuoc metric_type: blood_pressure, blood_glucose, spo2, "
        "body_temperature hoac weight."
    ),
)
async def create_manual_metric(
    data: ManualHealthRecordCreateRequest,
    service: HealthMetricsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> ManualHealthRecordResponse:
    return await service.create_manual(UUID(current_user["sub"]), data)


@router.get(
    "/manual",
    response_model=List[ManualHealthRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem lich su chi so nhap tay",
    description=(
        "User xem cua minh. Doctor xem cua benh nhan khi truyen patient_id va co consent "
        "scope manual_health_records. Ho tro loc theo metric_type va khoang thoi gian."
    ),
)
async def list_manual_metrics(
    patient_id: Optional[UUID] = Query(None, description="Doctor only - ID benh nhan can xem"),
    metric_type: Optional[MetricType] = Query(None, description="Loc theo loai chi so"),
    start: Optional[datetime] = Query(None, description="Loc tu thoi diem nay (ISO 8601)"),
    end: Optional[datetime] = Query(None, description="Loc den thoi diem nay (ISO 8601)"),
    service: HealthMetricsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user", "doctor"])),
) -> List[ManualHealthRecordResponse]:
    role = current_user.get("role")

    if patient_id is not None:
        if role != "doctor":
            raise HTTPException(status_code=403, detail="Chỉ bác sĩ mới có thể truy cập dữ liệu của bệnh nhân khác.")
        return await service.list_manual_by_patient(UUID(current_user["sub"]), patient_id, metric_type, start, end)

    if role != "user":
        raise HTTPException(status_code=400, detail="Bác sĩ phải cung cấp patient_id.")
    return await service.list_own_manual(UUID(current_user["sub"]), metric_type, start, end)
