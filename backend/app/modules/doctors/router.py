from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.doctors.schemas import (
    PatientProfileResponse,
    PatientPublicResponse,
    RequestAccessRequest,
    RequestAccessResponse,
)
from app.modules.doctors.service import DoctorService
from app.shared.dependencies import require_role
from app.shared.schemas import error_responses as _error_responses


router = APIRouter(prefix="/doctors", tags=["Doctors"])


def _get_service(db: AsyncSession = Depends(get_db)) -> DoctorService:
    return DoctorService(db)


@router.get(
    "/search-patients",
    response_model=list[PatientPublicResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
)
async def search_patients(
    query: str = Query(..., min_length=1, max_length=100, description="Tên bệnh nhân cần tìm"),
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> list[PatientPublicResponse]:
    return await service.search_patients(query)


@router.get(
    "/patients/{patient_id}",
    response_model=PatientProfileResponse,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
)
async def get_patient_detail(
    patient_id: UUID,
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> PatientProfileResponse:
    return await service.get_patient_detail(UUID(current_user["sub"]), patient_id)


@router.post(
    "/request-access",
    response_model=RequestAccessResponse,
    status_code=201,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
        409: {"description": "Conflict — pending request already exists"},
    },
)
async def request_access(
    data: RequestAccessRequest,
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_role(["doctor"])),
) -> RequestAccessResponse:
    return await service.request_access(UUID(current_user["sub"]), data)
