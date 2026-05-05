"""
SQLAlchemy Models — Module: Diaries

Bảng:
- diaries: Nhật ký sức khỏe cá nhân (Private View — Diary)
"""

from sqlalchemy import Column, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class Diary(Base):
    """Bảng diaries — Nhật ký sức khỏe cá nhân do bệnh nhân tự ghi."""

    __tablename__ = "diaries"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    content = Column(Text, nullable=True, comment="Ghi chép tự do bằng chữ")
    symptoms = Column(
        JSONB,
        nullable=True,
        comment='VD: [{"name": "Đau đầu", "severity": 7}, {"name": "Chóng mặt", "severity": 4}]',
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")
