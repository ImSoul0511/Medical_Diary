from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import NotificationsService
from app.shared.dependencies import get_current_user
from app.shared.schemas import MessageResponse
from app.shared.schemas import error_responses as _error_responses

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _get_service(db: AsyncSession = Depends(get_db)) -> NotificationsService:
    return NotificationsService(db)


@router.get(
    "",
    response_model=List[NotificationResponse],
    responses={401: _error_responses[401]},
    summary="Lấy danh sách thông báo",
    description="Lấy danh sách thông báo của người dùng hiện tại, sắp xếp mới nhất trước.",
)
async def list_notifications(
    service: NotificationsService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
) -> List[NotificationResponse]:
    return await service.list_notifications(UUID(current_user["sub"]))


@router.patch(
    "/{id}/read",
    response_model=MessageResponse,
    responses={401: _error_responses[401], 404: _error_responses[404]},
    summary="Đánh dấu thông báo đã đọc",
    description="Đánh dấu thông báo cụ thể là đã đọc.",
)
async def mark_as_read(
    id: UUID,
    service: NotificationsService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    return await service.mark_as_read(UUID(current_user["sub"]), id)
