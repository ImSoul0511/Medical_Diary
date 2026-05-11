"""
SQLAlchemy Async Engine & Session Factory.

Mô hình Hybrid:
- SQLAlchemy AsyncSession cho mọi thao tác CRUD trên PostgreSQL.
- Supabase Client chỉ dùng cho Auth, Storage, Realtime.

RLS được kích hoạt qua SET LOCAL trước mỗi query (xem middleware).
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ─── Engine ──────────────────────────────────────────────────────────────────
# DATABASE_URL trong .env phải dùng scheme: postgresql+asyncpg://...
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,   # Log SQL khi DEBUG=True
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,    # Kiểm tra connection còn sống trước khi dùng
)

# ─── Session Factory ─────────────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Giữ data trong memory sau commit (tránh lazy-load lỗi)
)


# ─── Base Class ──────────────────────────────────────────────────────────────
class Base(AsyncAttrs, DeclarativeBase):
    """
    Base class cho tất cả SQLAlchemy Models.
    Mọi model kế thừa từ đây sẽ được Alembic tự động detect.
    """
    pass


# ─── Dependency Injection ────────────────────────────────────────────────────
from fastapi import Request
from sqlalchemy import text

async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency: Cung cấp AsyncSession và tự động thiết lập RLS context.
    """
    async with async_session_factory() as session:
        try:
            # Lấy claims từ middleware (đã lưu trong request.state)
            jwt_claims = getattr(request.state, "jwt_claims", "{}")
            
            # Thiết lập RLS context cho transaction này
            await session.execute(
                text("SELECT set_config('request.jwt.claims', :claims, true), set_config('app.encryption_key', :enc_key, true)"),
                {"claims": jwt_claims, "enc_key": settings.ENCRYPTION_KEY}
            )
            
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
