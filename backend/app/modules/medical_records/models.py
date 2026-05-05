"""
SQLAlchemy Models — Module: Medical Records

Bảng:
- medical_records: Hồ sơ bệnh án chính thức do bác sĩ tạo
"""

from sqlalchemy import Column, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class MedicalRecord(Base):
    """Bảng medical_records — Hồ sơ bệnh án chính thức do bác sĩ tạo."""

    __tablename__ = "medical_records"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    doctor_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    diagnosis = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    attachments = Column(JSONB, nullable=True, comment='Mảng URLs: ["url1", "url2"]')
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")
