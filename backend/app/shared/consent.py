from collections.abc import Iterable
from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.consent.schemas import ConsentScope, VALID_CONSENT_SCOPES


async def check_consent(
    db: AsyncSession,
    doctor_id: str,
    patient_id: str,
    required_scope: ConsentScope,
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


async def get_consent_scopes(
    db: AsyncSession,
    doctor_id: str,
    patient_id: str,
    allowed_scopes: Iterable[ConsentScope] | None = None,
) -> set[ConsentScope]:
    """Return active consent scopes for a doctor-patient pair."""
    query = text(
        """
        SELECT scope
        FROM consent_permissions
        WHERE doctor_id = :doctor_id
          AND patient_id = :patient_id
          AND status = 'active'
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1
        """
    )

    result = await db.execute(
        query,
        {
            "doctor_id": doctor_id,
            "patient_id": patient_id,
        },
    )
    granted_scope = result.scalar_one_or_none()
    if not granted_scope:
        return set()

    scope_filter = set(allowed_scopes) if allowed_scopes is not None else VALID_CONSENT_SCOPES
    return cast(set[ConsentScope], set(granted_scope) & scope_filter)
