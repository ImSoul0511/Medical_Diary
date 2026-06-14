from fastapi import APIRouter, Depends
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import require_role
from app.shared.schemas import MessageResponse, error_responses as _error_responses
from app.modules.vaccines.schemas import VaccineCreate, VaccineUpdate, VaccineResponse
from app.modules.vaccines.service import VaccineService

router = APIRouter(prefix="/vaccines", tags=["Vaccines"])

def _get_service(db: AsyncSession = Depends(get_db)) -> VaccineService:
    return VaccineService(db=db)

@router.get("/{target_user_id}", response_model=list[VaccineResponse])
async def get_vaccines(
    target_user_id: UUID,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: VaccineService = Depends(_get_service)
):
    return await service.get_vaccines(target_user_id, current_user["sub"], current_user["role"])

@router.post("/{target_user_id}", response_model=VaccineResponse, status_code=201)
async def create_vaccine(
    target_user_id: UUID,
    data: VaccineCreate,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: VaccineService = Depends(_get_service)
):
    return await service.create_vaccine(target_user_id, data, current_user["sub"], current_user["role"])

@router.patch("/{vaccine_id}", response_model=VaccineResponse)
async def update_vaccine(
    vaccine_id: UUID,
    data: VaccineUpdate,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: VaccineService = Depends(_get_service)
):
    return await service.update_vaccine(vaccine_id, data, current_user["sub"], current_user["role"])

@router.delete("/{vaccine_id}", response_model=MessageResponse)
async def delete_vaccine(
    vaccine_id: UUID,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: VaccineService = Depends(_get_service)
):
    await service.delete_vaccine(vaccine_id, current_user["sub"], current_user["role"])
    return MessageResponse(message="Đã xóa bản ghi tiêm chủng thành công.")
