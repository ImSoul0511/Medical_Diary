"""
SQLAlchemy Models — Module: Consent & Permissions

Bảng:
- consent_requests: Bác sĩ xin quyền truy cập dữ liệu bệnh nhân
- consent_permissions: Quyền truy cập thực tế đã được bệnh nhân phê duyệt
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.core.database import Base


class ConsentRequest(Base):
    """Bảng consent_requests — Bác sĩ xin quyền truy cập."""

    __tablename__ = "consent_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    doctor_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    requested_scope = Column(
        ARRAY(Text),
        nullable=False,
        comment="Gồm: blood_type, allergies, emergency_contact, medical_records, prescriptions, diaries, heart_rate, step_count, respiratory_rate",
    )
    reason = Column(Text, nullable=False)
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_consent_requests_status",
        ),
        nullable=False,
        server_default=text("'pending'"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    responded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_consent_requests_patient_status", "patient_id", "status"),
    )


class ConsentPermission(Base):
    """Bảng consent_permissions — Quyền truy cập thực tế đã được phê duyệt."""

    __tablename__ = "consent_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    doctor_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    scope = Column(ARRAY(Text), nullable=False, comment="Tập con của requested_scope")
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('active', 'revoked')",
            name="ck_consent_permissions_status",
        ),
        nullable=False,
        server_default=text("'active'"),
    )
    granted_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        # Partial Unique: chỉ 1 bản ghi active cho mỗi cặp doctor-patient
        Index(
            "uq_consent_permissions_active",
            "doctor_id",
            "patient_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )
