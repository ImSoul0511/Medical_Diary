import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.diaries.models import Diary
from app.modules.diaries.schemas import DiaryCreateRequest, DiaryResponse, SymptomEntry

logger = logging.getLogger("medical_diary")


def _to_response(diary: Diary) -> DiaryResponse:
    """Chuyển ORM object → Pydantic response. Dùng chung cho create và list."""
    symptoms = None
    if diary.symptoms:
        symptoms = [SymptomEntry(**s) for s in diary.symptoms]
    return DiaryResponse(
        id=diary.id,
        user_id=diary.user_id,
        content=diary.content,
        symptoms=symptoms,
        created_at=diary.created_at,
        updated_at=diary.updated_at,
    )


async def create(
    db: AsyncSession,
    user_id: UUID,
    data: DiaryCreateRequest,
) -> DiaryResponse:
    """Tạo nhật ký mới. symptoms lưu dưới dạng JSONB list[{name, severity}]."""
    diary = Diary(
        user_id=user_id,
        content=data.content,
        symptoms=[s.model_dump() for s in data.symptoms] if data.symptoms else None,
    )
    db.add(diary)
    await db.flush()
    await db.refresh(diary)  # load server-default id, created_at, updated_at

    logger.info(f"Diary created for user: {user_id}")
    return _to_response(diary)


async def list_own(
    db: AsyncSession,
    user_id: UUID,
) -> list[DiaryResponse]:
    """Lấy danh sách nhật ký của chính user, sắp xếp mới nhất trước. Lọc soft-deleted."""
    stmt = (
        select(Diary)
        .where(Diary.user_id == user_id, Diary.deleted_at.is_(None))
        .order_by(Diary.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    logger.info(f"Listed {len(rows)} diaries for user: {user_id}")
    return [_to_response(row) for row in rows]


async def soft_delete(
    db: AsyncSession,
    user_id: UUID,
    diary_id: UUID,
) -> None:
    """Soft-delete nhật ký. Chỉ owner mới xóa được — enforce bằng WHERE user_id = current_user."""
    stmt = select(Diary).where(
        Diary.id == diary_id,
        Diary.user_id == user_id,  # ownership check
        Diary.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    diary = result.scalar_one_or_none()

    if diary is None:
        raise HTTPException(status_code=404, detail="Nhật ký không tồn tại.")

    diary.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info(f"Diary {diary_id} soft-deleted by user: {user_id}")
