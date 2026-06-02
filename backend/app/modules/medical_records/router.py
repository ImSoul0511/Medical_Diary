from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
<<<<<<< HEAD
from app.modules.medical_records.schemas import MedicalRecordResponse
from app.modules.medical_records.service import MedicalRecordsService
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse, error_responses as _error_responses

# NOTE: Phase 3C chỉ handle User tự xem hồ sơ của mình.
# Phase 4B sẽ thêm GET /medical-records/{user_id} cho Doctor (cần consent check).
=======
from app.modules.medical_records.schemas import MedicalRecordCreateRequest, MedicalRecordResponse
from app.modules.medical_records.service import MedicalRecordsService
from app.shared.dependencies import require_role
from app.shared.schemas import error_responses as _error_responses

>>>>>>> af481a325f693a35f1ace32e8b82eb35be120a54
router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


def _get_service(db: AsyncSession = Depends(get_db)) -> MedicalRecordsService:
    return MedicalRecordsService(db)


@router.get(
    "/me",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem hồ sơ bệnh án của chính mình",
<<<<<<< HEAD
    description="User xem toàn bộ hồ sơ bệnh án do bác sĩ tạo. Bác sĩ xem của bệnh nhân khác → Phase 4B GET /medical-records/{user_id}.",
=======
    description="User xem toàn bộ hồ sơ bệnh án do bác sĩ tạo.",
>>>>>>> af481a325f693a35f1ace32e8b82eb35be120a54
)
async def list_my_records(
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[MedicalRecordResponse]:
    return await service.list_own_records(UUID(current_user["sub"]))
<<<<<<< HEAD
=======


@router.post(
    "",
    response_model=MedicalRecordResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Tạo hồ sơ bệnh án",
    description="Bác sĩ tạo hồ sơ bệnh án cho bệnh nhân. Không cần consent — bác sĩ chủ động tạo.",
)
async def create_record(
    data: MedicalRecordCreateRequest,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> MedicalRecordResponse:
    return await service.create(UUID(current_user["sub"]), data)


@router.get(
    "/{patient_id}",
    response_model=List[MedicalRecordResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Bác sĩ xem hồ sơ bệnh án của bệnh nhân",
    description="Bác sĩ xem hồ sơ bệnh án của bệnh nhân cụ thể. Cần consent scope 'medical_records'.",
)
async def list_patient_records(
    patient_id: UUID,
    service: MedicalRecordsService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> List[MedicalRecordResponse]:
    return await service.list_by_patient(UUID(current_user["sub"]), patient_id)
>>>>>>> af481a325f693a35f1ace32e8b82eb35be120a54
