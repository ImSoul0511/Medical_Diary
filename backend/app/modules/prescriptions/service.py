import logging
import os
import smtplib
from datetime import datetime, time as time_type, timezone
from email.mime.text import MIMEText
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

from app.modules.notifications.models import Notification
from app.modules.prescriptions.models import Prescription, PrescriptionItem, PrescriptionLog
from app.modules.prescriptions.schemas import (
    PrescriptionCreateRequest,
    PrescriptionItemCreateRequest,
    PrescriptionItemResponse,
    PrescriptionLogResponse,
    PrescriptionLogUpdateRequest,
    PrescriptionResponse,
)
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")


class PrescriptionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_own_prescriptions(
        self,
        user_id: UUID,
    ) -> list[PrescriptionResponse]:
        """
        Bệnh nhân xem tất cả đơn thuốc của mình.

        Input:  user_id — ID bệnh nhân (lấy từ JWT)
        Output: list[PrescriptionResponse] — mỗi đơn kèm danh sách thuốc bên trong

        Luồng:
        1. Query tất cả Prescription có patient_id = user_id, chưa bị xóa
        2. Với mỗi đơn, query thêm PrescriptionItem để lấy chi tiết từng loại thuốc
        3. scheduled_times lưu dạng PostgreSQL Time array → convert sang list[str] trước khi trả về
        """
        rx_stmt = (
            select(Prescription)
            .where(
                Prescription.patient_id == user_id,
                Prescription.deleted_at.is_(None),
            )
            .order_by(Prescription.created_at.desc())
        )
        rx_result = await self.db.execute(rx_stmt)
        prescriptions = rx_result.scalars().all()

        responses = []
        for rx in prescriptions:
            # Query items riêng vì không dùng lazy loading (async session không hỗ trợ)
            items_stmt = select(PrescriptionItem).where(
                PrescriptionItem.prescription_id == rx.id,
                PrescriptionItem.deleted_at.is_(None),
            )
            items_result = await self.db.execute(items_stmt)
            items = items_result.scalars().all()

            responses.append(PrescriptionResponse(
                id=rx.id,
                patient_id=rx.patient_id,
                
                doctor_id=rx.doctor_id,
                notes=rx.notes,
                items=[
                    PrescriptionItemResponse(
                        id=item.id,
                        medication_name=item.medication_name,
                        dosage=item.dosage,
                        duration_days=item.duration_days,
                        scheduled_times=[str(t) for t in item.scheduled_times] if item.scheduled_times else None,
                        start_date=item.start_date,
                        status=item.status,
                    )
                    for item in items
                ],
                created_at=rx.created_at,
            ))

        logger.info(f"Listed {len(responses)} prescriptions for user: {user_id}")
        return responses

    async def list_logs(
        self,
        user_id: UUID,
        prescription_id: UUID,
    ) -> list[PrescriptionLogResponse]:
        """
        Bệnh nhân xem lịch uống thuốc của 1 đơn cụ thể.

        Input:  user_id         — ID bệnh nhân (ownership check)
                prescription_id — ID đơn thuốc cần xem logs
        Output: list[PrescriptionLogResponse] — từng cữ uống, sắp xếp theo ngày và giờ

        Luồng:
        1. Verify đơn thuốc tồn tại và thuộc về user → 404 nếu không tìm thấy
        2. JOIN prescription_logs ← prescription_items để lọc logs theo prescription_id
           (logs không có prescription_id trực tiếp, chỉ có prescription_item_id)
        3. Sắp xếp theo scheduled_date ASC, scheduled_time ASC
        4. scheduled_time lưu dạng PostgreSQL Time → convert sang str khi trả về
        """
        # Bước 1 — verify ownership
        rx_stmt = select(Prescription).where(
            Prescription.id == prescription_id,
            Prescription.patient_id == user_id,
            Prescription.deleted_at.is_(None),
        )
        rx_result = await self.db.execute(rx_stmt)
        if rx_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Đơn thuốc không tồn tại.")

        # Bước 2 — lấy logs qua JOIN prescription_items → prescription_logs
        stmt = (
            select(PrescriptionLog)
            .join(PrescriptionItem, PrescriptionItem.id == PrescriptionLog.prescription_item_id)
            .where(
                PrescriptionItem.prescription_id == prescription_id,
                PrescriptionItem.deleted_at.is_(None),
            )
            .order_by(PrescriptionLog.scheduled_date, PrescriptionLog.scheduled_time)
        )
        result = await self.db.execute(stmt)
        logs = result.scalars().all()

        logger.info(f"Listed {len(logs)} logs for prescription: {prescription_id}")
        return [
            PrescriptionLogResponse(
                id=log.id,
                prescription_item_id=log.prescription_item_id,
                scheduled_date=log.scheduled_date,
                scheduled_time=str(log.scheduled_time),
                status=log.status,
                taken_at=log.taken_at,
            )
            for log in logs
        ]

    async def update_log_status(
        self,
        user_id: UUID,
        log_id: UUID,
        data: PrescriptionLogUpdateRequest,
    ) -> PrescriptionLogResponse:
        """
        Bệnh nhân cập nhật trạng thái 1 cữ uống thuốc.

        Input:  user_id — ID bệnh nhân (ownership check qua PrescriptionLog.user_id)
                log_id  — ID của cữ uống cần cập nhật
                data    — PrescriptionLogUpdateRequest { status: "taken" | "skipped" | "untaken" }
        Output: PrescriptionLogResponse — log sau khi cập nhật

        Luồng:
        1. Tìm log theo log_id + user_id → 404 nếu không thuộc về user
        2. Cập nhật status
        3. Nếu status = "taken" → ghi taken_at = thời điểm hiện tại (UTC)
           Nếu status != "taken" → xóa taken_at (set None)
        4. flush() để ghi xuống DB trong transaction hiện tại
        """
        stmt = select(PrescriptionLog).where(
            PrescriptionLog.id == log_id,
            PrescriptionLog.user_id == user_id,  # ownership check
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()

        if log is None:
            raise HTTPException(status_code=404, detail="Log uống thuốc không tồn tại.")

        log.status = data.status
        log.taken_at = datetime.now(timezone.utc) if data.status == "taken" else None
        await self.db.flush()

        logger.info(f"Log {log_id} updated to '{data.status}' by user: {user_id}")
        return PrescriptionLogResponse(
            id=log.id,
            prescription_item_id=log.prescription_item_id,
            scheduled_date=log.scheduled_date,
            scheduled_time=str(log.scheduled_time),
            status=log.status,
            taken_at=log.taken_at,
        )

    async def create_prescription(
        self,
        doctor_id: UUID,
        data: PrescriptionCreateRequest,
    ) -> PrescriptionResponse:
        """
        Bác sĩ tạo đơn thuốc mới (chưa có thuốc). Không cần consent.

        Input:  doctor_id — ID bác sĩ (lấy từ JWT)
                data      — PrescriptionCreateRequest { patient_id, notes? }
        Output: PrescriptionResponse — đơn vừa tạo với items = []

        Luồng:
        1. Tạo Prescription với patient_id + doctor_id + notes
        2. flush() để DB assign id và created_at (server_default)
        3. refresh() để load các giá trị server-generated về object
        4. Trả về response với items rỗng — bác sĩ thêm thuốc qua add_item() sau
        """
        rx = Prescription(
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            notes=data.notes,
        )
        self.db.add(rx)
        await self.db.flush()
        await self.db.refresh(rx)

        logger.info(f"Prescription created by doctor {doctor_id} for patient {data.patient_id}")
        return PrescriptionResponse(
            id=rx.id,
            patient_id=rx.patient_id,
            doctor_id=rx.doctor_id,
            notes=rx.notes,
            items=[],
            created_at=rx.created_at,
        )

    async def add_item(
        self,
        doctor_id: UUID,
        prescription_id: UUID,
        data: PrescriptionItemCreateRequest,
    ) -> PrescriptionItemResponse:
        """
        Bác sĩ thêm 1 loại thuốc vào đơn. Hỗ trợ 2 chế độ:
        1. Tự động: cung cấp duration_days và scheduled_times. Trình kích hoạt (DB trigger) tự tạo prescription_logs.
        2. Thủ công (custom_logs): bác sĩ cung cấp danh sách cữ uống cụ thể. Backend tự tạo prescription_logs thủ công.
        """
        # Bước 1 — verify ownership và lấy patient_id
        rx_stmt = select(Prescription).where(
            Prescription.id == prescription_id,
            Prescription.doctor_id == doctor_id,
            Prescription.deleted_at.is_(None),
        )
        rx_result = await self.db.execute(rx_stmt)
        rx = rx_result.scalar_one_or_none()
        if rx is None:
            raise HTTPException(status_code=404, detail="Đơn thuốc không tồn tại.")

        patient_id = rx.patient_id

        # Kiểm tra tính hợp lệ của tham số
        is_auto = data.duration_days is not None and data.scheduled_times is not None
        is_manual = data.custom_logs is not None and len(data.custom_logs) > 0

        if not is_auto and not is_manual:
            raise HTTPException(
                status_code=400,
                detail="Phải cung cấp đầy đủ (duration_days & scheduled_times) cho chế độ tự động hoặc danh sách (custom_logs) cho chế độ thủ công."
            )

        if is_auto:
            # Chế độ tự động
            parsed_times = []
            for t_str in data.scheduled_times:
                parts = t_str.strip().split(":")
                if len(parts) < 2:
                    raise HTTPException(status_code=400, detail=f"Định dạng giờ '{t_str}' không hợp lệ. Phải là HH:MM.")
                parsed_times.append(time_type(int(parts[0]), int(parts[1])))

            item = PrescriptionItem(
                prescription_id=prescription_id,
                medication_name=data.medication_name,
                dosage=data.dosage,
                duration_days=data.duration_days,
                scheduled_times=parsed_times,
                start_date=data.start_date,
            )
            self.db.add(item)
            await self.db.flush()
            # Kích hoạt DB trigger tự sinh logs

        else:
            # Chế độ thủ công
            item = PrescriptionItem(
                prescription_id=prescription_id,
                medication_name=data.medication_name,
                dosage=data.dosage,
                duration_days=None,
                scheduled_times=None,
                start_date=None,
            )
            self.db.add(item)
            await self.db.flush()  # Sinh item.id trước

            # Tạo logs thủ công từ custom_logs
            for custom_log in data.custom_logs:
                parts = custom_log.scheduled_time.strip().split(":")
                if len(parts) == 2:
                    log_time = time_type(int(parts[0]), int(parts[1]))
                elif len(parts) == 3:
                    log_time = time_type(int(parts[0]), int(parts[1]), int(parts[2]))
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Định dạng giờ '{custom_log.scheduled_time}' không hợp lệ. Phải là HH:MM hoặc HH:MM:SS."
                    )

                log_obj = PrescriptionLog(
                    prescription_item_id=item.id,
                    user_id=patient_id,
                    scheduled_date=custom_log.scheduled_date,
                    scheduled_time=log_time,
                    status='untaken'
                )
                self.db.add(log_obj)
            
            await self.db.flush()

        await self.db.refresh(item)

        logger.info(f"Item {item.id} added to prescription {prescription_id} by doctor {doctor_id} (Mode: {'Auto' if is_auto else 'Manual'})")
        return PrescriptionItemResponse(
            id=item.id,
            medication_name=item.medication_name,
            dosage=item.dosage,
            duration_days=item.duration_days,
            scheduled_times=[str(t) for t in item.scheduled_times] if item.scheduled_times else None,
            start_date=item.start_date,
            status=item.status,
        )

    async def soft_delete_prescription(
        self,
        doctor_id: UUID,
        prescription_id: UUID,
    ) -> None:
        """
        Bác sĩ xóa mềm đơn thuốc của mình.

        Input:  doctor_id       — ID bác sĩ (ownership check)
                prescription_id — ID đơn thuốc cần xóa
        Output: None (204 No Content)

        Luồng:
        1. Tìm đơn thuốc theo id + doctor_id + deleted_at IS NULL → 404 nếu không tìm thấy
        2. Set deleted_at = thời điểm hiện tại (UTC) — không hard-delete
        3. flush() để ghi trong transaction
        Các query SELECT sau đó sẽ lọc WHERE deleted_at IS NULL → đơn bị ẩn đi
        """
        stmt = select(Prescription).where(
            Prescription.id == prescription_id,
            Prescription.doctor_id == doctor_id,
            Prescription.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        rx = result.scalar_one_or_none()

        if rx is None:
            raise HTTPException(status_code=404, detail="Đơn thuốc không tồn tại.")

        rx.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
        logger.info(f"Prescription {prescription_id} soft-deleted by doctor {doctor_id}")

    async def send_scheduled_reminders(self) -> MessageResponse:
        """
        [Internal API] Quét các cữ uống thuốc đến giờ/quá giờ mà chưa thông báo/gửi mail,
        tiến hành ghi nhận thông báo vào DB và gửi email nhắc nhở cho bệnh nhân.
        """
        # 1. Tìm các cữ uống thuốc đã đến/quá giờ uống thuốc trong vòng 2 giờ qua và có trạng thái là 'untaken'
        # đồng thời chưa có thông báo tương ứng
        query = text("""
            SELECT pl.id as log_id, pl.user_id, pl.scheduled_date, pl.scheduled_time, pi.medication_name, pi.dosage
            FROM prescription_logs pl
            JOIN prescription_items pi ON pi.id = pl.prescription_item_id
            WHERE pl.status = 'untaken'
              AND pl.scheduled_date = CURRENT_DATE
              AND pl.scheduled_time <= LOCALTIME
              AND pl.scheduled_time >= LOCALTIME - INTERVAL '2 hours'
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.type = 'prescription_reminder'
                    AND n.reference_id = pl.id
              )
        """)
        result = await self.db.execute(query)
        rows = result.all()

        if not rows:
            logger.info("No due prescription reminders to send.")
            return MessageResponse(message="Không có lịch nhắc nhở nào cần gửi.")

        sent_count = 0
        for row in rows:
            # 2. Truy vấn email của người dùng từ auth.users của Supabase
            email_query = text("SELECT email FROM auth.users WHERE id = :user_id")
            email_res = await self.db.execute(email_query, {"user_id": row.user_id})
            email = email_res.scalar()

            if not email:
                logger.warning(f"Email not found for user {row.user_id}, skipping reminder.")
                continue

            time_str = row.scheduled_time.strftime('%H:%M') if row.scheduled_time else ""
            date_str = row.scheduled_date.strftime('%d/%m/%Y') if row.scheduled_date else ""

            subject = "[Medical Diary] Nhắc nhở uống thuốc định kỳ"
            body = (
                f"Xin chào,\n\n"
                f"Đã đến giờ uống thuốc theo đơn của bạn:\n"
                f"- Tên thuốc: {row.medication_name}\n"
                f"- Liều lượng: {row.dosage}\n"
                f"- Giờ uống: {time_str} ngày {date_str}\n\n"
                f"Vui lòng truy cập ứng dụng Medical Diary để cập nhật trạng thái uống thuốc của bạn.\n\n"
                f"Trân trọng,\n"
                f"Đội ngũ Medical Diary."
            )

            # 3. Ghi nhận thông báo vào DB
            notif = Notification(
                user_id=row.user_id,
                type='prescription_reminder',
                title='Nhắc nhở uống thuốc (Email đã gửi)',
                message=f"Đã đến giờ uống thuốc: {row.medication_name} ({row.dosage}) - Khung giờ: {time_str} ngày {date_str}.",
                reference_id=row.log_id,
                is_read=False
            )
            self.db.add(notif)

            # 4. Gửi email thông qua helper dùng chung
            import asyncio
            from app.shared.email import send_email_sync
            await asyncio.to_thread(send_email_sync, email, subject, body)
            logger.info(f"Email reminder processed for {email} (log: {row.log_id})")

            sent_count += 1

        await self.db.flush()
        logger.info(f"Processed {sent_count} medication reminders.")
        return MessageResponse(message=f"Đã xử lý {sent_count} cữ nhắc nhở uống thuốc.")
