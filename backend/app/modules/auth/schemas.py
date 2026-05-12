from pydantic import BaseModel, Field, EmailStr
from uuid import UUID 
from datetime import datetime, date
from typing import List

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserBrief(BaseModel):
    id: UUID
    role: str # user / doctor / admin 

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief 

class RegisterRequest(BaseModel):
    email: EmailStr
    phone_number: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: str
    date_of_birth: date

class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    phone_number: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: str
    date_of_birth: date 
    cccd: str = Field(..., min_length=12, max_length=12)
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
