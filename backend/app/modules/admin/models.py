"""
SQLAlchemy Models — Module: Admin

Bảng:
- data_access_logs: Audit log — ghi lại mọi thao tác truy xuất/thay đổi dữ liệu y tế
  (Tạo bởi PostgreSQL Triggers, KHÔNG phải bởi API Backend)
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class DataAccessLog(Base):
    """
    Bảng data_access_logs — Audit Logs.
    Bảng này chỉ được INSERT bởi DB Trigger, KHÔNG bởi application code.
    """

    __tablename__ = "data_access_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    actor_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    actor_name = Column(String(100), nullable=True)
    action = Column(
        String(20),
        CheckConstraint(
            "action IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')",
            name="ck_dal_action",
        ),
        nullable=False,
    )
    table_name = Column(String(50), nullable=False)
    target_user_id = Column(
        UUID(as_uuid=True), nullable=True, comment="Chủ sở hữu dữ liệu"
    )
    old_data = Column(JSONB, nullable=True)
    new_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        Index("ix_data_access_logs_target_time", "target_user_id", "created_at"),
    )
