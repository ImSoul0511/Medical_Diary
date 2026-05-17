import logging
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.consent.schemas import (
    AccessRequestActionResponse,
    AccessRequestItem,
    ConsentHistoryItem,
    ConsentRevokeResponse,
)

logger = logging.getLogger("medical_diary")

# TODO: ConsentPermission model chưa có cột `timeout_at`.
# Để hỗ trợ auto-revoke theo thời gian, cần:
#   1. Thêm dòng sau vào class ConsentPermission trong app/modules/consent/models.py:
#        timeout_at = Column(DateTime(timezone=True), nullable=True)
#   2. Chạy: alembic revision --autogenerate -m "add timeout_at to consent_permissions"
#   3. Chạy: alembic upgrade head
#   Sau đó truyền timeout_at vào INSERT consent_permissions trong review_request().


class ConsentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_pending_requests(self, patient_id: UUID) -> list[AccessRequestItem]:
        """Patient xem danh sách yêu cầu truy cập đang chờ duyệt."""
        try:
            query = text("""
                SELECT cr.id, cr.doctor_id, p.full_name AS doctor_name,
                       cr.status, cr.requested_scope, cr.created_at
                FROM consent_requests cr
                JOIN profiles p ON cr.doctor_id = p.id
                WHERE cr.patient_id = :patient_id AND cr.status = 'pending'
                ORDER BY cr.created_at DESC
            """)
            result = await self.db.execute(query, {"patient_id": str(patient_id)})
            rows = result.fetchall()

            logger.info(f"Listed {len(rows)} pending requests for patient: {patient_id}")
            return [
                AccessRequestItem(
                    request_id=row.id,
                    doctor_id=row.doctor_id,
                    doctor_name=row.doctor_name,
                    status=row.status,
                    requested_scope=row.requested_scope,
                    requested_at=row.created_at,
                )
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Failed to list pending requests for {patient_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy danh sách yêu cầu.")

    async def review_request(
        self,
        request_id: UUID,
        patient_id: UUID,
        action: str,
        approved_scope: list[str] | None,
        timeout_at: datetime | None,
    ) -> AccessRequestActionResponse:
        """Patient duyệt hoặc từ chối yêu cầu truy cập.

        timeout_at hiện chưa được lưu vì ConsentPermission.timeout_at chưa tồn tại.
        Sau khi thêm cột (xem TODO đầu file), bổ sung timeout_at vào INSERT bên dưới.
        """
        try:
            if action not in ("approve", "reject"):
                raise HTTPException(status_code=400, detail="action phải là 'approve' hoặc 'reject'.")
            if action == "approve" and not approved_scope:
                raise HTTPException(status_code=400, detail="approved_scope không được rỗng khi approve.")

            # 1. Fetch request, kiểm tra ownership + trạng thái
            fetch_query = text("""
                SELECT cr.id, cr.doctor_id, cr.requested_scope, cr.status, cr.created_at,
                       p.full_name AS doctor_name
                FROM consent_requests cr
                JOIN profiles p ON cr.doctor_id = p.id
                WHERE cr.id = :request_id AND cr.patient_id = :patient_id
            """)
            result = await self.db.execute(fetch_query, {
                "request_id": str(request_id),
                "patient_id": str(patient_id),
            })
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Yêu cầu không tồn tại.")
            if row.status != "pending":
                raise HTTPException(status_code=409, detail="Yêu cầu đã được xử lý trước đó.")

            # 2. Cập nhật trạng thái consent_request
            new_status = "approved" if action == "approve" else "rejected"
            update_query = text("""
                UPDATE consent_requests
                SET status = :status, responded_at = now()
                WHERE id = :request_id
            """)
            await self.db.execute(update_query, {
                "status": new_status,
                "request_id": str(request_id),
            })

            # 3. Nếu approve: upsert consent_permissions
            if action == "approve":
                # Partial unique index: uq_consent_permissions_active ON (doctor_id, patient_id) WHERE status = 'active'
                upsert_query = text("""
                    INSERT INTO consent_permissions (doctor_id, patient_id, scope, status, granted_at)
                    VALUES (:doctor_id, :patient_id, :scope, 'active', now())
                    ON CONFLICT (doctor_id, patient_id) WHERE status = 'active'
                    DO UPDATE SET scope = EXCLUDED.scope, granted_at = now(), revoked_at = NULL
                """)
                await self.db.execute(upsert_query, {
                    "doctor_id": str(row.doctor_id),
                    "patient_id": str(patient_id),
                    "scope": approved_scope,
                })

            await self.db.commit()
            logger.info(f"Request {request_id} {new_status} by patient {patient_id}")

            return AccessRequestActionResponse(
                action=action,
                approved_scope=approved_scope if action == "approve" else None,
                timeout_at=timeout_at,
            )
        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to review request {request_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi xử lý yêu cầu.")

    async def revoke_permission(
        self, patient_id: UUID, doctor_id: UUID
    ) -> ConsentRevokeResponse:
        """Patient thu hồi quyền truy cập của bác sĩ ngay lập tức."""
        try:
            query = text("""
                UPDATE consent_permissions
                SET status = 'revoked', revoked_at = now()
                WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
                RETURNING doctor_id, revoked_at
            """)
            result = await self.db.execute(query, {
                "patient_id": str(patient_id),
                "doctor_id": str(doctor_id),
            })
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy quyền truy cập active của bác sĩ này.")

            await self.db.commit()
            logger.info(f"Permission revoked: doctor {doctor_id} by patient {patient_id}")

            return ConsentRevokeResponse(
                doctor_id=row.doctor_id,
                revoked_at=row.revoked_at,
            )
        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to revoke permission for doctor {doctor_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi thu hồi quyền truy cập.")

    async def get_consent_history(self, patient_id: UUID) -> list[ConsentHistoryItem]:
        """Danh sách bác sĩ đang có quyền truy cập (status='active')."""
        try:
            query = text("""
                SELECT cp.scope, cp.doctor_id, p.full_name AS doctor_name,
                       cp.granted_at
                FROM consent_permissions cp
                JOIN profiles p ON cp.doctor_id = p.id
                WHERE cp.patient_id = :patient_id AND cp.status = 'active'
                ORDER BY cp.granted_at DESC
            """)
            result = await self.db.execute(query, {"patient_id": str(patient_id)})
            rows = result.fetchall()

            logger.info(f"Listed consent history for patient: {patient_id}")
            return [
                ConsentHistoryItem(
                    scope=row.scope,
                    doctor_id=row.doctor_id,
                    doctor_name=row.doctor_name,
                    granted_at=row.granted_at,
                    timeout_at=None,  # TODO: đọc từ row.timeout_at sau khi thêm cột (xem TODO đầu file)
                )
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Failed to get consent history for {patient_id}: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy lịch sử đồng ý.")
