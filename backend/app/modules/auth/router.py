from fastapi import APIRouter, Depends, UploadFile, File, Form 
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client 

from app.core.database import get_db
from app.shared.dependencies import get_current_user, get_supabase_client
from app.shared.schemas import ErrorResponse, MessageResponse
from app.modules.auth.schemas import (
    LoginRequest, 
    LoginResponse, 
    RegisterRequest, 
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionListResponse,
    RevokeSessionRequest,
    RevokeAllRequest
)

from app.modules.auth.service import AuthService 

_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}

def _get_service(
    db: AsyncSession = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
) -> AuthService: 
    return AuthService(db=db, supabase=supabase)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse, responses={401: _error_responses[401]})
async def login(
    request: LoginRequest,
    service: AuthService = Depends(_get_service)
) -> LoginResponse:
    return await service.login(request)

@router.post("/register", response_model=MessageResponse, responses={400: _error_responses[400]})
async def register(
    data: RegisterRequest,
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.register(data)

@router.post("/register-doctor", response_model=RegisterDoctorResponse, status_code=201, responses={400: _error_responses[400]})
async def register_doctor(
    # Form fields (multipart/form-data)
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    date_of_birth: str = Form(...),
    gender: str = Form(...),
    cccd: str = Form(...),
    license_number: str = Form(...),
    specialty: str = Form(...),
    hospital: str = Form(...),
    certificate_file: UploadFile = File(...),
    # Dependencies
    service: AuthService = Depends(_get_service),
    supabase: Client = Depends(get_supabase_client),
):
    from datetime import date as date_type

    # 1. Upload chứng chỉ lên Supabase Storage
    file_bytes = await certificate_file.read()
    file_path = f"certificates/{certificate_file.filename}"
    supabase.storage.from_("certificates").upload(file_path, file_bytes)
    certificate_url = f"{supabase.storage_url}/object/public/certificates/{file_path}"

    # 2. Tạo schema object từ form data
    data = RegisterDoctorRequest(
        email=email,
        password=password,
        full_name=full_name,
        date_of_birth=date_type.fromisoformat(date_of_birth),
        gender=gender,
        cccd=cccd,
        license_number=license_number,
        specialty=specialty,
        hospital=hospital,
    )

    return await service.register_doctor(data, certificate_url)

@router.post("/logout", response_model=MessageResponse, responses={400: _error_responses[400]})
async def logout(
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.log_out()

@router.post("/revoke-all", response_model=MessageResponse, responses={400: _error_responses[400]})
async def revoke_all(
    data: RevokeAllRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.revoke_all_user_sessions(current_user["sub"], data.password)

@router.get("/sessions", response_model=SessionListResponse, responses={401: _error_responses[401]})
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> SessionListResponse:
    return await service.list_session(current_user["sub"])

@router.post("/revoke-selected-session", response_model=MessageResponse, responses={400: _error_responses[400]})
async def revoke_selected_session(
    data: RevokeSessionRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.revoke_selected_session(str(data.session_id), current_user["sub"], data.password)