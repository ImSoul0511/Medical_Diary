from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_role
from app.shared.schemas import ErrorResponse

from app.modules.consent.schemas import (
    AccessRequestItem,
    AccessRequestActionRequest,
    AccessRequestActionResponse,
    ConsentHistoryItem,
    ConsentRevokeResponse,
)
from app.modules.consent.service import ConsentService

# ─── Error response map dùng chung cho Swagger UI ────────────────────────────
_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}

# ─── Service factory ─────────────────────────────────────────────────────────
def _get_service(db: AsyncSession = Depends(get_db)) -> ConsentService:
    return ConsentService(db=db)

# ─── Router ──────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/consent", tags=["Consent"])


@router.get(
    "/access-requests",
    response_model=List[AccessRequestItem],
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        500: _error_responses[500],
    },
    summary="Xem danh sách yêu cầu truy cập đang chờ duyệt",
    description="Bệnh nhân xem tất cả yêu cầu từ bác sĩ có trạng thái 'pending'. Chỉ Role: user.",
)
async def list_pending_requests(
    # Lấy patient_id từ JWT claims (current_user["sub"] = UUID của user đang đăng nhập)
    current_user: dict = Depends(require_role(["user"])),
    service: ConsentService = Depends(_get_service),
) -> List[AccessRequestItem]:
    return await service.list_pending_requests(patient_id=UUID(current_user["sub"]))


@router.patch(
    "/access-requests/{request_id}",
    response_model=AccessRequestActionResponse,
    responses={
        400: _error_responses[400],
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
        409: _error_responses[409],
        500: _error_responses[500],
    },
    summary="Duyệt hoặc từ chối yêu cầu truy cập",
    description=(
        "Bệnh nhân phê duyệt hoặc từ chối yêu cầu truy cập của bác sĩ. "
        "Nếu action='approve': bắt buộc truyền approved_scope. "
        "Nếu action='reject': approved_scope bị bỏ qua. "
        "Chỉ xử lý được request đang ở trạng thái 'pending'. Chỉ Role: user."
    ),
)
async def review_access_request(
    # request_id lấy từ URL path
    request_id: UUID,
    # Body chứa action ("approve"|"reject"), approved_scope, timeout_at
    data: AccessRequestActionRequest,
    # patient_id lấy từ JWT
    current_user: dict = Depends(require_role(["user"])),
    service: ConsentService = Depends(_get_service),
) -> AccessRequestActionResponse:
    return await service.review_request(
        request_id=request_id,
        patient_id=UUID(current_user["sub"]),
        action=data.action,
        approved_scope=data.approved_scope,
        timeout_at=data.timeout_at,
    )


@router.post(
    "/revoke/{doctor_id}",
    response_model=ConsentRevokeResponse,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
        500: _error_responses[500],
    },
    summary="Thu hồi quyền truy cập của bác sĩ",
    description=(
        "Bệnh nhân thu hồi quyền truy cập đang active của một bác sĩ ngay lập tức. "
        "Trả về 404 nếu bác sĩ không có quyền active nào. Chỉ Role: user."
    ),
)
async def revoke_permission(
    # doctor_id lấy từ URL path
    doctor_id: UUID,
    # patient_id lấy từ JWT
    current_user: dict = Depends(require_role(["user"])),
    service: ConsentService = Depends(_get_service),
) -> ConsentRevokeResponse:
    return await service.revoke_permission(
        patient_id=UUID(current_user["sub"]),
        doctor_id=doctor_id,
    )


@router.get(
    "/history",
    response_model=List[ConsentHistoryItem],
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        500: _error_responses[500],
    },
    summary="Xem lịch sử đồng ý — danh sách bác sĩ đang có quyền",
    description=(
        "Bệnh nhân xem tất cả bác sĩ đang có quyền truy cập active (status='active') "
        "cùng scope được cấp và thời điểm cấp. Chỉ Role: user."
    ),
)
async def get_consent_history(
    # patient_id lấy từ JWT
    current_user: dict = Depends(require_role(["user"])),
    service: ConsentService = Depends(_get_service),
) -> List[ConsentHistoryItem]:
    return await service.get_consent_history(patient_id=UUID(current_user["sub"]))
