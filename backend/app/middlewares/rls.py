import json
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt
from app.core.config import settings
from app.core.database import async_session_factory

logger = logging.getLogger(__name__)

class RLSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Lấy Token từ header
        auth_header = request.headers.get("Authorization")
        claims_json = "{}"
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            # DEBUG: In ra để kiểm tra
            print(f"DEBUG RLS: Header found: {auth_header[:20]}...")
            print(f"DEBUG RLS: Token extracted: {token[:20]}...")
            
            try:
                # Xử lý key
                raw_key = settings.JWT_SECRET.strip()
                print(f"DEBUG RLS: Raw Key Start: |{raw_key[:20]}|")
                
                # Loại bỏ dấu nháy đơn/kép bao quanh nếu có
                if (raw_key.startswith("'") and raw_key.endswith("'")) or (raw_key.startswith('"') and raw_key.endswith('"')):
                    raw_key = raw_key[1:-1]
                
                key = raw_key
                try:
                    key_data = json.loads(raw_key)
                    if isinstance(key_data, dict) and "keys" in key_data:
                        key = key_data["keys"][0]
                    elif isinstance(key_data, dict):
                        key = key_data
                    print(f"DEBUG RLS: Key parsed as JSON/JWK. KID: {key.get('kid') if isinstance(key, dict) else 'N/A'}")
                except Exception as json_err:
                    print(f"DEBUG RLS: Key is NOT JSON, using as raw string. Error: {str(json_err)}")

                # Giải mã JWT
                payload = jwt.decode(
                    token, 
                    key, 
                    algorithms=["HS256", "ES256"],
                    options={"verify_aud": False} 
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
            except Exception as e:
                # Nếu token lỗi (hết hạn, sai secret...), ta coi như anonymous
                logger.warning(f"RLSMiddleware: Token invalid or expired: {str(e)}")
                pass

        # 2. Inject claims vào Postgres session trước khi chạy nghiệp vụ
        # Chúng ta sẽ thực hiện việc này thông qua biến context hoặc 
        # chạy trực tiếp một lệnh SET LOCAL nếu có session.
        # Ở đây, ta gắn claims vào request state để service.py có thể dùng.
        request.state.jwt_claims = claims_json

        response = await call_next(request)
        return response
