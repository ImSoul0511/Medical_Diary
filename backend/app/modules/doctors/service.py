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
from app.shared.schemas import MessageResponse


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

        # Ghi đè các yêu cầu pending cũ nếu có
        existing_stmt = select(ConsentRequest).where(
            ConsentRequest.doctor_id == doctor_id,
            ConsentRequest.patient_id == data.patient_id,
            ConsentRequest.status == "pending",
        )
        existing_result = await self.db.execute(existing_stmt)
        existing_requests = existing_result.scalars().all()
        for old_req in existing_requests:
            await self.db.delete(old_req)
        await self.db.flush()

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
        scope_map = {
            "blood_type": "Nhóm máu",
            "allergies": "Dị ứng",
            "emergency_contact": "Liên hệ khẩn cấp",
            "medical_records": "Hồ sơ bệnh án",
            "prescriptions": "Đơn thuốc",
            "diaries": "Nhật ký triệu chứng",
            "heart_rate": "Nhịp tim",
            "step_count": "Bước chân",
            "respiratory_rate": "Nhịp thở",
            "manual_health_records": "Chỉ số nhập tay",
            "patient_documents": "Tài liệu y tế cá nhân",
        }
        translated_scopes = [scope_map.get(s, s) for s in data.requested_scope]
        scope_desc = ", ".join(translated_scopes)

        notif = Notification(
            user_id=data.patient_id,
            type="access_request",
            title="Yêu cầu truy cập mới",
            message=f"Bác sĩ {doctor_name} muốn truy cập hồ sơ của bạn. Phạm vi: {scope_desc}.",
            reference_id=consent_request.id,
            is_read=False,
        )
        self.db.add(notif)
        await self.db.flush()

        # Gui email thong bao bo sung (luon gui bat ke user online hay offline)
        if email:
            subject = "[Medical Diary] Yêu cầu truy cập hồ sơ sức khỏe mới"
            body = f"""
<div style="font-family: Arial, sans-serif; background-color: #F8FAFC; padding: 40px 20px; color: #1E293B;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background-color: #0EA5E9; padding: 20px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Medical Diary</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="margin-top: 0; color: #1E293B; font-size: 20px;">Yêu cầu truy cập hồ sơ sức khỏe</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #64748B;">Xin chào,</p>
      <p style="font-size: 16px; line-height: 1.5; color: #64748B;"><strong>Bác sĩ {doctor_name}</strong> vừa gửi một yêu cầu cấp quyền truy cập vào hồ sơ sức khỏe của bạn.</p>
      
      <div style="background-color: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Phạm vi truy cập:</strong> {scope_desc}</p>
        <p style="margin: 0; font-size: 15px;"><strong>Lý do:</strong> {data.reason or 'Không được cung cấp'}</p>
      </div>

      <p style="font-size: 16px; line-height: 1.5; color: #64748B;">Vui lòng đăng nhập vào ứng dụng Medical Diary để phản hồi (Phê duyệt hoặc Từ chối) yêu cầu này.</p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #64748B; margin-top: 30px; margin-bottom: 0;">Trân trọng,<br><strong>Đội ngũ Medical Diary</strong></p>
    </div>
    <div style="background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 13px; color: #94A3B8;">
      <p style="margin: 0;">&copy; {datetime.now().year} Medical Diary. All rights reserved.</p>
    </div>
  </div>
</div>
"""
            background_tasks.add_task(send_email_sync, email, subject, body, True)

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

    async def unfollow_patient(self, doctor_id: UUID, patient_id: UUID) -> MessageResponse:
        """
        Bác sĩ hủy theo dõi bệnh nhân.
        - Thu hồi ConsentPermission đang active (nếu có).
        - Hủy ConsentRequest đang pending (nếu có).
        """
        # 1. Thu hồi permission đang hoạt động
        perm_stmt = select(ConsentPermission).where(
            ConsentPermission.doctor_id == doctor_id,
            ConsentPermission.patient_id == patient_id,
            ConsentPermission.status == "active",
        )
        perm_res = await self.db.execute(perm_stmt)
        permission = perm_res.scalar_one_or_none()

        if permission:
            permission.status = "revoked"
            permission.revoked_at = datetime.now(timezone.utc)

        # 2. Hủy các yêu cầu đang chờ duyệt (pending)
        req_stmt = select(ConsentRequest).where(
            ConsentRequest.doctor_id == doctor_id,
            ConsentRequest.patient_id == patient_id,
            ConsentRequest.status == "pending",
        )
        req_res = await self.db.execute(req_stmt)
        requests = req_res.scalars().all()

        for req in requests:
            req.status = "rejected"
            req.responded_at = datetime.now(timezone.utc)

        if not permission and not requests:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy liên kết hoặc yêu cầu chờ duyệt với bệnh nhân này.",
            )

        await self.db.flush()
        return MessageResponse(message="Hủy theo dõi bệnh nhân thành công.")

