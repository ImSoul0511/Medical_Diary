"""
SQLAlchemy Models — Module: Users & Doctors

Bảng:
- profiles: Thông tin người dùng cơ bản (mở rộng từ auth.users của Supabase)
- doctors: Thông tin bổ sung cho role doctor
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Profile(Base):
    """Bảng profiles — Lưu trữ thông tin người dùng cơ bản."""

    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, comment="References auth.users")
    full_name = Column(String(100), nullable=False)
    role = Column(
        String(20),
        CheckConstraint("role IN ('user', 'doctor', 'admin')", name="ck_profiles_role"),
        nullable=False,
        server_default=text("'user'"),
    )
    phone_encrypted = Column(Text, nullable=True, comment="Mã hóa pgcrypto — SĐT")
    cccd_encrypted = Column(Text, nullable=True, comment="Mã hóa pgcrypto — CCCD")
    gender = Column(
        String(10),
        CheckConstraint("gender IN ('NAM', 'Nữ')", name="ck_profiles_gender"),
        nullable=False,
        server_default=text("'NAM'") # Default value required for non-nullable column with existing rows
    )
    date_of_birth = Column(Date, nullable=True)
    blood_type = Column(String(5), nullable=True, comment="VD: O+, AB-")
    allergies = Column(Text, nullable=True, comment="VD: Penicillin, Aspirin")
    emergency_contact = Column(String(20), nullable=True, comment="SĐT người thân")
    privacy_settings = Column(
        JSONB,
        nullable=False,
        server_default=text(
            """'{"show_blood_type": true, "show_allergies": true, "show_emergency_contact": true}'::jsonb"""
        ),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")

    # Relationships
    doctor_profile = relationship("Doctor", back_populates="profile", uselist=False)


class Doctor(Base):
    """Bảng doctors — Thông tin bổ sung cho role doctor."""

    __tablename__ = "doctors"

    id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    specialty = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    hospital = Column(String(200), nullable=False)
    certificate_url = Column(Text, nullable=False)
    verification_status = Column(
        String(20),
        CheckConstraint(
            "verification_status IN ('pending_verification', 'approved', 'rejected')",
            name="ck_doctors_verification_status",
        ),
        nullable=False,
        server_default=text("'pending_verification'"),
    )
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id"),
        nullable=True,
        comment="Admin who verified",
    )

    # Relationships
    profile = relationship("Profile", back_populates="doctor_profile")
