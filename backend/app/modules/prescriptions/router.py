from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.modules.prescriptions.schemas import (
    PrescriptionCreateRequest,
    PrescriptionItemCreateRequest,
    PrescriptionItemResponse,
    PrescriptionLogResponse,
    PrescriptionLogUpdateRequest,
    PrescriptionResponse,
)
from app.modules.prescriptions.service import PrescriptionsService
from app.shared.dependencies import require_role
from app.shared.schemas import MessageResponse, error_responses as _error_responses

router = APIRouter(tags=["Prescriptions"])


def _get_service(db: AsyncSession = Depends(get_db)) -> PrescriptionsService:
    return PrescriptionsService(db)


@router.get(
    "/prescriptions",
    response_model=List[PrescriptionResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem danh sách đơn thuốc của chính mình",
    description="User xem toàn bộ đơn thuốc kèm chi tiết từng loại thuốc. Bác sĩ tạo đơn — xem Phase 4B.",
)
async def list_prescriptions(
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[PrescriptionResponse]:
    return await service.list_own_prescriptions(UUID(current_user["sub"]))


@router.get(
    "/prescription-logs",
    response_model=List[PrescriptionLogResponse],
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Xem lịch uống thuốc của một đơn",
    description="User xem danh sách cữ uống theo đơn thuốc. Logs được DB trigger tự tạo khi bác sĩ thêm prescription_item.",
)
async def list_prescription_logs(
    prescription_id: UUID = Query(..., description="ID của đơn thuốc cần xem"),
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[PrescriptionLogResponse]:
    return await service.list_logs(UUID(current_user["sub"]), prescription_id)


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
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> PrescriptionLogResponse:
    return await service.update_log_status(UUID(current_user["sub"]), log_id, data)


@router.post(
    "/prescriptions",
    response_model=PrescriptionResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ tạo đơn thuốc",
    description="Bác sĩ tạo đơn thuốc cho bệnh nhân. Không cần consent. Thêm thuốc vào đơn qua POST /prescriptions/{id}/items.",
)
async def create_prescription(
    data: PrescriptionCreateRequest,
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> PrescriptionResponse:
    return await service.create_prescription(UUID(current_user["sub"]), data)


@router.post(
    "/prescriptions/{prescription_id}/items",
    response_model=PrescriptionItemResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Bác sĩ thêm thuốc vào đơn",
    description="Bác sĩ thêm 1 loại thuốc vào đơn. DB trigger tự tạo prescription_logs theo duration_days × scheduled_times.",
)
async def add_prescription_item(
    prescription_id: UUID,
    data: PrescriptionItemCreateRequest,
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> PrescriptionItemResponse:
    return await service.add_item(UUID(current_user["sub"]), prescription_id, data)


@router.delete(
    "/prescriptions/{prescription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Bác sĩ xóa đơn thuốc (soft-delete)",
    description="Bác sĩ soft-delete đơn thuốc của mình. Chỉ cập nhật deleted_at.",
)
async def delete_prescription(
    prescription_id: UUID,
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> None:
    await service.soft_delete_prescription(UUID(current_user["sub"]), prescription_id)


@router.get(
    "/prescriptions/patient/{patient_id}",
    response_model=List[PrescriptionResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ xem danh sách đơn thuốc của bệnh nhân",
    description="Bác sĩ xem toàn bộ đơn thuốc của bệnh nhân cụ thể. Cần consent scope 'prescriptions'.",
)
async def list_patient_prescriptions(
    patient_id: UUID,
    service: PrescriptionsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> List[PrescriptionResponse]:
    return await service.list_patient_prescriptions(UUID(current_user["sub"]), patient_id)


from fastapi import BackgroundTasks, Header

@router.post(
    "/prescriptions/internal/send-reminders",
    response_model=MessageResponse,
    status_code=200,
    summary="[Internal] Gửi email nhắc nhở uống thuốc định kỳ",
    description="Endpoint nội bộ (gọi bởi database cron job) để quét và gửi email nhắc nhở uống thuốc.",
)
async def send_medication_reminders(
    background_tasks: BackgroundTasks,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
    service: PrescriptionsService = Depends(_get_service),
) -> MessageResponse:
    # Xác thực token nội bộ bảo mật (đối chiếu với JWT_SECRET)
    if x_internal_token != settings.JWT_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized internal request.")
    
    return await service.send_scheduled_reminders(background_tasks)
