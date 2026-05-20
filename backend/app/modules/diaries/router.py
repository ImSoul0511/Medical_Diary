from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.diaries.schemas import DiaryCreateRequest, DiaryResponse
from app.modules.diaries.service import DiariesService
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse, error_responses as _error_responses

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
    summary="Xem danh sách nhật ký của chính mình",
    description="User xem toàn bộ nhật ký chưa bị xóa. Không có patient_id — dùng Phase 4B cho Doctor xem của bệnh nhân.",
)
async def list_diaries(
    service: DiariesService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> List[DiaryResponse]:
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
