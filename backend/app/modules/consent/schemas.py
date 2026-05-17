from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional


class AccessRequestItem(BaseModel):
    request_id: UUID
    doctor_id: UUID
    doctor_name: str
    status: str  # "pending" | "approved" | "rejected"
    requested_scope: List[str]
    requested_at: datetime


class AccessRequestActionRequest(BaseModel):
    action: str  # "approve" | "reject"
    approved_scope: Optional[List[str]] = None  # bắt buộc khi action="approve"
    timeout_at: Optional[datetime] = None  # None = không hết hạn, datetime = auto-revoke tại thời điểm này


class AccessRequestActionResponse(BaseModel):
    action: str  # "approve" | "reject"
    approved_scope: Optional[List[str]] = None
    timeout_at: Optional[datetime] = None


class ConsentHistoryItem(BaseModel):
    scope: List[str]
    doctor_id: UUID
    doctor_name: str
    granted_at: datetime
    timeout_at: Optional[datetime] = None


class ConsentRevokeResponse(BaseModel):
    doctor_id: UUID
    revoked_at: datetime
