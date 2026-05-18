from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.medical_records import service
from app.modules.medical_records.schemas import MedicalRecordResponse
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse

# NOTE: Phase 3C chỉ handle User tự xem hồ sơ của mình.
# Phase 4B sẽ thêm GET /medical-records/{user_id} cho Doctor (cần consent check).
router = APIRouter(prefix="/medical-records", tags=["Medical Records"])

_error_responses = {
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}


@router.get(
    "/me",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem hồ sơ bệnh án của chính mình",
    description="User xem toàn bộ hồ sơ bệnh án do bác sĩ tạo. Bác sĩ xem của bệnh nhân khác → Phase 4B GET /medical-records/{user_id}.",
)
async def list_my_records(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> List[MedicalRecordResponse]:
    return await service.list_own_records(db, UUID(current_user["sub"]))
