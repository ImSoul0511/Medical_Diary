"""
SQLAlchemy Models — Module: Emergency

Bảng:
- emergency_tokens: Quản lý mã QR truy cập khẩn cấp
- emergency_access_logs: Ghi nhận lịch sử quét QR token
"""

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmergencyToken(Base):
    """Bảng emergency_tokens — Quản lý mã QR truy cập khẩn cấp."""

    __tablename__ = "emergency_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(
        DateTime(timezone=True), nullable=True, comment="NULL = vĩnh viễn, không hết hạn"
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(
        DateTime(timezone=True), nullable=True, comment="Soft Delete — vô hiệu hóa token"
    )

    __table_args__ = (
        Index("ix_emergency_tokens_token", "token"),
        Index(
            "ix_emergency_tokens_user_active",
            "user_id",
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )


class EmergencyAccessLog(Base):
    """Bảng emergency_access_logs — Ghi nhận lịch sử quét QR token."""

    __tablename__ = "emergency_access_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    token_id = Column(
        UUID(as_uuid=True), ForeignKey("emergency_tokens.id"), nullable=False
    )
    accessed_at = Column(
        DateTime(timezone=True), nullable=False, server_default=text("now()"),
        comment="Thời điểm quét QR",
    )

    __table_args__ = (
        Index("ix_emergency_access_logs_token_time", "token_id", "accessed_at"),
    )
