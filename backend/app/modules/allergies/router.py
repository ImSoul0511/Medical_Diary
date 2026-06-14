from fastapi import APIRouter, Depends
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import require_role
from app.shared.schemas import MessageResponse, error_responses as _error_responses
from app.modules.allergies.schemas import AllergyCreate, AllergyUpdate, AllergyResponse
from app.modules.allergies.service import AllergyService

router = APIRouter(prefix="/allergies", tags=["Allergies"])

def _get_service(db: AsyncSession = Depends(get_db)) -> AllergyService:
    return AllergyService(db=db)

@router.get("/{target_user_id}", response_model=list[AllergyResponse])
async def get_allergies(
    target_user_id: UUID,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: AllergyService = Depends(_get_service)
):
    return await service.get_allergies(target_user_id, current_user["sub"], current_user["role"])

@router.post("/{target_user_id}", response_model=AllergyResponse, status_code=201)
async def create_allergy(
    target_user_id: UUID,
    data: AllergyCreate,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: AllergyService = Depends(_get_service)
):
    return await service.create_allergy(target_user_id, data, current_user["sub"], current_user["role"])

@router.patch("/{allergy_id}", response_model=AllergyResponse)
async def update_allergy(
    allergy_id: UUID,
    data: AllergyUpdate,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: AllergyService = Depends(_get_service)
):
    return await service.update_allergy(allergy_id, data, current_user["sub"], current_user["role"])

@router.delete("/{allergy_id}", response_model=MessageResponse)
async def delete_allergy(
    allergy_id: UUID,
    current_user: dict = Depends(require_role(["user", "doctor"])),
    service: AllergyService = Depends(_get_service)
):
    await service.delete_allergy(allergy_id, current_user["sub"], current_user["role"])
    return MessageResponse(message="Đã xóa bản ghi dị ứng thành công.")
