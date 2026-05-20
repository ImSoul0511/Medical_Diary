from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.medical_records.schemas import MedicalRecordResponse
from app.modules.medical_records.service import MedicalRecordsService
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse, error_responses as _error_responses

# NOTE: Phase 3C chỉ handle User tự xem hồ sơ của mình.
# Phase 4B sẽ thêm GET /medical-records/{user_id} cho Doctor (cần consent check).
router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


def _get_service(db: AsyncSession = Depends(get_db)) -> MedicalRecordsService:
    return MedicalRecordsService(db)


@router.get(
    "/me",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem hồ sơ bệnh án của chính mình",
    description="User xem toàn bộ hồ sơ bệnh án do bác sĩ tạo. Bác sĩ xem của bệnh nhân khác → Phase 4B GET /medical-records/{user_id}.",
)
async def list_my_records(
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[MedicalRecordResponse]:
    return await service.list_own_records(UUID(current_user["sub"]))
