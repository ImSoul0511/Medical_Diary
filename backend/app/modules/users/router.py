from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from typing import List, Optional

from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_role
from app.shared.schemas import ErrorResponse

from app.modules.users.schemas import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    PrivacyUpdateRequest,
    AccessHistoryItem,
    DoctorPublicResponse
)
from app.modules.users.service import UsersService

_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}

def _get_service(db: AsyncSession = Depends(get_db)) -> UsersService:
    return UsersService(db=db)

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserProfileResponse, responses={401: _error_responses[401], 404: _error_responses[404]})
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    service: UsersService = Depends(_get_service)
) -> UserProfileResponse:
    return await service.get_profile(current_user["sub"])

@router.patch("/me", response_model=UserProfileResponse, responses={400: _error_responses[400], 401: _error_responses[401]})
async def update_my_profile(
    data: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: UsersService = Depends(_get_service)
) -> UserProfileResponse:
    return await service.update_profile(current_user["sub"], data)

@router.patch("/privacy", response_model=dict, responses={400: _error_responses[400], 401: _error_responses[401]})
async def update_privacy_settings(
    data: PrivacyUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: UsersService = Depends(_get_service)
) -> dict:
    return await service.update_privacy(current_user["sub"], data)

@router.get("/me/export", response_class=StreamingResponse, responses={400: _error_responses[400], 401: _error_responses[401]})
async def export_data(
    format: str = Query("pdf", pattern="^(json|pdf)$"),
    scope: str = Query("profile"),
    current_user: dict = Depends(get_current_user),
    service: UsersService = Depends(_get_service)
) -> StreamingResponse:
    return await service.export_data(current_user["sub"], format, scope)

@router.get("/me/access-history", response_model=List[AccessHistoryItem], responses={401: _error_responses[401], 500: _error_responses[500]})
async def get_access_history(
    current_user: dict = Depends(get_current_user),
    service: UsersService = Depends(_get_service)
) -> List[AccessHistoryItem]:
    return await service.get_access_history(current_user["sub"])

@router.get("/search-doctors", response_model=List[DoctorPublicResponse], responses={401: _error_responses[401], 403: _error_responses[403]})
async def search_doctors(
    name: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["user"])),
    service: UsersService = Depends(_get_service)
) -> List[DoctorPublicResponse]:
    return await service.search_doctors(name, specialty)
