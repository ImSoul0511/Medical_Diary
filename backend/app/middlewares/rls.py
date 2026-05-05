import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt
from app.core.config import settings
from app.core.database import async_session_factory

class RLSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Lấy Token từ header
        auth_header = request.headers.get("Authorization")
        claims_json = "{}"
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                # Giải mã JWT (Sử dụng JWT_SECRET từ Supabase)
                payload = jwt.decode(
                    token, 
                    settings.JWT_SECRET, 
                    algorithms=[settings.ALGORITHM],
                    options={"verify_aud": False} # Supabase dùng aud="authenticated"
                )
                # Format lại claims theo chuẩn Supabase để RLS hiểu được
                claims = {
                    "role": payload.get("role", "authenticated"),
                    "sub": payload.get("sub"),
                    "email": payload.get("email"),
                    "app_metadata": payload.get("app_metadata", {}),
                    "user_metadata": payload.get("user_metadata", {}),
                }
                claims_json = json.dumps(claims)
            except Exception:
                # Nếu token lỗi, ta coi như anonymous (claims trống)
                pass

        # 2. Inject claims vào Postgres session trước khi chạy nghiệp vụ
        # Chúng ta sẽ thực hiện việc này thông qua biến context hoặc 
        # chạy trực tiếp một lệnh SET LOCAL nếu có session.
        # Ở đây, ta gắn claims vào request state để service.py có thể dùng.
        request.state.jwt_claims = claims_json

        response = await call_next(request)
        return response
