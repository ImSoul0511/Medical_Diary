"""
Service Layer — Module: Emergency

OOP Service: EmergencyService
Xử lý toàn bộ nghiệp vụ liên quan đến QR token khẩn cấp.

Rules tuân thủ:
- flush() trong service, commit() do get_db() xử lý
- Soft delete (cập nhật deleted_at, không xóa vật lý)
- Ưu tiên SQLAlchemy ORM, không dùng f-string nối SQL
- logging chuẩn theo pattern của dự án
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.emergency.models import EmergencyAccessLog, EmergencyToken
from app.modules.emergency.schemas import (
    EmergencyAccessLogItem,
    EmergencyAccessResponse,
    EmergencyTokenCreateRequest,
    EmergencyTokenItem,
    EmergencyTokenResponse,
    EmergencyTokenUpdateRequest,
)
from app.modules.users.models import Profile
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")


class EmergencyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Helpers ─────────────────────────────────────────────────────────────

    def _compute_is_expired(self, expires_at: datetime | None) -> bool:
        """Token hết hạn khi expires_at không None và đã qua thời điểm hiện tại."""
        if expires_at is None:
            return False
        return expires_at < datetime.now(timezone.utc)

    def _token_to_item(self, token: EmergencyToken) -> EmergencyTokenItem:
        """Chuyển ORM EmergencyToken → EmergencyTokenItem (dùng chung cho list & update)."""
        return EmergencyTokenItem(
            id=token.id,
            token=token.token,
            expires_at=token.expires_at,
            is_expired=self._compute_is_expired(token.expires_at),
            created_at=token.created_at,
            show_blood_type=token.show_blood_type,
            show_allergies=token.show_allergies,
            show_emergency_contact=token.show_emergency_contact,
        )

    def _profile_allows_public_field(self, profile: Profile, key: str) -> bool:
        """Global profile privacy is the upper bound for any per-token visibility."""
        privacy_settings = profile.privacy_settings
        if not isinstance(privacy_settings, dict):
            return False
        return privacy_settings.get(key) is True

    async def _get_owned_token(self, token_id: UUID, user_id: UUID) -> EmergencyToken:
        """Lấy token thuộc về user. Raise 404 nếu không tìm thấy hoặc đã bị revoke."""
        stmt = select(EmergencyToken).where(
            EmergencyToken.id == token_id,
            EmergencyToken.user_id == user_id,
            EmergencyToken.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        token = result.scalar_one_or_none()

        if token is None:
            raise HTTPException(status_code=404, detail="Token không tồn tại hoặc đã bị vô hiệu hóa.")
        return token

    # ─── Methods ─────────────────────────────────────────────────────────────

    async def create_token(
        self,
        user_id: UUID,
        data: EmergencyTokenCreateRequest,
    ) -> EmergencyTokenResponse:
        """Tạo QR token mới cho user.
        ttl_minutes = None → token vĩnh viễn (expires_at = NULL trong DB).
        """
        now = datetime.now(timezone.utc)

        # Kiểm tra số lượng token đang hoạt động (chưa bị xóa, chưa hết hạn)
        stmt = select(EmergencyToken).where(
            EmergencyToken.user_id == user_id,
            EmergencyToken.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        active_tokens = [t for t in result.scalars().all() if not self._compute_is_expired(t.expires_at)]
        if len(active_tokens) >= 4:
            raise HTTPException(
                status_code=400,
                detail="Bạn đã đạt giới hạn tối đa 4 mã QR đang hoạt động. Vui lòng vô hiệu hóa bớt mã QR cũ trước khi tạo mới."
            )

        expires_at = None
        if data.ttl_minutes is not None:
            expires_at = now + timedelta(minutes=data.ttl_minutes)

        # Sinh token an toàn với prefix dễ nhận diện
        token_str = "emg_" + secrets.token_urlsafe(32)

        token = EmergencyToken(
            user_id=user_id,
            token=token_str,
            expires_at=expires_at,
            show_blood_type=data.show_blood_type,
            show_allergies=data.show_allergies,
            show_emergency_contact=data.show_emergency_contact,
        )
        self.db.add(token)
        await self.db.flush()

        logger.info(f"Emergency token created for user: {user_id} | expires_at: {expires_at}")
        return EmergencyTokenResponse(
            emergency_token=token_str,
            expires_at=expires_at,
        )

    async def list_tokens(self, user_id: UUID) -> list[EmergencyTokenItem]:
        """Lấy danh sách tất cả QR token chưa bị revoke của user."""
        stmt = (
            select(EmergencyToken)
            .where(
                EmergencyToken.user_id == user_id,
                EmergencyToken.deleted_at.is_(None),
            )
            .order_by(EmergencyToken.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Listed {len(rows)} emergency tokens for user: {user_id}")
        return [self._token_to_item(row) for row in rows]

    async def update_token(
        self,
        user_id: UUID,
        token_id: UUID,
        data: EmergencyTokenUpdateRequest,
    ) -> EmergencyTokenItem:
        """Cập nhật TTL của một token.
        ttl_minutes = None → chuyển token sang vĩnh viễn (expires_at = NULL).
        """
        token = await self._get_owned_token(token_id, user_id)

        if data.ttl_minutes is not None:
            token.expires_at = datetime.now(timezone.utc) + timedelta(minutes=data.ttl_minutes)
        else:
            # Chuyển sang token vĩnh viễn
            token.expires_at = None

        await self.db.flush()

        logger.info(f"Emergency token {token_id} updated by user: {user_id} | new expires_at: {token.expires_at}")
        return self._token_to_item(token)

    async def revoke_token(self, user_id: UUID, token_id: UUID) -> MessageResponse:
        """Soft-delete (vô hiệu hóa) một QR token.
        Cập nhật deleted_at, không xóa khỏi DB để giữ lịch sử access log.
        """
        token = await self._get_owned_token(token_id, user_id)

        token.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

        logger.info(f"Emergency token {token_id} revoked by user: {user_id}")
        return MessageResponse(message="Token đã được vô hiệu hóa thành công.")

    async def access_by_token(self, token_str: str) -> EmergencyAccessResponse:
        """Public endpoint — cấp cứu viên quét QR để lấy thông tin khẩn cấp.

        Logic:
        1. Tìm token hợp lệ (chưa bị revoke).
        2. Kiểm tra hết hạn → 410 Gone.
        3. JOIN profiles, đọc privacy_settings để lọc field.
        4. Ghi log vào emergency_access_logs.
        """
        # 1. Tìm token
        stmt = (
            select(EmergencyToken, Profile)
            .join(Profile, Profile.id == EmergencyToken.user_id)
            .where(
                EmergencyToken.token == token_str,
                EmergencyToken.deleted_at.is_(None),
                Profile.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        row = result.first()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Token không tồn tại hoặc đã bị vô hiệu hóa.",
            )

        token, profile = row

        # 2. Kiểm tra hết hạn
        if self._compute_is_expired(token.expires_at):
            raise HTTPException(
                status_code=410,
                detail="Token đã hết hạn. Vui lòng yêu cầu bệnh nhân tạo token mới.",
            )

        # 3. Token-specific settings can only narrow the user's global privacy settings.
        blood_type = (
            profile.blood_type
            if token.show_blood_type and self._profile_allows_public_field(profile, "show_blood_type")
            else None
        )
        allergies = (
            profile.allergies
            if token.show_allergies and self._profile_allows_public_field(profile, "show_allergies")
            else None
        )
        emergency_contact = (
            profile.emergency_contact
            if token.show_emergency_contact
            and self._profile_allows_public_field(profile, "show_emergency_contact")
            else None
        )

        # 4. Ghi access log (không cần flush riêng — sẽ flush cùng commit)
        access_log = EmergencyAccessLog(
            token_id=token.id,
            accessed_at=datetime.now(timezone.utc),
        )
        self.db.add(access_log)
        await self.db.flush()

        logger.info(f"Emergency access via token: {token.id} | user: {profile.id}")
        return EmergencyAccessResponse(
            full_name=profile.full_name,
            blood_type=blood_type,
            allergies=allergies,
            emergency_contact=emergency_contact,
        )

    async def get_access_history(self, user_id: UUID) -> list[EmergencyAccessLogItem]:
        """Lấy toàn bộ lịch sử quét QR của user (gồm cả token đã revoke).
        JOIN emergency_tokens để lọc theo user_id.
        """
        stmt = (
            select(EmergencyAccessLog)
            .join(EmergencyToken, EmergencyToken.id == EmergencyAccessLog.token_id)
            .where(EmergencyToken.user_id == user_id)
            .order_by(EmergencyAccessLog.accessed_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        logger.info(f"Listed {len(rows)} emergency access logs for user: {user_id}")
        return [
            EmergencyAccessLogItem(
                id=row.id,
                token_id=row.token_id,
                accessed_at=row.accessed_at,
            )
            for row in rows
        ]
