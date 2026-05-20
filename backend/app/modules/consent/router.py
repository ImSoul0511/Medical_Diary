from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.consent.schemas import (
    AccessRequestActionRequest,
    AccessRequestItem,
    ConsentHistoryItem,
)
from app.modules.consent.service import ConsentService
from app.shared.dependencies import require_role
from app.shared.schemas import ErrorResponse, MessageResponse, error_responses as _error_responses


router = APIRouter(prefix="/consent", tags=["Consent"])


def _get_service(db: AsyncSession = Depends(get_db)) -> ConsentService:
    return ConsentService(db)


@router.get(
    "/access-requests",
    response_model=list[AccessRequestItem],
    responses={401: _error_responses[401], 403: _error_responses[403]},
)
async def list_access_requests(
    service: ConsentService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> list[AccessRequestItem]:
    return await service.list_pending_requests(UUID(current_user["sub"]))


@router.patch(
    "/access-requests/{request_id}",
    response_model=MessageResponse,
    responses={
        400: _error_responses[400],
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
)
async def review_access_request(
    request_id: UUID,
    data: AccessRequestActionRequest,
    service: ConsentService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> MessageResponse:
    return await service.review_request(request_id, UUID(current_user["sub"]), data)


@router.post(
    "/revoke/{doctor_id}",
    response_model=MessageResponse,
    responses={
        401: _error_responses[401],
        403: _error_responses[403],
        404: _error_responses[404],
    },
)
async def revoke_doctor_permission(
    doctor_id: UUID,
    service: ConsentService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> MessageResponse:
    return await service.revoke_permission(UUID(current_user["sub"]), doctor_id)


@router.get(
    "/history",
    response_model=list[ConsentHistoryItem],
    responses={401: _error_responses[401], 403: _error_responses[403]},
)
async def get_history(
    service: ConsentService = Depends(_get_service),
    current_user: dict = Depends(require_role(["user"])),
) -> list[ConsentHistoryItem]:
    return await service.get_consent_history(UUID(current_user["sub"]))
