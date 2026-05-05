"""
SQLAlchemy Models — Module: Notifications

Bảng:
- notifications: Thông báo cho User (access_request, prescription_new, etc.)
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Notification(Base):
    """Bảng notifications — Thông báo cho User."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    type = Column(
        String(50),
        CheckConstraint(
            "type IN ('access_request', 'prescription_new', 'prescription_reminder', 'emergency_token_expired')",
            name="ck_notifications_type",
        ),
        nullable=False,
    )
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    reference_id = Column(
        UUID(as_uuid=True), nullable=True, comment="Trỏ đến bản ghi liên quan tùy type"
    )
    is_read = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )
