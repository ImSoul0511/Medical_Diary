import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import HTTPException, BackgroundTasks
from sqlalchemy import or_, select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.email import send_email_sync
from app.modules.consent.models import ConsentPermission, ConsentRequest
from app.modules.notifications.models import Notification
from app.modules.doctors.schemas import (
    ManagedPatientResponse,
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
    async def search_patients(self, phone_number: str) -> list[PatientPublicResponse]:
        """Tìm bệnh nhân theo số điện thoại (giải mã pgcrypto). Chỉ trả về thông tin cơ bản."""

        stmt = (
            select(Profile)
            .where(
                Profile.role == "user",
                Profile.deleted_at.is_(None),
                text("pgp_sym_decrypt(phone_encrypted::bytea, current_setting('app.encryption_key')) = :phone")
            )
            .limit(20)
        )
        result = await self.db.execute(stmt, {"phone": phone_number})
        patients = result.scalars().all()

        logger.info(f"Doctor searched patients with phone_number='{phone_number}', found={len(patients)}")
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
            full_name=profile.full_name,
            gender=profile.gender,
            date_of_birth=profile.date_of_birth,
            blood_type=profile.blood_type if "blood_type" in consent_scope else None,
            allergies=profile.allergies if "allergies" in consent_scope else None,
            emergency_contact=(
                profile.emergency_contact if "emergency_contact" in consent_scope else None
            ),
        )

    # ── 3. Gửi yêu cầu truy cập ────────────────────────────────────────
    async def list_managed_patients(self, doctor_id: UUID) -> list[ManagedPatientResponse]:
        now = datetime.now(timezone.utc)
        
        # 1. Fetch active permissions
        permission_stmt = (
            select(ConsentPermission, Profile.full_name, Profile.gender)
            .join(Profile, Profile.id == ConsentPermission.patient_id)
            .where(
                ConsentPermission.doctor_id == doctor_id,
                ConsentPermission.status == "active",
                Profile.deleted_at.is_(None),
            )
            .order_by(ConsentPermission.granted_at.desc())
        )
        permission_result = await self.db.execute(permission_stmt)
        active_rows = permission_result.all()

        # 2. Fetch pending requests
        request_stmt = (
            select(ConsentRequest, Profile.full_name, Profile.gender)
            .join(Profile, Profile.id == ConsentRequest.patient_id)
            .where(
                ConsentRequest.doctor_id == doctor_id,
                ConsentRequest.status == "pending",
                Profile.deleted_at.is_(None),
            )
            .order_by(ConsentRequest.created_at.desc())
        )
        request_result = await self.db.execute(request_stmt)
        pending_rows = request_result.all()

        response_items = []

        # Add active permissions
        for permission, full_name, gender in active_rows:
            is_expired = permission.expires_at is not None and permission.expires_at <= now
            response_items.append(
                ManagedPatientResponse(
                    patient_id=permission.patient_id,
                    full_name=full_name,
                    gender=gender,
                    scope=list(permission.scope or []),
                    granted_at=permission.granted_at,
                    expires_at=permission.expires_at,
                    access_status="expired" if is_expired else "active",
                )
            )

        # Add pending requests
        for request, full_name, gender in pending_rows:
            response_items.append(
                ManagedPatientResponse(
                    patient_id=request.patient_id,
                    full_name=full_name,
                    gender=gender,
                    scope=list(request.requested_scope or []),
                    granted_at=request.created_at,
                    expires_at=None,
                    access_status="pending",
                )
            )

        logger.info(f"Doctor {doctor_id} listed managed patients (active={len(active_rows)}, pending={len(pending_rows)})")
        return response_items

    async def request_access(
        self, doctor_id: UUID, data: RequestAccessRequest, background_tasks: BackgroundTasks
    ) -> RequestAccessResponse:
        """Tạo bản ghi consent_requests (status=pending) và gửi email thông báo cho bệnh nhân."""

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

        # Guard: Giới hạn số lượng yêu cầu gửi đến cùng 1 bệnh nhân trong 24 giờ (tối đa 3 lần)
        limit_time = datetime.now(timezone.utc) - timedelta(hours=24)
        count_stmt = select(func.count()).select_from(ConsentRequest).where(
            ConsentRequest.doctor_id == doctor_id,
            ConsentRequest.patient_id == data.patient_id,
            ConsentRequest.created_at >= limit_time,
        )
        count_result = await self.db.execute(count_stmt)
        request_count = count_result.scalar() or 0

        if request_count >= 10:
            raise HTTPException(
                status_code=429,
                detail="Bạn đã gửi quá nhiều yêu cầu cho bệnh nhân này (tối đa 10 yêu cầu/24 giờ). Vui lòng thử lại sau.",
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

        # Lấy thông tin tên bác sĩ để gửi email thông báo
        doctor_stmt = select(Profile.full_name).where(Profile.id == doctor_id)
        doctor_res = await self.db.execute(doctor_stmt)
        doctor_name = doctor_res.scalar() or "Bác sĩ"

        # Lấy email của bệnh nhân từ auth.users
        email_query = text("SELECT email FROM auth.users WHERE id = :user_id")
        email_res = await self.db.execute(email_query, {"user_id": data.patient_id})
        email = email_res.scalar()

        # Tạo consent request
        consent_request = ConsentRequest(
            doctor_id=doctor_id,
            patient_id=data.patient_id,
            requested_scope=sorted(data.requested_scope),
            reason=data.reason,
        )
        self.db.add(consent_request)
        await self.db.flush()

        # Tao thong bao trong DB de Supabase Realtime phat song tuc thi toi benh nhan
        scope_desc = ", ".join(data.requested_scope)
        notif = Notification(
            user_id=data.patient_id,
            type="access_request",
            title="Yeu cau truy cap moi",
            message=f"Bac si {doctor_name} muon truy cap ho so cua ban. Pham vi: {scope_desc}.",
            reference_id=consent_request.id,
            is_read=False,
        )
        self.db.add(notif)
        await self.db.flush()

        # Gui email thong bao bo sung (luon gui bat ke user online hay offline)
        if email:
            subject = "[Medical Diary] Yeu cau truy cap ho so suc khoe moi"
            body = (
                f"Xin chao,\n\n"
                f"Bac si {doctor_name} vua gui mot yeu cau truy cap vao ho so suc khoe cua ban.\n"
                f"- Pham vi yeu cau: {scope_desc}\n"
                f"- Ly do: {data.reason or 'Khong duoc cung cap'}\n\n"
                f"Vui long dang nhap vao ung dung Medical Diary de phan hoi (Phe duyet hoac Tu choi) yeu cau nay.\n\n"
                f"Tran trong,\n"
                f"Doi ngu Medical Diary."
            )
            background_tasks.add_task(send_email_sync, email, subject, body)

        logger.info(
            f"Doctor {doctor_id} requested access to patient {data.patient_id} "
            f"(scope={data.requested_scope})"
        )
        return RequestAccessResponse(
            request_id=consent_request.id,
            status=consent_request.status,
            created_at=consent_request.created_at,
        )

    async def get_patient_public_profile(
        self, patient_id: UUID
    ) -> PatientProfileResponse:
        """
        Trả về hồ sơ công khai của bệnh nhân dựa trên cấu hình privacy_settings của họ.
        Không yêu cầu active consent.
        """
        profile_stmt = select(Profile).where(
            Profile.id == patient_id,
            Profile.role == "user",
            Profile.deleted_at.is_(None),
        )
        profile_result = await self.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()

        if profile is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy bệnh nhân.")

        # Đọc privacy_settings. Mặc định là cho phép hiển thị nếu trống hoặc có cấu hình tương ứng
        privacy = profile.privacy_settings or {}
        show_blood_type = privacy.get("show_blood_type", True)
        show_allergies = privacy.get("show_allergies", True)
        show_emergency_contact = privacy.get("show_emergency_contact", True)

        return PatientProfileResponse(
            full_name=profile.full_name,
            gender=profile.gender,
            date_of_birth=None,  # Luôn ẩn ngày sinh ở chế độ xem công khai
            blood_type=profile.blood_type if show_blood_type else None,
            allergies=profile.allergies if show_allergies else None,
            emergency_contact=profile.emergency_contact if show_emergency_contact else None,
        )
