from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def check_consent(
    db: AsyncSession,
    doctor_id: str,
    patient_id: str,
    required_scope: str,
) -> bool:
    """Return True when a doctor has active permission for a patient scope."""
    query = text(
        """
        SELECT 1
        FROM consent_permissions
        WHERE doctor_id = :doctor_id
          AND patient_id = :patient_id
          AND status = 'active'
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
          AND :required_scope = ANY(scope)
        LIMIT 1
        """
    )

    result = await db.execute(
        query,
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "required_scope": required_scope,
        },
    )

    return result.scalar_one_or_none() is not None
