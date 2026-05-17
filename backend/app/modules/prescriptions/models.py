"""
SQLAlchemy Models — Module: Prescriptions

Bảng:
- prescriptions: Đơn thuốc (chứa nhiều loại thuốc)
- prescription_items: Chi tiết từng loại thuốc trong một đơn
- prescription_logs: Lịch sử uống thuốc (tự động tạo bởi DB Trigger)
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Prescription(Base):
    """Bảng prescriptions — Đơn thuốc (Group)."""

    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    doctor_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    notes = Column(Text, nullable=True, comment="Ghi chú chung của đơn thuốc")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")

    # Relationships
    items = relationship("PrescriptionItem", back_populates="prescription")


class PrescriptionItem(Base):
    """Bảng prescription_items — Chi tiết từng loại thuốc trong một đơn."""

    __tablename__ = "prescription_items"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    prescription_id = Column(
        UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=False
    )
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(500), nullable=False)
    duration_days = Column(
        Integer,
        CheckConstraint("duration_days > 0", name="ck_pi_duration_days"),
        nullable=False,
    )
    scheduled_times = Column(
        ARRAY(Time),
        nullable=False,
        comment="Mảng các khung giờ uống thuốc. VD: ['08:00', '13:00', '20:00']",
    )
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('active', 'cancelled')",
            name="ck_pi_status",
        ),
        nullable=False,
        server_default=text("'active'"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")

    # Relationships
    prescription = relationship("Prescription", back_populates="items")
    logs = relationship("PrescriptionLog", back_populates="prescription_item")


class PrescriptionLog(Base):
    """
    Bảng prescription_logs — Lịch sử uống thuốc.
    Tự động tạo bởi DB Trigger khi INSERT vào prescription_items:
    số bản ghi = duration_days × len(scheduled_times).
    """

    __tablename__ = "prescription_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    prescription_item_id = Column(
        UUID(as_uuid=True), ForeignKey("prescription_items.id"), nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    scheduled_date = Column(Date, nullable=False, comment="Ngày dự kiến uống thuốc")
    scheduled_time = Column(Time, nullable=False, comment="Giờ dự kiến uống thuốc")
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('untaken', 'taken', 'skipped')",
            name="ck_pl_status",
        ),
        nullable=False,
        server_default=text("'untaken'"),
    )
    taken_at = Column(
        DateTime(timezone=True), nullable=True, comment="Chỉ có giá trị khi status = 'taken'"
    )

    # Relationships
    prescription_item = relationship("PrescriptionItem", back_populates="logs")

    __table_args__ = (
        Index(
            "ix_prescription_logs_item_schedule",
            "prescription_item_id",
            "scheduled_date",
            "scheduled_time",
        ),
    )
