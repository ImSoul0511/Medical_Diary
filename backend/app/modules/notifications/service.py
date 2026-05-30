import logging
from uuid import UUID
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationResponse
from app.modules.prescriptions.models import PrescriptionLog, PrescriptionItem
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")


class NotificationsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _to_response(self, notif: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=notif.id,
            type=notif.type,
            title=notif.title,
            message=notif.message,
            reference_id=notif.reference_id,
            is_read=notif.is_read,
            created_at=notif.created_at,
        )

    async def list_notifications(self, user_id: UUID) -> list[NotificationResponse]:
        """Lấy danh sách thông báo của user, sắp xếp mới nhất trước.
        Trước khi lấy, kiểm tra xem có cữ uống thuốc nào đã đến giờ (hoặc quá giờ)
        mà chưa có thông báo tương ứng thì tự động sinh ra (on-demand reminder).
        """
        # 1. Lấy danh sách ID các cữ uống thuốc đã có thông báo nhắc nhở
        existing_stmt = select(Notification.reference_id).where(
            Notification.user_id == user_id,
            Notification.type == 'prescription_reminder',
            Notification.reference_id.isnot(None)
        )
        existing_res = await self.db.execute(existing_stmt)
        existing_ref_ids = {row for row in existing_res.scalars().all()}

        # 2. Tìm các cữ uống thuốc đã đến giờ (hoặc quá giờ) trong vòng 7 ngày gần đây mà trạng thái là 'untaken'
        seven_days_ago = date.today() - timedelta(days=7)
        untaken_stmt = select(PrescriptionLog, PrescriptionItem).join(
            PrescriptionItem, PrescriptionItem.id == PrescriptionLog.prescription_item_id
        ).where(
            PrescriptionLog.user_id == user_id,
            PrescriptionLog.status == 'untaken',
            PrescriptionLog.scheduled_date >= seven_days_ago,
            (
                PrescriptionLog.scheduled_date < func.current_date()
            ) | (
                (PrescriptionLog.scheduled_date == func.current_date()) &
                (PrescriptionLog.scheduled_time <= func.current_time())
            )
        )
        untaken_res = await self.db.execute(untaken_stmt)
        untaken_rows = untaken_res.all()

        # 3. Tạo thông báo nhắc nhở cho các cữ chưa có
        has_new = False
        for log, item in untaken_rows:
            if log.id not in existing_ref_ids:
                time_str = log.scheduled_time.strftime('%H:%M') if log.scheduled_time else ""
                date_str = log.scheduled_date.strftime('%d/%m/%Y') if log.scheduled_date else ""
                
                notif = Notification(
                    user_id=user_id,
                    type='prescription_reminder',
                    title='Nhắc nhở uống thuốc',
                    message=f"Đã đến giờ uống thuốc: {item.medication_name} ({item.dosage}) - Khung giờ: {time_str} ngày {date_str}.",
                    reference_id=log.id,
                    is_read=False
                )
                self.db.add(notif)
                has_new = True

        if has_new:
            await self.db.flush()

        # 4. Truy vấn toàn bộ thông báo để trả về
        stmt = select(Notification).where(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc())
        
        result = await self.db.execute(stmt)
        notifications = result.scalars().all()
        
        logger.info(f"Retrieved {len(notifications)} notifications for user {user_id}")
        return [self._to_response(n) for n in notifications]

    async def mark_as_read(self, user_id: UUID, notification_id: UUID) -> MessageResponse:
        """Đánh dấu thông báo đã đọc. Raise 404 nếu không tìm thấy hoặc không thuộc về user."""
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        
        if not notification:
            logger.warning(f"Notification {notification_id} not found or not owned by user {user_id}")
            raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
        
        notification.is_read = True
        await self.db.flush()
        
        logger.info(f"Marked notification {notification_id} as read for user {user_id}")
        return MessageResponse(message="Đã đánh dấu thông báo đã đọc thành công.")
