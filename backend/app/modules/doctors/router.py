from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.doctors.schemas import (
    ManagedPatientResponse,
    PatientProfileResponse,
    PatientPublicResponse,
    RequestAccessRequest,
    RequestAccessResponse,
)
from app.modules.doctors.service import DoctorService
from app.modules.users.models import Doctor
from app.shared.dependencies import require_role
from app.shared.schemas import error_responses as _error_responses
from app.core.rate_limiter import limiter


router = APIRouter(prefix="/doctors", tags=["Doctors"])


def _get_service(db: AsyncSession = Depends(get_db)) -> DoctorService:
    return DoctorService(db)


async def require_verified_doctor(
    current_user: dict = Depends(require_role(["doctor"])),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Dependency nâng cao: kiểm tra bác sĩ đã được admin phê duyệt hay chưa.

    Chuỗi xác thực: JWT valid → role == 'doctor' → verification_status == 'approved'.
    Raise 403 nếu bác sĩ chưa được duyệt hoặc bị từ chối.
    """
    doctor_id = UUID(current_user["sub"])

    stmt = select(Doctor.verification_status).where(Doctor.id == doctor_id)
    result = await db.execute(stmt)
    status = result.scalar_one_or_none()

    if status is None:
        raise HTTPException(
            status_code=403,
            detail="Không tìm thấy hồ sơ bác sĩ. Vui lòng hoàn tất đăng ký.",
        )

    if status != "approved":
        raise HTTPException(
            status_code=403,
            detail="Tài khoản bác sĩ chưa được phê duyệt. Vui lòng chờ admin xác minh.",
        )

    return current_user


@router.get(
    "/search-patients",
    response_model=list[PatientPublicResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
)
async def search_patients(
    phone_number: str = Query(..., min_length=8, max_length=15, description="Số điện thoại bệnh nhân cần tìm"),
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_verified_doctor),
) -> list[PatientPublicResponse]:
    return await service.search_patients(phone_number)


@router.get(
    "/patients",
    response_model=list[ManagedPatientResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
)
async def list_managed_patients(
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_verified_doctor),
) -> list[ManagedPatientResponse]:
    return await service.list_managed_patients(UUID(current_user["sub"]))


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
    current_user: dict = Depends(require_verified_doctor),
) -> PatientProfileResponse:
    return await service.get_patient_detail(UUID(current_user["sub"]), patient_id)


@router.get(
    "/patients/{patient_id}/public",
    response_model=PatientProfileResponse,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
)
async def get_patient_public_profile(
    patient_id: UUID,
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_verified_doctor),
) -> PatientProfileResponse:
    return await service.get_patient_public_profile(patient_id)


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
@limiter.limit("10/day")
async def request_access(
    request: Request,
    data: RequestAccessRequest,
    background_tasks: BackgroundTasks,
    service: DoctorService = Depends(_get_service),
    current_user: dict = Depends(require_verified_doctor),
) -> RequestAccessResponse:
    return await service.request_access(UUID(current_user["sub"]), data, background_tasks)
