"""
SQLAlchemy Models — Module: Medical Records

Bảng:
- medical_records: Hồ sơ bệnh án chính thức do bác sĩ tạo
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, text
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


class PatientDocument(Base):
    """Bảng patient_documents — Tài liệu/file bệnh án tự tải lên bởi bệnh nhân."""

    __tablename__ = "patient_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)  # Đường dẫn lưu trên Supabase Storage
    file_size = Column(Integer, nullable=False)      # Kích thước file (bytes)
    mime_type = Column(String(100), nullable=True)   # Loại định dạng file (ví dụ: application/pdf)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

