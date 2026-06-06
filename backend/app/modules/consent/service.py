from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.consent.models import ConsentPermission, ConsentRequest
from app.modules.consent.schemas import (
    AccessRequestActionRequest,
    AccessRequestItem,
    ConsentHistoryItem,
)
from app.modules.users.models import Profile
from app.shared.schemas import MessageResponse


class ConsentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_pending_requests(
        self,
        patient_id: UUID,
    ) -> list[AccessRequestItem]:
        stmt = (
            select(ConsentRequest, Profile.full_name)
            .join(Profile, Profile.id == ConsentRequest.doctor_id)
            .where(
                ConsentRequest.patient_id == patient_id,
                ConsentRequest.status == "pending",
                Profile.deleted_at.is_(None),
            )
            .order_by(ConsentRequest.created_at.desc())
        )
        result = await self.db.execute(stmt)

        return [
            AccessRequestItem(
                request_id=request.id,
                doctor_id=request.doctor_id,
                doctor_name=doctor_name,
                requested_scope=list(request.requested_scope or []),
                reason=request.reason,
                status=request.status,
                requested_at=request.created_at,
            )
            for request, doctor_name in result.all()
        ]

    async def review_request(
        self,
        request_id: UUID,
        patient_id: UUID,
        data: AccessRequestActionRequest,
    ) -> MessageResponse:
        stmt = select(ConsentRequest).where(
            ConsentRequest.id == request_id,
            ConsentRequest.patient_id == patient_id,
        )
        result = await self.db.execute(stmt)
        consent_request = result.scalar_one_or_none()

        if consent_request is None:
            raise HTTPException(status_code=404, detail="Access request not found")

        if consent_request.status != "pending":
            raise HTTPException(status_code=400, detail="Access request is no longer pending")

        now = datetime.now(timezone.utc)
        consent_request.status = data.action
        consent_request.responded_at = now

        if data.action == "rejected":
            await self.db.flush()
            return MessageResponse(message="Access request rejected successfully")

        requested_scope = set(consent_request.requested_scope or [])
        scope_source = (
            consent_request.requested_scope
            if data.approved_scope is None
            else data.approved_scope
        )
        approved_scope = set(scope_source or [])

        if not approved_scope:
            raise HTTPException(status_code=400, detail="Approved scope cannot be empty")

        if not approved_scope.issubset(requested_scope):
            raise HTTPException(
                status_code=400,
                detail="Approved scope must be a subset of requested scope",
            )
        expires_at = None
        if data.expires_in_days is not None:
            expires_at = now + timedelta(days=data.expires_in_days)

        permission_stmt = select(ConsentPermission).where(
            ConsentPermission.doctor_id == consent_request.doctor_id,
            ConsentPermission.patient_id == patient_id,
            ConsentPermission.status == "active",
        )
        permission_result = await self.db.execute(permission_stmt)
        permission = permission_result.scalar_one_or_none()

        if permission is None:
            permission = ConsentPermission(
                doctor_id=consent_request.doctor_id,
                patient_id=patient_id,
                scope=sorted(approved_scope),
                status="active",
                expires_at=expires_at,
            )
            self.db.add(permission)
        else:
            # Merge: giữ lại scope cũ + thêm scope mới (tránh mất quyền đã cấp trước đó)
            existing_scope = set(permission.scope or [])
            merged_scope = existing_scope | approved_scope
            permission.scope = sorted(merged_scope)
            permission.revoked_at = None
            permission.expires_at = expires_at

        await self.db.flush()
        return MessageResponse(message="Access request approved successfully")

    async def revoke_permission(
        self,
        patient_id: UUID,
        doctor_id: UUID,
    ) -> MessageResponse:
        stmt = select(ConsentPermission).where(
            ConsentPermission.patient_id == patient_id,
            ConsentPermission.doctor_id == doctor_id,
            ConsentPermission.status == "active",
        )
        result = await self.db.execute(stmt)
        permission = result.scalar_one_or_none()

        if permission is None:
            raise HTTPException(status_code=404, detail="Active permission not found")

        permission.status = "revoked"
        permission.revoked_at = datetime.now(timezone.utc)

        await self.db.flush()
        return MessageResponse(message="Access revoked successfully")

    async def get_consent_history(
        self,
        patient_id: UUID,
    ) -> list[ConsentHistoryItem]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(ConsentPermission, Profile.full_name)
            .join(Profile, Profile.id == ConsentPermission.doctor_id)
            .where(
                ConsentPermission.patient_id == patient_id,
                ConsentPermission.status == "active",
                ConsentPermission.revoked_at.is_(None),
                or_(ConsentPermission.expires_at.is_(None), ConsentPermission.expires_at > now),
                Profile.deleted_at.is_(None),
            )
            .order_by(ConsentPermission.granted_at.desc())
        )
        result = await self.db.execute(stmt)

        return [
            ConsentHistoryItem(
                doctor_id=permission.doctor_id,
                doctor_name=doctor_name,
                scope=list(permission.scope or []),
                granted_at=permission.granted_at,
                expires_at=permission.expires_at,
            )
            for permission, doctor_name in result.all()
        ]
