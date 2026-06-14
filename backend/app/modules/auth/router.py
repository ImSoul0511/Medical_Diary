from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client 

from app.core.database import get_db
from app.core.config import settings
from app.shared.dependencies import get_current_user, get_supabase_client
from app.shared.schemas import MessageResponse, error_responses as _error_responses
from app.modules.auth.schemas import (
    LoginRequest, 
    LoginResponse, 
    RefreshResponse,
    PasswordResetRequest,
    RegisterRequest, 
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionListResponse,
    RevokeSessionRequest,
    RevokeAllRequest,
    ForgotPasswordRequest,
    ChangePasswordRequest,
    ResetPasswordRequest,
    RegisterFamilyMemberRequest,
    RegisterFamilyMemberResponse,
    UpgradeDependentRequest
)

from app.modules.auth.service import AuthService
from app.core.rate_limiter import limiter


def _get_service(
    db: AsyncSession = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
) -> AuthService: 
    return AuthService(db=db, supabase=supabase)

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_COOKIE_NAME = "md_refresh_token"
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
REFRESH_COOKIE_PATH = "/auth"

def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.cookie_samesite,
        path=REFRESH_COOKIE_PATH,
        domain=settings.cookie_domain,
    )

def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )

@router.post("/login", response_model=LoginResponse, responses={401: _error_responses[401]})
@limiter.limit("100/minute")
async def login(
    request: Request,
    response: Response,
    data: LoginRequest,
    service: AuthService = Depends(_get_service)
) -> LoginResponse:
    result = await service.login(data)
    _set_refresh_cookie(response, result.refresh_token)
    return result.response

@router.post("/refresh", response_model=RefreshResponse, responses={401: _error_responses[401]})
async def refresh(
    request: Request,
    response: Response,
    service: AuthService = Depends(_get_service)
) -> RefreshResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh cookie")

    result = await service.refresh_session(refresh_token)
    _set_refresh_cookie(response, result.refresh_token)
    return RefreshResponse(
        access_token=result.response.access_token,
        token_type=result.response.token_type,
        user=result.response.user,
    )

@router.post("/password-reset/request", response_model=MessageResponse, responses={400: _error_responses[400]})
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    origin = request.headers.get("origin") or "http://localhost:5173"
    redirect_url = f"{origin}/reset-password"
    return await service.request_password_reset(data, redirect_url)

@router.post("/register", response_model=MessageResponse, responses={400: _error_responses[400]})
@limiter.limit("3/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.register(data)

@router.post("/register-family-member", response_model=RegisterFamilyMemberResponse, status_code=201, responses={400: _error_responses[400]})
@limiter.limit("5/minute")
async def register_family_member(
    request: Request,
    data: RegisterFamilyMemberRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> RegisterFamilyMemberResponse:
    return await service.register_family_member(data, current_user["sub"])

@router.post("/upgrade-dependent", response_model=MessageResponse, responses={400: _error_responses[400]})
@limiter.limit("5/minute")
async def upgrade_dependent(
    request: Request,
    data: UpgradeDependentRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.upgrade_dependent_account(data, current_user["sub"])

@router.post("/register-doctor", response_model=RegisterDoctorResponse, status_code=201, responses={400: _error_responses[400]})
@limiter.limit("3/minute")
async def register_doctor(
    request: Request,
    # Form fields (multipart/form-data)
    email: str = Form(...),
    phone_number: str = Form(...),
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
    import uuid
    from pydantic import ValidationError
    from fastapi import HTTPException

    # 1. Tạo và validate schema object từ form data trước
    try:
        data = RegisterDoctorRequest(
            email=email,
            phone_number=phone_number,
            password=password,
            full_name=full_name,
            date_of_birth=date_type.fromisoformat(date_of_birth),
            gender=gender,
            cccd=cccd,
            license_number=license_number,
            specialty=specialty,
            hospital=hospital,
        )
    except ValidationError as e:
        errors = e.errors()
        err_msg = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in errors])
        raise HTTPException(status_code=400, detail=f"Dữ liệu không hợp lệ: {err_msg}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Định dạng ngày sinh không hợp lệ. Phải là YYYY-MM-DD")

    # 2. Upload chứng chỉ lên Supabase Storage với tên file unique
    file_bytes = await certificate_file.read()
    
    # Validation constraints (Remediation 8)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File chứng chỉ quá lớn. Tối đa 5MB.")
        
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
    file_ext = certificate_file.filename.split('.')[-1].lower() if '.' in certificate_file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file định dạng PNG, JPG, JPEG hoặc PDF.")

    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"certificates/{file_name}"
    
    try:
        supabase.storage.from_("certificates").upload(file_path, file_bytes)
    except Exception as upload_err:
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload chứng chỉ: {str(upload_err)}")
        
    certificate_url = f"{supabase.storage_url}/object/public/certificates/{file_path}"

    # 3. Tiến hành đăng ký bác sĩ
    try:
        return await service.register_doctor(data, certificate_url)
    except Exception as e:
        # Nếu đăng ký lỗi, xóa file vừa upload để dọn dẹp storage
        try:
            supabase.storage.from_("certificates").remove([file_path])
        except Exception:
            pass
        raise e

@router.post("/logout", response_model=MessageResponse, responses={400: _error_responses[400]})
async def logout(
    response: Response,
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    _clear_refresh_cookie(response)
    try:
        return await service.log_out()
    except HTTPException:
        return MessageResponse(message="Logged out successfully.")

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

@router.post("/forgot-password", response_model=MessageResponse, responses={400: _error_responses[400]})
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    origin = request.headers.get("origin")
    
    # Whitelist check for allowed origins (Remediation 7)
    allowed_origins = {
        "https://medical-diary-gamma.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    }
    from app.core.config import settings
    if settings.cors_origin_list:
        for allowed in settings.cors_origin_list:
            allowed_origins.add(allowed.strip().rstrip("/"))
            
    cleaned_origin = origin.strip().rstrip("/") if origin else ""
    if cleaned_origin not in allowed_origins:
        # Fallback to trusted production deployment
        origin = "https://medical-diary-gamma.vercel.app"
        
    redirect_url = f"{origin}/reset-password"
    return await service.forgot_password(data.email, redirect_url)

@router.post("/change-password", response_model=MessageResponse, responses={400: _error_responses[400]})
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.change_password(current_user["sub"], data.current_password, data.new_password)

@router.post("/reset-password", response_model=MessageResponse, responses={400: _error_responses[400]})
async def reset_password(
    data: ResetPasswordRequest,
    current_user: dict = Depends(get_current_user),
    service: AuthService = Depends(_get_service)
) -> MessageResponse:
    return await service.reset_password(current_user["sub"], data.new_password)
