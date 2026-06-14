import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class Allergy(Base):
    """Bảng allergies — Dữ liệu dị ứng chi tiết của người dùng."""
    __tablename__ = "allergies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("profiles.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    allergen = Column(String(200), nullable=False, comment="Tên chất gây dị ứng/thuốc/thức ăn")
    severity = Column(String(50), nullable=True, comment="Mức độ: mild, moderate, severe")
    reaction = Column(Text, nullable=True, comment="Biểu hiện")
    notes = Column(Text, nullable=True, comment="Ghi chú thêm")
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)
