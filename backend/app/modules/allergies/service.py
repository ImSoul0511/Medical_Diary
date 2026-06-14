import logging
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.allergies.models import Allergy
from app.modules.allergies.schemas import AllergyCreate, AllergyUpdate, AllergyResponse
from app.modules.users.models import FamilyMember

logger = logging.getLogger("medical_diary")

class AllergyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_access_permission(self, current_user_id: str, current_role: str, target_user_id: UUID) -> bool:
        if current_role == "user":
            if str(target_user_id) == current_user_id:
                return True
            stmt = select(FamilyMember).where(
                FamilyMember.guardian_id == current_user_id,
                FamilyMember.dependent_id == target_user_id
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                return True
            return False
        elif current_role == "doctor":
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            from app.modules.consent.models import ConsentPermission
            stmt = select(ConsentPermission).where(
                ConsentPermission.doctor_id == current_user_id,
                ConsentPermission.patient_id == target_user_id,
                ConsentPermission.status == "active",
                ConsentPermission.revoked_at.is_(None)
            )
            result = await self.db.execute(stmt)
            permission = result.scalar_one_or_none()
            if not permission:
                return False
            if permission.expires_at and permission.expires_at <= now:
                return False
            scope = list(permission.scope or [])
            if "allergies" not in scope:
                return False
            return True
        return False

    async def get_allergies(self, target_user_id: UUID, current_user_id: str, current_role: str) -> list[AllergyResponse]:
        if not await self.check_access_permission(current_user_id, current_role, target_user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        stmt = select(Allergy).where(
            Allergy.user_id == target_user_id,
            Allergy.deleted_at.is_(None)
        ).order_by(Allergy.created_at.desc())
        
        result = await self.db.execute(stmt)
        return [AllergyResponse.model_validate(a) for a in result.scalars().all()]

    async def create_allergy(self, target_user_id: UUID, data: AllergyCreate, current_user_id: str, current_role: str) -> AllergyResponse:
        if not await self.check_access_permission(current_user_id, current_role, target_user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        allergy = Allergy(
            user_id=target_user_id,
            allergen=data.allergen,
            severity=data.severity,
            reaction=data.reaction,
            notes=data.notes
        )
        self.db.add(allergy)
        await self.db.flush()
        logger.info(f"Allergy {allergy.id} created for {target_user_id} by {current_user_id}")
        return AllergyResponse.model_validate(allergy)

    async def update_allergy(self, allergy_id: UUID, data: AllergyUpdate, current_user_id: str, current_role: str) -> AllergyResponse:
        stmt = select(Allergy).where(Allergy.id == allergy_id, Allergy.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        allergy = result.scalar_one_or_none()
        
        if not allergy:
            raise HTTPException(status_code=404, detail="Không tìm thấy.")
            
        if not await self.check_access_permission(current_user_id, current_role, allergy.user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            for key, value in update_data.items():
                setattr(allergy, key, value)
            allergy.updated_at = text("now()")
            await self.db.flush()
            logger.info(f"Allergy {allergy_id} updated by {current_user_id}")
            
        return AllergyResponse.model_validate(allergy)

    async def delete_allergy(self, allergy_id: UUID, current_user_id: str, current_role: str) -> None:
        stmt = select(Allergy).where(Allergy.id == allergy_id, Allergy.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        allergy = result.scalar_one_or_none()
        
        if not allergy:
            raise HTTPException(status_code=404, detail="Không tìm thấy.")
            
        if not await self.check_access_permission(current_user_id, current_role, allergy.user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        allergy.deleted_at = text("now()")
        await self.db.flush()
        logger.info(f"Allergy {allergy_id} deleted by {current_user_id}")
