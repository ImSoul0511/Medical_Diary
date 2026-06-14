import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class Vaccine(Base):
    """Bảng vaccines — Lịch sử tiêm chủng của người dùng."""
    __tablename__ = "vaccines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("profiles.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    vaccine_name = Column(String(200), nullable=False, comment="Tên vaccine")
    disease_targeted = Column(String(200), nullable=True, comment="Bệnh phòng ngừa")
    dose_number = Column(String(50), nullable=True, comment="Mũi số mấy")
    vaccination_date = Column(Date, nullable=False, comment="Ngày tiêm")
    administered_by = Column(String(200), nullable=True, comment="Nơi tiêm / Người tiêm")
    notes = Column(Text, nullable=True, comment="Ghi chú thêm")
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)
