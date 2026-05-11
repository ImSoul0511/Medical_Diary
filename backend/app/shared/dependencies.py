from fastapi import Security
import json 
from typing import Callable, List, Dict, Any
from fastapi import Request, HTTPException, Depends 
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

security = HTTPBearer()

from app.core.config import settings 
def get_supabase_client() -> Client:
    """Dependency để tạo và trả về Supabase Client, đảm bảo kết nối luôn được khởi tạo"""
    try:
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection error: {str(e)}")

def get_current_user(
    request: Request,
    _token: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency lấy thông tin user từ JWT claims (đã được RLSMiddleware xử lý).
    Văng lỗi 401 nếu người dùng chưa đăng nhập hoặc token không hợp lệ.
    """
    claims_json = getattr(request.state, "jwt_claims", "{}")
    claims = json.loads(claims_json)

    if not claims or "sub" not in claims:
        # Debug log để biết tại sao bị chặn
        import logging
        logging.error(f"Access Denied: claims_json from state is: {claims_json}")
        
        raise HTTPException(
            status_code=401,
            detail=f"Không có quyền truy cập. Token không hợp lệ hoặc RLS Context bị trống. (Claims: {claims_json})",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return claims

def require_role(allowed_roles: List[str]) -> Callable:
    """
    Dependency kiểm tra phân quyền.
    Sử dụng: current_user: dict = Depends(require_role(["doctor", "admin"]))
    """
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role", "user")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Quyền bị từ chối. API này yêu cầu các quyền: {', '.join(allowed_roles)}"
            )
        return current_user
        
    return role_checker