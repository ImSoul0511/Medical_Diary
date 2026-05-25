import logging
from fastapi import HTTPException
from supabase import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func

from app.modules.admin.schemas import (
    PendingDoctorResponse,
    DoctorVerifyRequest,
    AuditLogItem
)
from app.shared.schemas import MessageResponse, PaginatedResponse

logger = logging.getLogger("medical_diary")

class AdminService:
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase

    async def list_pending_doctors(self) -> list[PendingDoctorResponse]:
        try:
            query = text("""
                SELECT 
                    p.id, p.full_name, d.email, d.specialty, d.license_number, 
                    d.certificate_url, p.created_at as registered_at, d.verification_status as status
                FROM doctors d
                JOIN profiles p ON d.id = p.id
                WHERE d.verification_status = 'pending_verification'
                  AND p.deleted_at IS NULL
                ORDER BY p.created_at ASC
            """)
            result = await self.db.execute(query)
            rows = result.fetchall()

            doctors = []
            for row in rows:
                doctors.append(
                    PendingDoctorResponse(
                        id=row.id,
                        full_name=row.full_name,
                        email=row.email if row.email else "unknown@example.com",
                        specialty=row.specialty,
                        license_number=row.license_number,
                        certificate_url=row.certificate_url,
                        registered_at=row.registered_at,
                        status=row.status
                    )
                )

            logger.info("Listed pending doctors")
            return doctors
        except Exception as e:
            logger.error(f"Error listing pending doctors: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy danh sách bác sĩ chờ duyệt")

    async def verify_doctor(self, doctor_id: str, admin_id: str, data: DoctorVerifyRequest) -> MessageResponse:
        try:
            # Check if doctor exists and is pending
            check_query = text("""
                SELECT verification_status 
                FROM doctors 
                WHERE id = :doctor_id
            """)
            result = await self.db.execute(check_query, {"doctor_id": doctor_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
            
            if row.verification_status != 'pending_verification':
                raise HTTPException(status_code=400, detail="Bác sĩ này không ở trạng thái chờ duyệt")

            # Update doctor status
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
                "doctor_id": doctor_id
            })

            # If approved, update role in profiles
            if data.action == "approved":
                role_update_query = text("""
                    UPDATE profiles
                    SET role = 'doctor'
                    WHERE id = :doctor_id AND role != 'doctor'
                """)
                await self.db.execute(role_update_query, {"doctor_id": doctor_id})

            await self.db.flush()

            logger.info(f"Doctor {doctor_id} verification status updated to {data.action} by {admin_id}")
            return MessageResponse(message=f"Đã cập nhật trạng thái bác sĩ thành {data.action}")

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error verifying doctor: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi cập nhật trạng thái bác sĩ")

    async def get_audit_logs(
        self, page: int, limit: int, action: str | None, user_id: str | None, date_from: str | None
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

            items = []
            for row in rows:
                items.append(
                    AuditLogItem(
                        id=row.id,
                        actor_id=row.actor_id,
                        actor_name=row.actor_name if row.actor_name else "Unknown",
                        action=row.action,
                        table_name=row.table_name,
                        target_user_id=row.target_user_id,
                        old_data=row.old_data,
                        new_data=row.new_data,
                        created_at=row.created_at
                    )
                )

            logger.info("Fetched audit logs")
            return PaginatedResponse(
                items=items,
                total=total,
                page=page,
                limit=limit
            )
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi lấy danh sách nhật ký kiểm toán")
