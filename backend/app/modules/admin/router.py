from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client
from typing import List, Optional

from app.core.database import get_db
from app.shared.dependencies import get_current_user, get_supabase_client, require_role
from app.shared.schemas import ErrorResponse, MessageResponse, PaginatedResponse

from app.modules.admin.schemas import (
    PendingDoctorResponse,
    DoctorVerifyRequest,
    AuditLogItem
)
from app.modules.admin.service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}

def _get_service(
    db: AsyncSession = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
) -> AdminService:
    return AdminService(db=db, supabase=supabase)

@router.get(
    "/doctors/pending",
    response_model=List[PendingDoctorResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]}
)
async def list_pending_doctors(
    current_user: dict = Depends(require_role(["admin"])),
    service: AdminService = Depends(_get_service)
) -> List[PendingDoctorResponse]:
    return await service.list_pending_doctors()

@router.get(
    "/doctors",
    response_model=List[PendingDoctorResponse],
    responses={401: _error_responses[401], 403: _error_responses[403]}
)
async def list_doctors(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái xác minh"),
    current_user: dict = Depends(require_role(["admin"])),
    service: AdminService = Depends(_get_service)
) -> List[PendingDoctorResponse]:
    return await service.list_doctors(status)

@router.patch(
    "/doctors/{doctor_id}/verify",
    response_model=MessageResponse,
    responses={400: _error_responses[400], 401: _error_responses[401], 403: _error_responses[403], 404: _error_responses[404]}
)
async def verify_doctor(
    doctor_id: str,
    data: DoctorVerifyRequest,
    current_user: dict = Depends(require_role(["admin"])),
    service: AdminService = Depends(_get_service)
) -> MessageResponse:
    return await service.verify_doctor(doctor_id, current_user["sub"], data)

@router.get(
    "/audit-logs",
    response_model=PaginatedResponse[AuditLogItem],
    responses={401: _error_responses[401], 403: _error_responses[403]}
)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"])),
    service: AdminService = Depends(_get_service)
) -> PaginatedResponse[AuditLogItem]:
    return await service.get_audit_logs(page, limit, action, user_id, date_from)
