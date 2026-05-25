"""
Router — Module: Emergency

Endpoints:
  POST   /emergency/token                — Tạo QR token (Role: User)
  GET    /emergency/tokens               — Danh sách tokens (Role: User)
  GET    /emergency/tokens/history       — Lịch sử quét QR (Role: User)  ← PHẢI trước /{token_id}
  PATCH  /emergency/tokens/{token_id}    — Cập nhật TTL (Role: User)
  DELETE /emergency/tokens/{token_id}    — Revoke token (Role: User)
  GET    /emergency/access/{token}       — Truy cập khẩn cấp (Public)

Lưu ý: get_db() vẫn hoạt động với Public endpoint vì RLSMiddleware chỉ
SET jwt_claims = '{}' nếu không có Bearer header (không raise lỗi).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.emergency.schemas import (
    EmergencyAccessLogItem,
    EmergencyAccessResponse,
    EmergencyTokenCreateRequest,
    EmergencyTokenItem,
    EmergencyTokenResponse,
    EmergencyTokenUpdateRequest,
)
from app.modules.emergency.service import EmergencyService
from app.shared.dependencies import require_role
from app.shared.schemas import MessageResponse, error_responses as _error_responses

router = APIRouter(prefix="/emergency", tags=["Emergency"])


def _get_service(db: AsyncSession = Depends(get_db)) -> EmergencyService:
    return EmergencyService(db)


# ─── User endpoints (Role: user) ─────────────────────────────────────────────

@router.post(
    "/token",
    response_model=EmergencyTokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
    },
    summary="Tạo QR token khẩn cấp",
    description=(
        "User tạo mã QR khẩn cấp. "
        "Truyền `ttl_minutes` để đặt thời hạn (tối thiểu 5 phút). "
        "Bỏ trống hoặc truyền `null` để tạo token vĩnh viễn (dùng in ra mang theo)."
    ),
)
async def create_token(
    data: EmergencyTokenCreateRequest,
    service: EmergencyService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> EmergencyTokenResponse:
    return await service.create_token(UUID(current_user["sub"]), data)


@router.get(
    "/tokens",
    response_model=list[EmergencyTokenItem],
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
    },
    summary="Danh sách QR tokens của tôi",
    description="Lấy tất cả QR token chưa bị revoke, sắp xếp mới nhất trước. Bao gồm field `is_expired` được tính tự động.",
)
async def list_tokens(
    service: EmergencyService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> list[EmergencyTokenItem]:
    return await service.list_tokens(UUID(current_user["sub"]))


# QUAN TRỌNG: Route tĩnh /tokens/history PHẢI đứng trước route động /tokens/{token_id}
# để FastAPI không nhầm chuỗi "history" thành một UUID.
@router.get(
    "/tokens/history",
    response_model=list[EmergencyAccessLogItem],
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
    },
    summary="Lịch sử quét QR token",
    description="Xem toàn bộ lịch sử các lần cấp cứu viên quét QR của tôi, sắp xếp mới nhất trước.",
)
async def get_access_history(
    service: EmergencyService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> list[EmergencyAccessLogItem]:
    return await service.get_access_history(UUID(current_user["sub"]))


@router.patch(
    "/tokens/{token_id}",
    response_model=EmergencyTokenItem,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
    summary="Cập nhật TTL của QR token",
    description=(
        "Gia hạn hoặc rút ngắn thời hạn của token. "
        "Truyền `null` cho `ttl_minutes` để chuyển token sang vĩnh viễn."
    ),
)
async def update_token(
    token_id: UUID,
    data: EmergencyTokenUpdateRequest,
    service: EmergencyService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> EmergencyTokenItem:
    return await service.update_token(UUID(current_user["sub"]), token_id, data)


@router.delete(
    "/tokens/{token_id}",
    response_model=MessageResponse,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
    summary="Vô hiệu hóa (revoke) QR token",
    description="Soft-delete token: cập nhật deleted_at. Token bị vô hiệu hóa không dùng được nữa nhưng lịch sử quét vẫn được giữ lại.",
)
async def revoke_token(
    token_id: UUID,
    service: EmergencyService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> MessageResponse:
    return await service.revoke_token(UUID(current_user["sub"]), token_id)


# ─── Public endpoint (không cần auth) ────────────────────────────────────────

@router.get(
    "/access/{token}",
    response_model=EmergencyAccessResponse,
    responses={
        404: _error_responses[404],
        410: {"description": "Token đã hết hạn"},
    },
    summary="Truy cập thông tin khẩn cấp qua QR (Public)",
    description=(
        "Endpoint công khai — không cần đăng nhập. "
        "Cấp cứu viên quét QR để xem thông tin y tế tối thiểu của bệnh nhân. "
        "Chỉ trả về các trường mà bệnh nhân bật trong `privacy_settings`. "
        "Mỗi lần truy cập thành công được ghi vào `emergency_access_logs`."
    ),
)
async def access_by_token(
    token: str,
    service: EmergencyService = Depends(_get_service),
) -> EmergencyAccessResponse:
    return await service.access_by_token(token)
