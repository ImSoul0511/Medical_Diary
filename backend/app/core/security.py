from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import supabase_admin

_bearer = HTTPBearer()


def create_access_token(user_id: str, session_id: str, role: str) -> str:
    """
    Tạo JWT access token cho người dùng sau khi đăng nhập thành công.

    Token chứa 3 claims quan trọng:
    - `sub`: user_id — định danh chủ thể của token, dùng để tra cứu profile.
    - `sid`: session_id — liên kết token với một phiên cụ thể trong bảng `sessions`;
      khi logout, phiên này bị đánh dấu `is_active=False` và token sẽ bị từ chối
      dù chưa hết hạn cryptographically.
    - `role`: quyền hạn (user / doctor / admin) — dùng để phân quyền ở các module khác.

    Được gọi duy nhất từ `service.login()` sau khi xác thực credentials thành công.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": user_id,
        "sid": session_id,
        "role": role,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def _decode_token(token: str) -> dict[str, Any]:
    """
    Giải mã và xác thực chữ ký của JWT bằng JWT_SECRET.

    Nếu token bị giả mạo, hết hạn, hoặc sai định dạng, jose sẽ ném JWTError
    và hàm này chuẩn hóa lỗi thành HTTP 401 theo format chung của hệ thống.
    Đây là lớp bảo vệ đầu tiên trước khi kiểm tra session trong DB.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_TOKEN",
                "message": "Token không hợp lệ hoặc đã hết hạn",
                "request_id": "",
            },
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict[str, str]:
    """
    FastAPI dependency — xác thực người dùng cho mọi route cần đăng nhập.

    Quy trình 2 lớp:
    1. Xác thực chữ ký JWT và thời hạn (cryptographic check).
    2. Kiểm tra session còn active trong DB — cho phép logout thực sự dù token
       chưa hết hạn (JWT thuần là stateless, không tự hủy được; session DB bù đắp điều này).

    Trả về context dict `{user_id, session_id, role}` — các route handler dùng
    dict này để biết ai đang gọi và quyền hạn của họ, không cần query DB thêm.

    Inject vào route bằng `Depends(get_current_user)`.
    """
    payload = _decode_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")

    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_TOKEN", "message": "Token không hợp lệ", "request_id": ""},
        )

    result = (
        supabase_admin.table("sessions")
        .select("id")
        .eq("id", session_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "SESSION_EXPIRED",
                "message": "Phiên đăng nhập đã hết hạn hoặc không tồn tại",
                "request_id": "",
            },
        )

    return {"user_id": user_id, "session_id": session_id, "role": payload.get("role", "user")}
