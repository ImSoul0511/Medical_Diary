from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.prescriptions import service
from app.modules.prescriptions.schemas import (
    PrescriptionLogResponse,
    PrescriptionLogUpdateRequest,
    PrescriptionResponse,
)
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse

router = APIRouter(tags=["Prescriptions"])

_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}


@router.get(
    "/prescriptions",
    response_model=List[PrescriptionResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem danh sách đơn thuốc của chính mình",
    description="User xem toàn bộ đơn thuốc kèm chi tiết từng loại thuốc. Bác sĩ tạo đơn — xem Phase 4B.",
)
async def list_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> List[PrescriptionResponse]:
    return await service.list_own_prescriptions(db, UUID(current_user["sub"]))


@router.get(
    "/prescription-logs",
    response_model=List[PrescriptionLogResponse],
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Xem lịch uống thuốc của một đơn",
    description="User xem danh sách cữ uống theo đơn thuốc. Logs được DB trigger tự tạo khi bác sĩ thêm prescription_item.",
)
async def list_prescription_logs(
    prescription_id: UUID = Query(..., description="ID của đơn thuốc cần xem"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> List[PrescriptionLogResponse]:
    return await service.list_logs(db, UUID(current_user["sub"]), prescription_id)


@router.patch(
    "/prescription-logs/{log_id}",
    response_model=PrescriptionLogResponse,
    responses={
        400: _error_responses[400],
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
    summary="Cập nhật trạng thái uống thuốc",
    description="User đánh dấu 1 cữ uống thuốc là taken/skipped/untaken. taken_at tự động ghi khi status='taken'.",
)
async def update_log_status(
    log_id: UUID,
    data: PrescriptionLogUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> PrescriptionLogResponse:
    return await service.update_log_status(db, UUID(current_user["sub"]), log_id, data)
