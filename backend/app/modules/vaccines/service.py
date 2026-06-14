import logging
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.vaccines.models import Vaccine
from app.modules.vaccines.schemas import VaccineCreate, VaccineUpdate, VaccineResponse
from app.modules.users.models import FamilyMember

logger = logging.getLogger("medical_diary")

class VaccineService:
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
            if "vaccines" not in scope:
                return False
            return True
        return False

    async def get_vaccines(self, target_user_id: UUID, current_user_id: str, current_role: str) -> list[VaccineResponse]:
        if not await self.check_access_permission(current_user_id, current_role, target_user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        stmt = select(Vaccine).where(
            Vaccine.user_id == target_user_id,
            Vaccine.deleted_at.is_(None)
        ).order_by(Vaccine.vaccination_date.desc())
        
        result = await self.db.execute(stmt)
        return [VaccineResponse.model_validate(a) for a in result.scalars().all()]

    async def create_vaccine(self, target_user_id: UUID, data: VaccineCreate, current_user_id: str, current_role: str) -> VaccineResponse:
        if not await self.check_access_permission(current_user_id, current_role, target_user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        vaccine = Vaccine(
            user_id=target_user_id,
            vaccine_name=data.vaccine_name,
            disease_targeted=data.disease_targeted,
            dose_number=data.dose_number,
            vaccination_date=data.vaccination_date,
            administered_by=data.administered_by,
            notes=data.notes
        )
        self.db.add(vaccine)
        await self.db.flush()
        logger.info(f"Vaccine {vaccine.id} created for {target_user_id} by {current_user_id}")
        return VaccineResponse.model_validate(vaccine)

    async def update_vaccine(self, vaccine_id: UUID, data: VaccineUpdate, current_user_id: str, current_role: str) -> VaccineResponse:
        stmt = select(Vaccine).where(Vaccine.id == vaccine_id, Vaccine.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        vaccine = result.scalar_one_or_none()
        
        if not vaccine:
            raise HTTPException(status_code=404, detail="Không tìm thấy.")
            
        if not await self.check_access_permission(current_user_id, current_role, vaccine.user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            for key, value in update_data.items():
                setattr(vaccine, key, value)
            vaccine.updated_at = text("now()")
            await self.db.flush()
            logger.info(f"Vaccine {vaccine_id} updated by {current_user_id}")
            
        return VaccineResponse.model_validate(vaccine)

    async def delete_vaccine(self, vaccine_id: UUID, current_user_id: str, current_role: str) -> None:
        stmt = select(Vaccine).where(Vaccine.id == vaccine_id, Vaccine.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        vaccine = result.scalar_one_or_none()
        
        if not vaccine:
            raise HTTPException(status_code=404, detail="Không tìm thấy.")
            
        if not await self.check_access_permission(current_user_id, current_role, vaccine.user_id):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
            
        vaccine.deleted_at = text("now()")
        await self.db.flush()
        logger.info(f"Vaccine {vaccine_id} deleted by {current_user_id}")
