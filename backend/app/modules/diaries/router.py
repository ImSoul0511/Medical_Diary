from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.diaries import service
from app.modules.diaries.schemas import DiaryCreateRequest, DiaryResponse
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse

router = APIRouter(prefix="/diaries", tags=["Diaries"])

_error_responses = {
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}


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
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> DiaryResponse:
    return await service.create(db, UUID(current_user["sub"]), data)


@router.get(
    "",
    response_model=List[DiaryResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]},
    summary="Xem danh sách nhật ký của chính mình",
    description="User xem toàn bộ nhật ký chưa bị xóa. Không có patient_id — dùng Phase 4B cho Doctor xem của bệnh nhân.",
)
async def list_diaries(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> List[DiaryResponse]:
    return await service.list_own(db, UUID(current_user["sub"]))


@router.delete(
    "/{diary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]},
    summary="Xóa nhật ký (soft-delete)",
    description="User xóa nhật ký của chính mình. Chỉ cập nhật deleted_at, không hard-delete.",
)
async def delete_diary(
    diary_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["user"])),
) -> None:
    await service.soft_delete(db, UUID(current_user["sub"]), diary_id)
