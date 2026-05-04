from fastapi import APIRouter, Depends, Request, status

from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.modules.auth import service
from app.modules.auth.schemas import (
    DoctorRegisterRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SessionListResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    """
    `POST /auth/register` — Đăng ký tài khoản User.
    Nhận email/password/full_name, Pydantic validate trước, rồi ủy quyền cho service.
    Trả 201 Created với thông tin user vừa tạo (không có password).
    """
    return service.register_user(data)


@router.post(
    "/register/doctor",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_doctor(data: DoctorRegisterRequest):
    """
    `POST /auth/register/doctor` — Đăng ký tài khoản Bác sĩ.
    Ngoài thông tin cơ bản, yêu cầu thêm chuyên khoa, số chứng chỉ, bệnh viện,
    và URL chứng chỉ để Admin xét duyệt. Tài khoản tạo ra ở trạng thái pending.
    """
    return service.register_doctor(data)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest):
    """
    `POST /auth/login` — Đăng nhập, trả về JWT access token.

    Decorator `@limiter.limit("5/minute")` giới hạn 5 lần thử/phút/IP,
    chống brute-force theo đúng yêu cầu SSOT. `request: Request` là bắt buộc
    để slowapi đọc được địa chỉ IP của client.
    IP cũng được chuyển vào service để lưu vào bản ghi session.
    """
    ip = request.client.host if request.client else None
    return service.login(data, ip)


@router.get("/sessions", response_model=SessionListResponse)
def sessions(current_user: dict = Depends(get_current_user)):
    """
    `GET /auth/sessions` — Liệt kê phiên đang hoạt động.
    Yêu cầu JWT hợp lệ (qua `get_current_user`). Truyền cả `session_id` hiện tại
    để service đánh dấu phiên nào là "thiết bị đang dùng".
    """
    return service.get_sessions(current_user["user_id"], current_user["session_id"])


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: dict = Depends(get_current_user)):
    """
    `POST /auth/logout` — Đăng xuất thiết bị hiện tại.
    Vô hiệu hóa đúng phiên đang dùng (lấy từ JWT claim `sid`). Trả 204 No Content.
    """
    service.logout(current_user["user_id"], current_user["session_id"])


@router.post("/revoke-all", status_code=status.HTTP_204_NO_CONTENT)
def revoke_all(current_user: dict = Depends(get_current_user)):
    """
    `POST /auth/revoke-all` — Đăng xuất toàn bộ thiết bị.
    Vô hiệu hóa tất cả session của user. Dùng khi nghi ngờ tài khoản bị xâm phạm.
    """
    service.revoke_all(current_user["user_id"])


# MFA endpoints deferred post-MVP
@router.post("/mfa/setup", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def mfa_setup():
    """
    `POST /auth/mfa/setup` — Khởi tạo MFA (TOTP). Deferred post-MVP.
    Endpoint khai báo sẵn để client không nhận 404, trả 501 để báo chưa triển khai.
    """
    return {"error_code": "NOT_IMPLEMENTED", "message": "MFA chưa được triển khai", "request_id": ""}


@router.post("/mfa/verify", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def mfa_verify():
    """
    `POST /auth/mfa/verify` — Xác thực mã TOTP. Deferred post-MVP.
    Endpoint khai báo sẵn để client không nhận 404, trả 501 để báo chưa triển khai.
    """
    return {"error_code": "NOT_IMPLEMENTED", "message": "MFA chưa được triển khai", "request_id": ""}
