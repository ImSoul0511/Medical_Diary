from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Họ tên không được để trống")
        return v


class DoctorRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialty: str
    license_number: str
    hospital: str
    certificate_url: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_info: Optional[dict] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class SessionResponse(BaseModel):
    id: str
    device_info: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool = False


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
