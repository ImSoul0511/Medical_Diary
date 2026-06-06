"""
Pydantic Schemas — Module: Emergency

Schemas theo SCHEMAS.md mục 9.
Dùng cho các endpoint /emergency/token, /emergency/tokens, /emergency/access/{token}.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EmergencyTokenCreateRequest(BaseModel):
    """Body cho POST /emergency/token.
    ttl_minutes = None → tạo token vĩnh viễn (dùng để in ra mang theo).
    """

    ttl_minutes: Optional[int] = Field(None, ge=5)
    show_blood_type: bool = True
    show_allergies: bool = True
    show_emergency_contact: bool = True

    model_config = {
        "json_schema_extra": {
            "example": {
                "ttl_minutes": 60
            }
        }
    }


class EmergencyTokenResponse(BaseModel):
    """Response sau khi tạo token thành công."""

    emergency_token: str
    expires_at: Optional[datetime] = None  # None = vĩnh viễn


class EmergencyTokenItem(BaseModel):
    """Thông tin một token trong danh sách GET /emergency/tokens."""

    id: UUID
    token: str
    expires_at: Optional[datetime] = None
    is_expired: bool  # Computed bởi service (không lưu trong DB)
    created_at: datetime
    show_blood_type: bool
    show_allergies: bool
    show_emergency_contact: bool


class EmergencyTokenUpdateRequest(BaseModel):
    """Body cho PATCH /emergency/tokens/{id}.
    ttl_minutes = None → chuyển token sang vĩnh viễn.
    """

    ttl_minutes: Optional[int] = Field(None, ge=5)

    model_config = {
        "json_schema_extra": {
            "example": {
                "ttl_minutes": 120
            }
        }
    }


class EmergencyAccessResponse(BaseModel):
    """Response khi cấp cứu viên quét QR (Public endpoint).
    Chỉ trả về các trường mà user bật trong privacy_settings.
    """

    full_name: str
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None


class EmergencyAccessLogItem(BaseModel):
    """Một bản ghi lịch sử quét QR trong GET /emergency/tokens/history."""

    id: UUID
    token_id: UUID
    accessed_at: datetime
