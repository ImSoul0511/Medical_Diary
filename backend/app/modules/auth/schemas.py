from pydantic import BaseModel, Field, EmailStr
from uuid import UUID 
from datetime import datetime, date
from typing import List

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "string@gmail.com",
                "password": "stringst"
            }
        }
    }

class UserBrief(BaseModel):
    id: UUID
    role: str # user / doctor / admin 
    email: EmailStr

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief 

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief

class PasswordResetRequest(BaseModel):
    email: EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    phone_number: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: str
    date_of_birth: date

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "string@gmail.com",
                "phone_number": "0912345678",
                "password": "stringst",
                "full_name": "Nguyen Van A",
                "gender": "male",
                "date_of_birth": "2000-01-01"
            }
        }
    }

class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    phone_number: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: str
    date_of_birth: date 
    cccd: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")
    license_number: str 
    specialty: str
    hospital: str

class RegisterDoctorResponse(BaseModel):
    id: UUID
    full_name: str
    status: str # pending_verification 
    certificate_url: str 

class SessionResponse(BaseModel):
    session_id: UUID 
    user_id: UUID
    created_at: datetime 
    updated_at: datetime 
    user_agent: str 
    ip: str 
    

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]

class RevokeSessionRequest(BaseModel):
    session_id: UUID
    password: str = Field(..., min_length=8)

class RevokeAllRequest(BaseModel):
    password: str = Field(..., min_length=8)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)
