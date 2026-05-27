from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.diaries.schemas import DiaryCreateRequest, DiaryResponse
from app.modules.diaries.service import DiariesService
from app.shared.dependencies import require_role
from app.shared.schemas import error_responses as _error_responses

router = APIRouter(prefix="/diaries", tags=["Diaries"])


def _get_service(db: AsyncSession = Depends(get_db)) -> DiariesService:
    return DiariesService(db)


@router.post(
    "",
    response_model=DiaryResponse,
    status_code=201,
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Tạo nhật ký mới",
    description="User viết nhật ký cá nhân gồm ghi chú text tự do và/hoặc đánh giá triệu chứng (thang 1–10).",
)
async def create_diary(
    data: DiaryCreateRequest,
    service: DiariesService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> DiaryResponse:
    return await service.create(UUID(current_user["sub"]), data)


@router.get(
    "",
    response_model=List[DiaryResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem danh sách nhật ký",
    description="User xem của mình (không truyền patient_id). Doctor xem của bệnh nhân (truyền patient_id, cần consent scope 'diaries').",
)
async def list_diaries(
    patient_id: Optional[UUID] = Query(None, description="Doctor only — ID bệnh nhân cần xem"),
    service: DiariesService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user", "doctor"])),
) -> List[DiaryResponse]:
    role = current_user.get("role")

    if patient_id is not None:
        if role != "doctor":
            raise HTTPException(status_code=403, detail="Chỉ bác sĩ mới có thể truy cập nhật ký của bệnh nhân khác.")
        return await service.list_by_patient(UUID(current_user["sub"]), patient_id)

    if role != "user":
        raise HTTPException(status_code=400, detail="Bác sĩ phải cung cấp patient_id.")
    return await service.list_own(UUID(current_user["sub"]))


@router.delete(
    "/{diary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Xóa nhật ký (soft-delete)",
    description="User xóa nhật ký của chính mình. Chỉ cập nhật deleted_at, không hard-delete.",
)
async def delete_diary(
    diary_id: UUID,
    service: DiariesService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> None:
    await service.soft_delete(UUID(current_user["sub"]), diary_id)
