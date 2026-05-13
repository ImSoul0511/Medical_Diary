"""
Consent Helper — Shared Utility

Hàm chia sẻ dùng để kiểm tra bác sĩ có quyền truy cập scope cụ thể
của bệnh nhân hay không. Đọc trực tiếp từ bảng `consent_permissions`.

Được sử dụng bởi:
- Phase 4A: Doctors Cross-user (xem hồ sơ bệnh nhân)
- Phase 4B: Medical Data Cross-user (xem dữ liệu y tế của bệnh nhân)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def check_consent(
    db: AsyncSession, doctor_id: str, patient_id: str, required_scope: str
) -> bool:
    """
    Kiểm tra bác sĩ có quyền truy cập scope cụ thể của bệnh nhân không.

    Args:
        db: AsyncSession — Database session hiện tại.
        doctor_id: UUID của bác sĩ cần kiểm tra.
        patient_id: UUID của bệnh nhân sở hữu dữ liệu.
        required_scope: Tên scope cần kiểm tra (VD: "heart_rate", "diaries", "medical_records").

    Returns:
        True nếu bác sĩ có bản ghi active trong consent_permissions
        với scope chứa required_scope. False nếu không.
    """
    query = text("""
        SELECT 1 FROM consent_permissions
        WHERE doctor_id = :doctor_id AND patient_id = :patient_id
          AND :scope = ANY(scope) AND revoked_at IS NULL
    """)
    result = await db.execute(query, {
        "doctor_id": doctor_id, "patient_id": patient_id, "scope": required_scope
    })
    return result.fetchone() is not None
