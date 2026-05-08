# Kế hoạch Triển khai: System Logging + Auth Module

> **Mục tiêu:** Manually implement 2 phần — Hệ thống Log Request Tracing và hoàn thành toàn bộ Auth Module.  
> **Thứ tự thực hiện:** Phần A trước (vì Auth Module sẽ dùng logging ngay từ đầu).

---

## Phần A: Hệ thống Logging & Request Tracing (3 bước)

### Tổng quan kiến trúc

```
Request đến → [LoggingMiddleware] → sinh request_id → gắn vào request.state
                                                         ↓
                                            [RLS Middleware] → [Router → Service]
                                                         ↓
                                            Nếu lỗi → [ExceptionHandler] bắt lỗi
                                                         ↓
                                            Trả JSON ErrorResponse { error_code, message, request_id }
                                            + Ghi log ra console/file kèm request_id
```

---

### Bước A1: Tạo file `app/middlewares/logging.py`

**Vai trò:** Middleware này chạy **đầu tiên** (trước cả RLS). Với mỗi request, nó sẽ:
1. Sinh 1 `request_id` (UUID ngắn gọn, 8 ký tự).
2. Gắn `request_id` vào `request.state` để các tầng phía sau dùng được.
3. Ghi log thời gian xử lý request (bao lâu).
4. Đính kèm `request_id` vào Response Header (`X-Request-ID`) để Frontend đọc.

**Code:**
```python
import uuid
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Cấu hình logger cơ bản
logger = logging.getLogger("medical_diary")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Sinh request_id
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id
        
        # 2. Ghi log request đến
        logger.info(
            f"[{request_id}] → {request.method} {request.url.path}"
        )
        
        # 3. Đo thời gian xử lý
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = round((time.time() - start_time) * 1000, 2)
        
        # 4. Ghi log response đi
        logger.info(
            f"[{request_id}] ← {response.status_code} ({duration}ms)"
        )
        
        # 5. Đính request_id vào header trả về
        response.headers["X-Request-ID"] = request_id
        
        return response
```

> [!TIP]
> `uuid.uuid4().hex[:8]` cho ra chuỗi 8 ký tự hex (ví dụ: `a3f1b2c4`). Ngắn gọn, đủ unique cho mục đích tracing trong 1 hệ thống nhỏ. Nếu muốn dài hơn, bỏ `[:8]`.

---

### Bước A2: Tạo file `app/core/exceptions.py`

**Vai trò:** Xử lý tập trung **mọi lỗi** của hệ thống. Thay vì mỗi endpoint tự bắt lỗi riêng, ta viết 1 handler toàn cục.

**Code:**
```python
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.shared.schemas import ErrorResponse  # ← Dùng schema chuẩn thay vì dict thô

logger = logging.getLogger("medical_diary")


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Bắt mọi HTTPException (ví dụ: 401, 403, 404)"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"[{request_id}] HTTPException {exc.status_code}: {exc.detail}"
    )
    
    error = ErrorResponse(
        error_code=f"HTTP_{exc.status_code}",
        message=exc.detail,
        request_id=request_id,
    )
    return JSONResponse(status_code=exc.status_code, content=error.model_dump())


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Bắt lỗi validation (ví dụ: thiếu field, sai kiểu dữ liệu)"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    # Lấy lỗi đầu tiên để hiển thị
    first_error = exc.errors()[0] if exc.errors() else {}
    field = " → ".join(str(loc) for loc in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation error")
    
    logger.warning(
        f"[{request_id}] ValidationError: {field} - {msg}"
    )
    
    error = ErrorResponse(
        error_code="VALIDATION_ERROR",
        message=f"Lỗi dữ liệu tại '{field}': {msg}",
        request_id=request_id,
    )
    return JSONResponse(status_code=422, content=error.model_dump())


async def unhandled_exception_handler(request: Request, exc: Exception):
    """Bắt mọi lỗi không lường trước (500 Internal Server Error)"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    # Log đầy đủ stack trace để debug
    logger.exception(
        f"[{request_id}] Unhandled Exception: {str(exc)}"
    )
    
    error = ErrorResponse(
        error_code="INTERNAL_ERROR",
        message="Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
        request_id=request_id,
    )
    return JSONResponse(status_code=500, content=error.model_dump())
```

> [!IMPORTANT]
> Có 3 loại handler:
> - `http_exception_handler` → Bắt `HTTPException` (lỗi bạn tự ném ra trong service, ví dụ 401).
> - `validation_exception_handler` → Bắt lỗi Pydantic (ví dụ gửi thiếu field `password`).
> - `unhandled_exception_handler` → Bắt **mọi lỗi khác** (bug code, database crash...). Đây là lưới an toàn cuối cùng.
>
> **Tại sao dùng `ErrorResponse` thay vì dict thô?**
> - Đảm bảo format lỗi **nhất quán** — nếu thay đổi cấu trúc, chỉ cần sửa 1 chỗ (`shared/schemas.py`).
> - Pydantic tự validate dữ liệu (ví dụ không bao giờ quên field `request_id`).
> - `ErrorResponse` còn được dùng trong `responses` param của router (xem Bước B2) để Swagger hiển thị format lỗi cho frontend.

---

### Bước A3: Đăng ký vào `app/main.py`

**Thêm 2 phần:** import + gắn middleware/handler. Lưu ý thứ tự middleware rất quan trọng (đăng ký sau = chạy trước).

Thêm vào `main.py` (diff so với hiện tại):

```diff
 from fastapi import FastAPI
+from fastapi.exceptions import RequestValidationError
+from starlette.exceptions import HTTPException as StarletteHTTPException
 from fastapi.middleware.cors import CORSMiddleware
+import logging
+
 from app.middlewares.rls import RLSMiddleware
+from app.middlewares.logging import LoggingMiddleware
+from app.core.exceptions import (
+    http_exception_handler,
+    validation_exception_handler,
+    unhandled_exception_handler,
+)
+
+# ─── Cấu hình Logging ────────────────────────────────────────
+logging.basicConfig(
+    level=logging.INFO,
+    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
+    datefmt="%Y-%m-%d %H:%M:%S",
+)
 
 app = FastAPI(
     title="Medical Diary API",
     ...
 )
 
 # 1. CORS Middleware
 app.add_middleware(CORSMiddleware, ...)
 
 # 2. RLS Middleware
 app.add_middleware(RLSMiddleware)
 
+# 3. Logging Middleware (đăng ký cuối = chạy đầu tiên)
+app.add_middleware(LoggingMiddleware)
+
+# ─── Exception Handlers ──────────────────────────────────────
+app.add_exception_handler(StarletteHTTPException, http_exception_handler)
+app.add_exception_handler(RequestValidationError, validation_exception_handler)
+app.add_exception_handler(Exception, unhandled_exception_handler)
```

> [!WARNING]
> **Thứ tự `add_middleware`:** Trong Starlette/FastAPI, middleware được đăng ký **cuối cùng** sẽ chạy **đầu tiên** (stack LIFO). Vì vậy `LoggingMiddleware` phải được `add_middleware` **sau** `RLSMiddleware` để nó bọc ngoài cùng:
> ```
> Request → LoggingMiddleware → RLSMiddleware → CORS → Router
> ```

### ✅ Checklist Phần A

- [ ] Tạo file `app/middlewares/logging.py`
- [ ] Tạo file `app/core/exceptions.py`
- [ ] Cập nhật `app/main.py` (import + đăng ký middleware + exception handlers)
- [ ] Test: Gọi `GET /health` → xem Terminal hiện log `[xxxxxxxx] → GET /health`
- [ ] Test: Gọi `POST /auth/login` (không có body) → nhận JSON có `request_id`

---

## Phần B: Hoàn thành Auth Module (3 bước)

### Trạng thái hiện tại

| File | Trạng thái |
|---|---|
| `schemas.py` | ✅ Hoàn thành (6 schemas) |
| `service.py` | ⚠️ Mới có `login()` — thiếu 5 hàm |
| `router.py` | ❌ Trống |
| Đăng ký trong `main.py` | ❌ Chưa |

### Các hàm cần viết trong service.py

| Hàm | Mô tả | Dùng gì |
|---|---|---|
| `register()` | Đăng ký user thường | Supabase Auth `sign_up` + INSERT `profiles` |
| `register_doctor()` | Đăng ký bác sĩ | Supabase Auth `sign_up` + INSERT `profiles` + INSERT `doctors` |
| `logout()` | Đăng xuất | Supabase Auth `sign_out` |
| `list_sessions()` | Xem phiên đăng nhập | Trả danh sách session (placeholder) |
| `revoke_all_sessions()` | Hủy tất cả phiên | Supabase Admin API (placeholder) |

---

### Bước B1: Hoàn thiện `app/modules/auth/service.py`

**Lưu ý quan trọng trước khi code:**
1. Dòng 17 hiện tại bị thiếu dấu gạch dưới kép: `def __init(` → phải sửa thành `def __init__(`.
2. Dòng 10 import `SessionInfo` nhưng trong `schemas.py` không có class này → xóa import đó.

**Code hoàn chỉnh:**
```python
import logging
from fastapi import HTTPException
from supabase import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionListResponse,
    UserBrief,
)
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")


class AuthService:
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase

    # ─── LOGIN ────────────────────────────────────────────────
    async def login(self, data: LoginRequest) -> LoginResponse:
        try:
            response = self.supabase.auth.sign_in_with_password({
                "phone": data.phone_number,
                "password": data.password,
            })

            user_id = response.user.id
            access_token = response.session.access_token

            query = text("SELECT role FROM profiles WHERE id = :user_id AND deleted_at IS NULL")
            result = await self.db.execute(query, {"user_id": user_id})
            row = result.fetchone()
            role = row[0] if row else "user"

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserBrief(id=user_id, role=role),
            )
        except Exception as e:
            logger.warning(f"Login failed: {e}")
            raise HTTPException(status_code=401, detail="Số điện thoại hoặc mật khẩu không đúng")

    # ─── REGISTER (User thường) ───────────────────────────────
    async def register(self, data: RegisterRequest) -> MessageResponse:
        try:
            # 1. Tạo tài khoản trên Supabase Auth
            response = self.supabase.auth.sign_up({
                "phone": data.phone_number,
                "password": data.password,
            })
            user_id = response.user.id

            # 2. Lưu profile vào database (mã hóa phone bằng pgcrypto)
            query = text("""
                INSERT INTO profiles (id, full_name, date_of_birth, phone_encrypted, gender, role)
                VALUES (
                    :id, :full_name, :dob,
                    pgp_sym_encrypt(:phone, current_setting('app.encryption_key')),
                    :gender,
                    'user'
                )
            """)
            await self.db.execute(query, {
                "id": user_id,
                "full_name": data.full_name,
                "dob": data.date_of_birth,
                "phone": data.phone_number,
                "gender": data.gender,
            })
            await self.db.commit()

            logger.info(f"User registered: {user_id}")
            return MessageResponse(message="Đăng ký thành công. Vui lòng đăng nhập.")

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Register failed: {e}")
            raise HTTPException(status_code=400, detail=f"Đăng ký thất bại: {str(e)}")

    # ─── REGISTER DOCTOR ──────────────────────────────────────
    async def register_doctor(
        self, data: RegisterDoctorRequest, certificate_url: str
    ) -> RegisterDoctorResponse:
        try:
            # 1. Tạo tài khoản trên Supabase Auth
            response = self.supabase.auth.sign_up({
                "phone": data.phone_number,
                "password": data.password,
            })
            user_id = response.user.id

            # 2. Lưu profile (role = doctor, mã hóa phone + cccd)
            profile_query = text("""
                INSERT INTO profiles (id, full_name, date_of_birth, phone_encrypted, cccd_encrypted, gender, role)
                VALUES (
                    :id, :full_name, :dob,
                    pgp_sym_encrypt(:phone, current_setting('app.encryption_key')),
                    pgp_sym_encrypt(:cccd, current_setting('app.encryption_key')),
                    :gender,
                    'doctor'
                )
            """)
            await self.db.execute(profile_query, {
                "id": user_id,
                "full_name": data.full_name,
                "dob": data.date_of_birth,
                "phone": data.phone_number,
                "cccd": data.cccd,
                "gender": data.gender,
            })

            # 3. Lưu thông tin bác sĩ
            doctor_query = text("""
                INSERT INTO doctors (id, specialty, license_number, hospital, certificate_url, verification_status)
                VALUES (:id, :specialty, :license_number, :hospital, :cert_url, 'pending_verification')
            """)
            await self.db.execute(doctor_query, {
                "id": user_id,
                "specialty": data.specialty,
                "license_number": data.license_number,
                "hospital": data.hospital,
                "cert_url": certificate_url,
            })
            await self.db.commit()

            logger.info(f"Doctor registered (pending): {user_id}")
            return MessageResponse(message="Đăng ký bác sĩ thành công. Vui lòng chờ admin duyệt.")

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Register doctor failed: {e}")
            raise HTTPException(status_code=400, detail=f"Đăng ký bác sĩ thất bại: {str(e)}")

    # ─── LOGOUT ───────────────────────────────────────────────
    async def logout(self) -> MessageResponse:
        try:
            self.supabase.auth.sign_out()
            return MessageResponse(message="Đăng xuất thành công")
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể đăng xuất")

    # ─── LIST SESSIONS ────────────────────────────────────────
    async def list_sessions(self, user_id: str) -> SessionListResponse:
        # Supabase Free Tier không có Admin API list sessions.
        # Trả về rỗng, sẽ implement khi có Supabase Pro hoặc custom session table.
        return SessionListResponse(sessions=[])

    # ─── REVOKE ALL SESSIONS ─────────────────────────────────
    async def revoke_all_sessions(self, user_id: str) -> MessageResponse:
        # Tương tự, cần Supabase Admin API.
        # Placeholder: chỉ đăng xuất session hiện tại.
        try:
            self.supabase.auth.sign_out()
            return MessageResponse(message="Đã hủy tất cả phiên đăng nhập")
        except Exception as e:
            logger.error(f"Revoke sessions failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể hủy phiên đăng nhập")

    # ─── REVOKE SELECTED SESSION ───────────────────────────────
    async def revoke_selected_session(self, user_id: str, data: RevokeSessionRequest) -> MessageResponse:
        # Placeholder cho việc xóa một session cụ thể (tương tự cần Admin API hoặc xóa trực tiếp từ DB)
        try:
            query = text("DELETE FROM auth.sessions WHERE id = :session_id AND user_id = :user_id")
            await self.db.execute(query, {"session_id": str(data.session_id), "user_id": user_id})
            await self.db.commit()
            return MessageResponse(message="Phiên đăng nhập đã được hủy")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Revoke selected session failed: {e}")
            raise HTTPException(status_code=400, detail="Không thể hủy phiên đăng nhập này")
```

> [!NOTE]
> **Về mã hóa:** Cả `phone_encrypted` và `cccd_encrypted` đều dùng `pgp_sym_encrypt()` của pgcrypto. Key mã hóa lấy từ biến PostgreSQL `app.encryption_key` (được SET trong `get_db()`). Xem **Phần C** bên dưới để biết cách thiết lập.

---

### Bước B2: Viết `app/modules/auth/router.py`

**Vai trò:** Kết nối HTTP Endpoints với các hàm trong Service. Router KHÔNG chứa logic nghiệp vụ.

**Code:**
```python
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client

from app.core.database import get_db
from app.shared.dependencies import get_current_user, get_supabase_client
from app.shared.schemas import MessageResponse, ErrorResponse  # ← Import ErrorResponse
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterDoctorRequest,
    RegisterDoctorResponse,
    SessionListResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter()

# ─── Định nghĩa error responses dùng chung cho OpenAPI docs ──
_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}


# ─── Helper: Khởi tạo AuthService ────────────────────────────
def _get_service(
    db: AsyncSession = Depends(get_db),
    supabase: Client = Depends(get_supabase_client),
) -> AuthService:
    return AuthService(db=db, supabase=supabase)


# ─── POST /auth/login ────────────────────────────────────────
@router.post("/login", response_model=LoginResponse, responses={401: _error_responses[401]})
async def login(data: LoginRequest, service: AuthService = Depends(_get_service)):
    return await service.login(data)


# ─── POST /auth/register ─────────────────────────────────────
@router.post("/register", response_model=MessageResponse, status_code=201, responses={400: _error_responses[400]})
async def register(data: RegisterRequest, service: AuthService = Depends(_get_service)):
    return await service.register(data)


# ─── POST /auth/register/doctor ──────────────────────────────
@router.post("/register/doctor", response_model=RegisterDoctorResponse, status_code=201, responses={400: _error_responses[400]})
async def register_doctor(
    # Form fields (multipart/form-data)
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

    # 1. Upload chứng chỉ lên Supabase Storage
    file_bytes = await certificate_file.read()
    file_path = f"certificates/{certificate_file.filename}"
    supabase.storage.from_("certificates").upload(file_path, file_bytes)
    certificate_url = f"{supabase.storage_url}/object/public/certificates/{file_path}"

    # 2. Tạo schema object từ form data
    data = RegisterDoctorRequest(
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

    return await service.register_doctor(data, certificate_url)


# ─── POST /auth/logout ───────────────────────────────────────
@router.post("/logout", response_model=MessageResponse, responses={400: _error_responses[400]})
async def logout(
    service: AuthService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
):
    return await service.logout()


# ─── POST /auth/revoke-all ───────────────────────────────────
@router.post("/revoke-all", response_model=MessageResponse, responses={400: _error_responses[400]})
async def revoke_all(
    service: AuthService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
):
    return await service.revoke_all_sessions(current_user["sub"])


# ─── GET /auth/sessions ──────────────────────────────────────
@router.get("/sessions", response_model=SessionListResponse, responses={401: _error_responses[401]})
async def list_sessions(
    service: AuthService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
):
    return await service.list_sessions(current_user["sub"])
    
# ─── POST /auth/revoke-selected-session ──────────────────────
@router.post("/revoke-selected-session", response_model=MessageResponse, responses={400: _error_responses[400]})
async def revoke_selected_session(
    data: RevokeSessionRequest,
    service: AuthService = Depends(_get_service),
    current_user: dict = Depends(get_current_user),
):
    return await service.revoke_selected_session(current_user["sub"], data)
```

> [!IMPORTANT]
> Endpoint `POST /auth/register/doctor` dùng `Form(...)` + `File(...)` thay vì `Body` JSON vì cần upload file chứng chỉ (multipart/form-data). Đây là lý do trong `SCHEMAS.md` có ghi chú riêng cho endpoint này.

> [!TIP]
> **Về `_error_responses` và `ErrorResponse`:**
> - Dict `_error_responses` định nghĩa sẵn các error code phổ biến, dùng tham số `responses` của FastAPI decorator.
> - Khi mở Swagger (`/docs`), frontend dev sẽ thấy format lỗi chuẩn (gồm `error_code`, `message`, `request_id`) ngay trong tài liệu API.
> - `ErrorResponse` trong `shared/schemas.py` giờ được dùng ở **2 nơi**: exception handlers (Bước A2) và router docs (Bước B2) — đảm bảo single source of truth.

---

### Bước B3: Đăng ký Auth Router vào `app/main.py`

Thêm vào cuối file `main.py`:

```diff
+from app.modules.auth.router import router as auth_router

 # ─── Đăng ký Routers ─────────────────────────────────────────
+app.include_router(auth_router, prefix="/auth", tags=["Auth"])
```

---

### ✅ Checklist Phần B

- [ ] Sửa bug `__init` → `__init__` trong `service.py`
- [ ] Xóa import `SessionInfo` (không tồn tại trong schemas)
- [ ] Viết hàm `register()` trong service
- [ ] Viết hàm `register_doctor()` trong service
- [ ] Viết hàm `logout()` trong service
- [ ] Viết hàm `list_sessions()` trong service
- [ ] Viết hàm `revoke_all_sessions()` trong service
- [ ] Viết file `router.py` với 6 endpoints
- [ ] Đăng ký `auth_router` trong `main.py`
- [ ] Test: Chạy `uvicorn app.main:app --reload` → Mở `/docs` → Thấy 6 endpoint Auth

---

## Phần C: Thiết lập Mã hóa pgcrypto (3 bước)

### Tổng quan

Theo `DB_SCHEMAS.md`, 2 trường nhạy cảm trong bảng `profiles` cần được mã hóa:

| Cột | Dữ liệu | Lý do mã hóa |
|---|---|---|
| `phone_encrypted` | Số điện thoại | Dữ liệu cá nhân, chống rò rỉ nếu DB bị hack |
| `cccd_encrypted` | Căn cước công dân | Dữ liệu pháp lý nhạy cảm |

**Phương pháp:** Dùng `pgp_sym_encrypt()` / `pgp_sym_decrypt()` của extension `pgcrypto`. Key mã hóa được lưu trong `.env` và inject vào mỗi DB session.

---

### Bước C1: Tạo file SQL `supabase/policies/001_pgcrypto_setup.sql`

File này kích hoạt extension pgcrypto trên Supabase. Bạn cần chạy SQL này **1 lần duy nhất** trên Supabase SQL Editor (hoặc qua Alembic manual migration).

```sql
-- Kích hoạt pgcrypto extension (chạy 1 lần duy nhất)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

> [!TIP]
> Supabase đã cài sẵn pgcrypto, bạn chỉ cần `CREATE EXTENSION IF NOT EXISTS` để kích hoạt.

---

### Bước C2: Thêm `ENCRYPTION_KEY` vào `.env` và `config.py`

**Thêm vào `.env`:**
```
ENCRYPTION_KEY=your-super-secret-encryption-key-change-me-in-production
```

**Thêm vào `app/core/config.py`:**
```diff
 class Settings(BaseSettings):
     ...
     # Security
     JWT_SECRET: str
     ALGORITHM: str = "HS256"
     ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
+    ENCRYPTION_KEY: str   # Key cho pgcrypto (pgp_sym_encrypt/decrypt)
     ...
```

> [!WARNING]
> `ENCRYPTION_KEY` phải là một chuỗi bí mật đủ dài (tối thiểu 32 ký tự). **KHÔNG BAO GIỜ** commit lên Git. Nếu mất key này, tất cả dữ liệu mã hóa sẽ không thể giải mã được.

---

### Bước C3: Inject `ENCRYPTION_KEY` vào mỗi DB Session

Sửa file `app/core/database.py`, thêm 1 dòng `SET LOCAL` bên trong hàm `get_db()` để mỗi transaction đều có key mã hóa sẵn:

```diff
 async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
     async with async_session_factory() as session:
         try:
             jwt_claims = getattr(request.state, "jwt_claims", "{}")
             
             # Thiết lập RLS context
             await session.execute(
                 text("SELECT set_config('request.jwt.claims', :claims, true)"),
                 {"claims": jwt_claims}
             )
+            
+            # Thiết lập Encryption Key cho pgcrypto
+            await session.execute(
+                text("SELECT set_config('app.encryption_key', :key, true)"),
+                {"key": settings.ENCRYPTION_KEY}
+            )
             
             yield session
             await session.commit()
```

> [!IMPORTANT]
> `set_config(..., true)` nghĩa là biến này chỉ tồn tại trong **transaction hiện tại** (local). Khi transaction kết thúc, key tự mất. Điều này đảm bảo key không bị leak sang session khác.

---

### Cách dùng trong SQL Query

**Mã hóa (khi INSERT/UPDATE):**
```sql
INSERT INTO profiles (phone_encrypted, cccd_encrypted)
VALUES (
    pgp_sym_encrypt(:phone, current_setting('app.encryption_key')),
    pgp_sym_encrypt(:cccd, current_setting('app.encryption_key'))
);
```

**Giải mã (khi SELECT — ví dụ Bác sĩ tìm kiếm bệnh nhân):**
```sql
SELECT
    pgp_sym_decrypt(phone_encrypted::bytea, current_setting('app.encryption_key')) AS phone,
    pgp_sym_decrypt(cccd_encrypted::bytea, current_setting('app.encryption_key')) AS cccd
FROM profiles
WHERE pgp_sym_decrypt(phone_encrypted::bytea, current_setting('app.encryption_key')) = :search_phone;
```

> [!NOTE]
> Tìm kiếm trên trường mã hóa sẽ **chậm** vì phải giải mã từng dòng (full table scan). Với lượng dữ liệu nhỏ (< 100K records) thì không vấn đề. Nếu cần tối ưu sau này, có thể thêm cột hash để index.

---

### ✅ Checklist Phần C

- [ ] Chạy SQL `CREATE EXTENSION IF NOT EXISTS pgcrypto` trên Supabase SQL Editor
- [ ] Tạo file `supabase/policies/001_pgcrypto_setup.sql`
- [ ] Thêm `ENCRYPTION_KEY` vào `.env`
- [ ] Thêm `ENCRYPTION_KEY: str` vào `app/core/config.py`
- [ ] Sửa `app/core/database.py` — thêm `set_config('app.encryption_key', ...)` vào `get_db()`
- [ ] Kiểm tra: INSERT 1 profile → xem trong Supabase Table Editor cột `phone_encrypted` hiển thị chuỗi mã hóa (không phải plaintext)

---

## Tổng hợp: Thứ tự các file cần tạo/sửa

| # | File | Hành động | Phần |
|---|---|---|---|
| 1 | `app/middlewares/logging.py` | **Tạo mới** | A |
| 2 | `app/core/exceptions.py` | **Tạo mới** | A |
| 3 | `app/main.py` | **Sửa** — thêm logging config, middleware, exception handlers, auth router | A + B |
| 4 | `supabase/policies/001_pgcrypto_setup.sql` | **Tạo mới** + chạy trên Supabase | C |
| 5 | `.env` | **Sửa** — thêm `ENCRYPTION_KEY` | C |
| 6 | `app/core/config.py` | **Sửa** — thêm `ENCRYPTION_KEY: str` | C |
| 7 | `app/core/database.py` | **Sửa** — thêm `set_config('app.encryption_key', ...)` | C |
| 8 | `app/modules/auth/service.py` | **Sửa** — fix bug + thêm 5 hàm + dùng pgcrypto | B + C |
| 9 | `app/modules/auth/router.py` | **Viết mới** — 6 endpoints | B |

> [!TIP]
> Nên làm theo thứ tự: **A → C → B** vì service.py (Phần B) phụ thuộc vào cả logging (A) và encryption (C).
