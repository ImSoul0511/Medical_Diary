import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.consent.models import ConsentPermission, ConsentRequest
from app.modules.doctors.schemas import (
    PatientProfileResponse,
    PatientPublicResponse,
    RequestAccessRequest,
    RequestAccessResponse,
)
from app.modules.users.models import Profile

logger = logging.getLogger("medical_diary")


class DoctorService:
    """Service layer cho Phase 4A — Bác sĩ tìm kiếm và xin quyền truy cập bệnh nhân."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 1. Tìm kiếm bệnh nhân ──────────────────────────────────────────
    async def search_patients(self, query: str) -> list[PatientPublicResponse]:
        """Tìm bệnh nhân theo tên (ilike). Chỉ trả về thông tin cơ bản."""

        stmt = (
            select(Profile)
            .where(
                Profile.role == "user",
                Profile.deleted_at.is_(None),
                Profile.full_name.ilike(f"%{query}%"),
            )
            .order_by(Profile.full_name)
            .limit(20)
        )
        result = await self.db.execute(stmt)
        patients = result.scalars().all()

        logger.info(f"Doctor searched patients with query='{query}', found={len(patients)}")
        return [
            PatientPublicResponse(
                id=p.id,
                full_name=p.full_name,
                gender=p.gender,
            )
            for p in patients
        ]

    # ── 2. Xem hồ sơ chi tiết bệnh nhân (cần consent) ──────────────────
    async def get_patient_detail(
        self, doctor_id: UUID, patient_id: UUID
    ) -> PatientProfileResponse:
        """
        Trả về hồ sơ chi tiết bệnh nhân nếu bác sĩ có active consent.
        Raise 403 nếu không có quyền.
        """

        now = datetime.now(timezone.utc)

        # Kiểm tra consent — ORM query thay vì gọi check_consent() để lấy luôn scope
        permission_stmt = select(ConsentPermission).where(
            ConsentPermission.doctor_id == doctor_id,
            ConsentPermission.patient_id == patient_id,
            ConsentPermission.status == "active",
            ConsentPermission.revoked_at.is_(None),
            or_(
                ConsentPermission.expires_at.is_(None),
                ConsentPermission.expires_at > now,
            ),
        )
        permission_result = await self.db.execute(permission_stmt)
        permission = permission_result.scalar_one_or_none()

        if permission is None:
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền truy cập hồ sơ bệnh nhân này. Vui lòng gửi yêu cầu truy cập.",
            )

        # Lấy hồ sơ bệnh nhân
        profile_stmt = select(Profile).where(
            Profile.id == patient_id,
            Profile.role == "user",
            Profile.deleted_at.is_(None),
        )
        profile_result = await self.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()

        if profile is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy bệnh nhân.")

        consent_scope = list(permission.scope or [])

        logger.info(
            f"Doctor {doctor_id} viewed patient {patient_id} profile (scope={consent_scope})"
        )
        return PatientProfileResponse(
            id=profile.id,
            full_name=profile.full_name,
            gender=profile.gender,
            date_of_birth=profile.date_of_birth,
            blood_type=profile.blood_type if "blood_type" in consent_scope else None,
            allergies=profile.allergies if "allergies" in consent_scope else None,
            emergency_contact=(
                profile.emergency_contact if "emergency_contact" in consent_scope else None
            ),
            consent_scope=consent_scope,
        )

    # ── 3. Gửi yêu cầu truy cập ────────────────────────────────────────
    async def request_access(
        self, doctor_id: UUID, data: RequestAccessRequest
    ) -> RequestAccessResponse:
        """Tạo bản ghi consent_requests (status=pending). Trả lỗi 409 nếu đã có pending."""

        # Guard: kiểm tra đã có pending request chưa
        existing_stmt = select(ConsentRequest).where(
            ConsentRequest.doctor_id == doctor_id,
            ConsentRequest.patient_id == data.patient_id,
            ConsentRequest.status == "pending",
        )
        existing_result = await self.db.execute(existing_stmt)

        if existing_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=409,
                detail="Bạn đã gửi yêu cầu truy cập cho bệnh nhân này và đang chờ phê duyệt.",
            )

        # Kiểm tra patient tồn tại
        patient_stmt = select(Profile).where(
            Profile.id == data.patient_id,
            Profile.role == "user",
            Profile.deleted_at.is_(None),
        )
        patient_result = await self.db.execute(patient_stmt)

        if patient_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy bệnh nhân.")

        # Tạo consent request
        consent_request = ConsentRequest(
            doctor_id=doctor_id,
            patient_id=data.patient_id,
            requested_scope=sorted(data.requested_scope),
            reason=data.reason,
        )
        self.db.add(consent_request)
        await self.db.flush()

        logger.info(
            f"Doctor {doctor_id} requested access to patient {data.patient_id} "
            f"(scope={data.requested_scope})"
        )
        return RequestAccessResponse(
            request_id=consent_request.id,
            status=consent_request.status,
            created_at=consent_request.created_at,
        )
