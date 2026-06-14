import logging

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client

from app.modules.admin.schemas import (
    AuditLogItem,
    DoctorVerifyRequest,
    PendingDoctorResponse,
)
from app.shared.schemas import MessageResponse, PaginatedResponse

logger = logging.getLogger("medical_diary")


class AdminService:
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase

    async def list_pending_doctors(self) -> list[PendingDoctorResponse]:
        return await self.list_doctors("pending_verification")

    async def list_doctors(self, status: str | None = None) -> list[PendingDoctorResponse]:
        try:
            params = {}
            status_clause = ""
            if status:
                status_clause = "AND d.verification_status = :status"
                params["status"] = status

            query = text(f"""
                SELECT
                    p.id,
                    p.full_name,
                    d.email,
                    d.specialty,
                    d.hospital,
                    d.license_number,
                    d.certificate_url,
                    p.created_at as registered_at,
                    d.verification_status as status
                FROM doctors d
                JOIN profiles p ON d.id = p.id
                WHERE p.deleted_at IS NULL
                  {status_clause}
                ORDER BY p.created_at ASC
            """)
            result = await self.db.execute(query, params)
            rows = result.fetchall()

            doctors = [
                PendingDoctorResponse(
                    id=row.id,
                    full_name=row.full_name,
                    email=row.email if row.email else "unknown@example.com",
                    specialty=row.specialty,
                    hospital=row.hospital,
                    license_number=row.license_number,
                    certificate_url=row.certificate_url,
                    registered_at=row.registered_at,
                    status=row.status,
                )
                for row in rows
            ]

            logger.info("Listed doctors")
            return doctors
        except Exception as e:
            logger.error(f"Error listing doctors: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy danh sách bác sĩ")

    async def verify_doctor(
        self,
        doctor_id: str,
        admin_id: str,
        data: DoctorVerifyRequest,
    ) -> MessageResponse:
        try:
            check_query = text("""
                SELECT verification_status
                FROM doctors
                WHERE id = :doctor_id
            """)
            result = await self.db.execute(check_query, {"doctor_id": doctor_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")

            if data.action in ["approved", "rejected"]:
                if row.verification_status != "pending_verification":
                    raise HTTPException(
                        status_code=400,
                        detail="Bác sĩ này không ở trạng thái chờ duyệt",
                    )
            elif data.action == "pending_verification":
                if row.verification_status != "approved":
                    raise HTTPException(
                        status_code=400,
                        detail="Chỉ có thể rút quyền bác sĩ đã được duyệt",
                    )

            if data.action == "pending_verification":
                update_query = text("""
                    UPDATE doctors
                    SET verification_status = :status,
                        verification_notes = :notes,
                        verified_at = NULL,
                        verified_by = NULL
                    WHERE id = :doctor_id
                """)
            else:
                update_query = text("""
                    UPDATE doctors
                    SET verification_status = :status,
                        verification_notes = :notes,
                        verified_at = now(),
                        verified_by = :admin_id
                    WHERE id = :doctor_id
                """)

            await self.db.execute(update_query, {
                "status": data.action,
                "notes": data.notes,
                "admin_id": admin_id,
                "doctor_id": doctor_id,
            })

            role = "doctor" if data.action == "approved" else "user"
            role_update_query = text("""
                UPDATE profiles
                SET role = :role
                WHERE id = :doctor_id AND role != :role
            """)
            await self.db.execute(role_update_query, {"doctor_id": doctor_id, "role": role})

            from app.modules.notifications.models import Notification

            status_description = {
                "approved": "đã được phê duyệt",
                "rejected": "bị từ chối",
                "pending_verification": "đang chờ xác minh lại",
            }[data.action]
            message = f"Tài khoản bác sĩ của bạn {status_description}."
            if data.notes:
                message = f"{message} Ghi chú: {data.notes}"

            self.db.add(Notification(
                user_id=doctor_id,
                type="access_request",
                title="Cập nhật trạng thái duyệt tài khoản",
                message=message,
                reference_id=doctor_id,
                is_read=False,
            ))

            await self.db.flush()

            logger.info(
                f"Doctor {doctor_id} verification status updated to {data.action} by {admin_id}"
            )
            return MessageResponse(message=f"Đã cập nhật trạng thái bác sĩ thành {data.action}")

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error verifying doctor: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi cập nhật trạng thái bác sĩ")

    async def get_audit_logs(
        self,
        page: int,
        limit: int,
        action: str | None,
        user_id: str | None,
        date_from: str | None,
    ) -> PaginatedResponse[AuditLogItem]:
        try:
            offset = (page - 1) * limit

            conditions = []
            params = {"limit": limit, "offset": offset}

            if action:
                conditions.append("action = :action")
                params["action"] = action
            if user_id:
                conditions.append("target_user_id = :user_id")
                params["user_id"] = user_id
            if date_from:
                conditions.append("created_at >= :date_from")
                params["date_from"] = date_from

            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

            count_query = text(f"SELECT COUNT(*) FROM data_access_logs {where_clause}")
            count_result = await self.db.execute(count_query, params)
            total = count_result.scalar() or 0

            data_query = text(f"""
                SELECT id, actor_id, actor_name, action, table_name, target_user_id, old_data, new_data, created_at
                FROM data_access_logs
                {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """)
            data_result = await self.db.execute(data_query, params)
            rows = data_result.fetchall()

            items = [
                AuditLogItem(
                    id=row.id,
                    actor_id=row.actor_id,
                    actor_name=row.actor_name if row.actor_name else "Unknown",
                    action=row.action,
                    table_name=row.table_name,
                    target_user_id=row.target_user_id,
                    old_data=row.old_data,
                    new_data=row.new_data,
                    created_at=row.created_at,
                )
                for row in rows
            ]

            logger.info("Fetched audit logs")
            return PaginatedResponse(
                items=items,
                total=total,
                page=page,
                limit=limit,
            )
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy danh sách nhật ký kiểm toán")
