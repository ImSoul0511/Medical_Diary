import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from gotrue.errors import AuthApiError
from supabase import create_client

from app.core.config import settings
from app.core.database import supabase_admin
from app.core.security import create_access_token
from app.modules.auth.schemas import (
    DoctorRegisterRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SessionListResponse,
    SessionResponse,
    UserResponse,
)


def _anon_client():
    """Fresh anon-key client per call để tránh race condition trên shared state."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def _err(status_code: int, error_code: str, message: str) -> HTTPException:
    """
    Tạo HTTPException với format lỗi chuẩn hóa của hệ thống.

    Đảm bảo mọi lỗi trong module auth đều trả về đúng cấu trúc
    `{error_code, message, request_id}` như SSOT quy định,
    thay vì để từng hàm tự build dict thủ công.
    """
    return HTTPException(
        status_code=status_code,
        detail={"error_code": error_code, "message": message, "request_id": ""},
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_user(data: RegisterRequest) -> UserResponse:
    """
    Đăng ký tài khoản User mới.

    Gồm 2 bước nguyên tử theo thứ tự:
    1. Tạo bản ghi xác thực trong `auth.users` (Supabase Auth quản lý mật khẩu
       bằng bcrypt, không lưu plaintext).
    2. Tạo bản ghi hồ sơ trong bảng `profiles` với role='user' — đây là bảng
       các module khác (users, health_metrics, diaries...) sẽ JOIN vào.

    `email_confirm: True` bỏ qua bước xác nhận email — phù hợp cho MVP,
    cần bật lại khi production.
    """
    try:
        auth_resp = supabase_admin.auth.admin.create_user(
            {
                "email": data.email,
                "password": data.password,
                "email_confirm": True,
            }
        )
    except AuthApiError as exc:
        msg = str(exc).lower()
        if any(k in msg for k in ("already registered", "already exists", "unique")):
            raise _err(status.HTTP_409_CONFLICT, "EMAIL_ALREADY_EXISTS", "Email đã được đăng ký")
        raise _err(status.HTTP_400_BAD_REQUEST, "REGISTRATION_FAILED", str(exc))

    user_id = auth_resp.user.id
    supabase_admin.table("profiles").insert(
        {"id": user_id, "full_name": data.full_name, "role": "user"}
    ).execute()

    return UserResponse(id=user_id, email=data.email, full_name=data.full_name, role="user")


def register_doctor(data: DoctorRegisterRequest) -> UserResponse:
    """
    Đăng ký tài khoản Bác sĩ mới.

    Gồm 3 bước theo thứ tự:
    1. Tạo bản ghi xác thực trong `auth.users` (giống register_user).
    2. Tạo `profiles` với role='doctor'.
    3. Tạo `doctors` chứa thông tin chuyên môn và `certificate_url`.

    Tài khoản doctor sẽ có `verification_status='pending_verification'` mặc định
    (do DB default) — Admin phải duyệt qua `PATCH /admin/doctors/{id}/verify`
    trước khi bác sĩ có thể tìm kiếm bệnh nhân hay tạo hồ sơ y tế.
    """
    try:
        auth_resp = supabase_admin.auth.admin.create_user(
            {
                "email": data.email,
                "password": data.password,
                "email_confirm": True,
            }
        )
    except AuthApiError as exc:
        msg = str(exc).lower()
        if any(k in msg for k in ("already registered", "already exists", "unique")):
            raise _err(status.HTTP_409_CONFLICT, "EMAIL_ALREADY_EXISTS", "Email đã được đăng ký")
        raise _err(status.HTTP_400_BAD_REQUEST, "REGISTRATION_FAILED", str(exc))

    user_id = auth_resp.user.id

    supabase_admin.table("profiles").insert(
        {"id": user_id, "full_name": data.full_name, "role": "doctor"}
    ).execute()

    supabase_admin.table("doctors").insert(
        {
            "id": user_id,
            "specialty": data.specialty,
            "license_number": data.license_number,
            "hospital": data.hospital,
            "certificate_url": data.certificate_url,
        }
    ).execute()

    return UserResponse(id=user_id, email=data.email, full_name=data.full_name, role="doctor")


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def login(data: LoginRequest, ip: Optional[str] = None) -> LoginResponse:
    """
    Xác thực credentials và phát hành JWT access token.

    Quy trình 4 bước:
    1. Gọi Supabase Auth để kiểm tra email/password — Supabase xử lý bcrypt,
       trả về `user.id` nếu đúng.
    2. Lấy profile từ bảng `profiles` để biết `role` thực tế của user.
    3. Tạo bản ghi session trong bảng `sessions` với `session_id` tự sinh —
       bản ghi này là "neo" để logout có thể hủy token dù chưa hết hạn.
    4. Tạo JWT chứa `sub`, `sid`, `role` rồi trả về client.

    `ip` được lưu vào session để hiển thị trong `GET /auth/sessions`,
    giúp user nhận biết thiết bị lạ.
    """
    client = _anon_client()
    try:
        auth_resp = client.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except AuthApiError:
        raise _err(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Email hoặc mật khẩu không đúng",
        )

    user_id: str = auth_resp.user.id

    profile_resp = (
        supabase_admin.table("profiles")
        .select("full_name, role")
        .eq("id", user_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not profile_resp.data:
        raise _err(status.HTTP_404_NOT_FOUND, "PROFILE_NOT_FOUND", "Hồ sơ người dùng không tồn tại")

    profile = profile_resp.data
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    supabase_admin.table("sessions").insert(
        {
            "id": session_id,
            "user_id": user_id,
            "device_info": data.device_info or {},
            "ip_address": ip,
            "expires_at": expires_at.isoformat(),
        }
    ).execute()

    access_token = create_access_token(user_id, session_id, profile["role"])

    return LoginResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user_id,
            email=auth_resp.user.email,
            full_name=profile["full_name"],
            role=profile["role"],
        ),
    )


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

def get_sessions(user_id: str, current_session_id: str) -> SessionListResponse:
    """
    Liệt kê tất cả phiên đang hoạt động của người dùng.

    Chỉ trả về session có `is_active=True` — các session đã logout hoặc
    revoke-all sẽ không xuất hiện. Trường `is_current=True` đánh dấu phiên
    đang gọi request này, giúp client phân biệt "thiết bị này" với các thiết bị khác.

    Phục vụ tính năng quản lý thiết bị: user thấy mình đang đăng nhập ở đâu
    và có thể chủ động logout từng thiết bị.
    """
    result = (
        supabase_admin.table("sessions")
        .select("id, device_info, ip_address, created_at, last_used_at, expires_at")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    )

    sessions = [
        SessionResponse(**row, is_current=(row["id"] == current_session_id))
        for row in result.data
    ]
    return SessionListResponse(sessions=sessions)


def logout(user_id: str, session_id: str) -> None:
    """
    Đăng xuất khỏi thiết bị hiện tại bằng cách vô hiệu hóa phiên.

    Đánh dấu `is_active=False` cho đúng session đang dùng. Sau đó,
    `get_current_user` trong `security.py` sẽ từ chối mọi request dùng
    token cũ dù token chưa hết hạn cryptographically — đây là lý do cần
    session DB thay vì chỉ dựa vào JWT exp.

    Điều kiện kép `eq(session_id) + eq(user_id)` ngăn user A logout session của user B.
    """
    supabase_admin.table("sessions").update({"is_active": False}).eq("id", session_id).eq(
        "user_id", user_id
    ).execute()


def revoke_all(user_id: str) -> None:
    """
    Đăng xuất khỏi tất cả thiết bị cùng lúc.

    Vô hiệu hóa toàn bộ session active của user — tất cả token hiện có
    sẽ bị từ chối ở bước kiểm tra session DB trong `get_current_user`.
    Dùng khi phát hiện tài khoản bị xâm phạm hoặc user muốn "đăng xuất tất cả".
    """
    supabase_admin.table("sessions").update({"is_active": False}).eq(
        "user_id", user_id
    ).execute()
