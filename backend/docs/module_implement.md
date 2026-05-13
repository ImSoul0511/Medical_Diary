---
trigger: always_on
---

# Hướng dẫn Tạo Module Mới — Agent Workflow Guide

Tài liệu này hướng dẫn AI Agents quy trình từng bước khi được yêu cầu tạo một module mới trong dự án Medical Diary Backend.

---

## 0. Nguyên tắc Chung (Golden Rules)

> **ĐỌC TRƯỚC KHI LÀM.** Luôn đọc các tài liệu tham khảo trước khi viết bất kỳ dòng code nào.

1. **Tat ca cac function phai la `async`.**
2. **Khong tu y quyet dinh.** Neu co bat ky su mo ho, mau thuan, hay thieu thong tin nao --> **hoi user truoc**.
3. **Supabase la tai khoan free-tier.** Luon kiem tra gioi han cua Supabase Free Tier truoc khi dung bat ky tinh nang nao (Storage limit, Auth rate limit, RPC limit, v.v.).
4. **Neu can quyen admin cua Supabase** (VD: tao RPC function, trigger, RLS policy) --> Tao file `.sql` trong `supabase/policies/` va yeu cau user chay tren SQL Editor cua Supabase Dashboard.
5. **Luon cap nhat tai lieu** sau khi thay doi code (SCHEMAS.md, API.md, SYSTEM_DESIGN_SSOT.md, v.v.).
6. **KHONG duoc tu chay cac lenh install hoac tac vu he thong.** Neu can cai dat dependency (`pip install`, `npm install`, v.v.) hoac chay bat ky lenh nao tren terminal --> **chi duoc huong dan user tu chay**. Agent khong duoc tu dong thuc thi cac lenh nay.
7. **KHONG su dung emoji** trong code (.py, .sql, v.v.) va trong cac file tai lieu (.md). Dung ky tu ASCII thuan (VD: dung `[x]` thay vi checkbox emoji, dung `-->`  thay vi mui ten emoji, dung `(Da hoan thanh)` thay vi dau tick emoji).

---

## 1. Bước 0: Tạo Implementation Plan (BẮT BUỘC)

> **⚠️ KHÔNG được viết code trước khi user duyệt plan.**

Trước khi triển khai bất kỳ thứ gì, agent **phải** tạo một Implementation Plan và trình cho user xác nhận. Plan phải bao gồm:

1. **Tên module** và mục đích.
2. **Danh sách file sẽ tạo/sửa** (với đường dẫn đầy đủ).
3. **Danh sách schemas** (Request/Response) sẽ định nghĩa.
4. **Danh sách service functions** sẽ implement.
5. **Danh sách endpoints** (method, path, auth requirement, roles).
6. **Các thay đổi cần thiết ở `main.py`** (import + `include_router`).
7. **Các file tài liệu sẽ cập nhật** (SCHEMAS.md, API.md, v.v.).
8. **Các rủi ro / câu hỏi mở** (nếu có).

**Chỉ khi user xác nhận "OK" hoặc tương đương → mới bắt đầu code.**

---

## 2. Thứ tự Xây dựng Module

```
schemas.py → service.py → router.py → main.py (gắn router)
```

Tuân thủ nghiêm ngặt thứ tự trên. Không nhảy bước.

---

## 3. Bước 1: Schemas (`schemas.py`)

### 3.1. Tài liệu tham khảo BẮT BUỘC

Đọc file [`docs/SCHEMAS.md`](../docs/SCHEMAS.md) để:
- Xem các schema đã được thiết kế sẵn cho module cần implement.
- Đảm bảo đúng tên class, tên field, kiểu dữ liệu, và validation rules.

### 3.2. Quy tắc

- **Tuân thủ SCHEMAS.md làm source of truth.** Nếu phát hiện mâu thuẫn giữa SCHEMAS.md và code hiện tại → **hỏi user**.
- **Không tự thêm/bớt fields** so với SCHEMAS.md mà không hỏi user.
- Nếu trong quá trình implement phát sinh nhu cầu tạo schema mới → **hỏi user trước** rồi mới tạo, sau đó cập nhật `SCHEMAS.md`.
- Sử dụng `Literal` cho các giá trị enum thay vì `str` đơn thuần khi có thể.
- Import `BaseModel`, `Field` từ `pydantic`; `UUID` từ `uuid`; `datetime`, `date` từ `datetime`.

### 3.3. Code mẫu (Tham khảo `auth/schemas.py`)

```python
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID 
from datetime import datetime, date
from typing import List, Optional, Literal

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserBrief(BaseModel):
    id: UUID
    role: str  # user / doctor / admin 

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBrief 
```

---

## 4. Bước 2: Service (`service.py`)

### 4.1. Tài liệu tham khảo BẮT BUỘC

- [`docs/SYSTEM_DESIGN_SSOT.md`](../docs/SYSTEM_DESIGN_SSOT.md) — Hiểu kiến trúc hybrid (SQLAlchemy cho DB, Supabase cho Auth/Storage).
- [`docs/API_FLOW.md`](../docs/API_FLOW.md) — Hiểu luồng nghiệp vụ.

### 4.2. Setup Logger (BẮT BUỘC — Làm đầu tiên)

Mỗi service **phải** có logger riêng. Đặt ngay đầu file, trước class definition:

```python
import logging

logger = logging.getLogger("medical_diary")
```

### 4.3. Quy tắc Logger

- **Mọi function phải có logger TRƯỚC lệnh `return`.**
- Dùng `logger.info()` cho hành động thành công.
- Dùng `logger.warning()` cho lỗi nghiệp vụ (VD: sai password).
- Dùng `logger.error()` cho lỗi hệ thống / exception.
- Format: `logger.info(f"<Hành động>: <context>")`.

### 4.4. Quy tắc Async

- **Mọi function phải là `async def`.**
- Mọi thao tác DB phải dùng `await`.
- Mọi thao tác I/O (file, network) phải dùng `await` nếu có.

### 4.5. Kiến trúc Service

```python
import logging
from fastapi import HTTPException
from supabase import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.modules.<module_name>.schemas import (
    # Import các schema cần thiết
)
from app.shared.schemas import MessageResponse

logger = logging.getLogger("medical_diary")

class <ModuleName>Service:
    def __init__(self, db: AsyncSession, supabase: Client):
        self.db = db
        self.supabase = supabase

    async def some_function(self, data: SomeRequest) -> SomeResponse:
        try:
            # ... business logic ...
            
            logger.info(f"Action completed: {context}")  # ← Logger TRƯỚC return
            return SomeResponse(...)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Action failed: {e}")
            raise HTTPException(status_code=400, detail="Mô tả lỗi cho user.")
```

### 4.6. Supabase Free-Tier Constraints

Trước khi dùng bất kỳ tính năng Supabase nào, kiểm tra:

| Tính năng | Giới hạn Free Tier |
|---|---|
| Database | 500 MB |
| Storage | 1 GB |
| Auth | 50,000 MAU |
| Edge Functions | 500K invocations/month |
| Realtime | 200 concurrent connections |
| API Requests | Không giới hạn (nhưng rate-limited) |

Nếu function cần tính năng vượt giới hạn → **báo user** và đề xuất phương án thay thế.

### 4.7. Khi cần quyền Admin Supabase (RPC, Trigger, Policy)

Nếu service cần gọi một RPC function hoặc tạo trigger/policy mới:

1. Tạo file SQL: `supabase/policies/<tên_mô_tả>.sql`
2. Viết nội dung SQL đầy đủ, có comment giải thích.
3. **Yêu cầu user chạy file SQL trên Supabase Dashboard → SQL Editor.**
4. Sau khi user xác nhận đã chạy → mới tiếp tục implement service function liên quan.

### 4.8. Khi cần Schema mới

Nếu trong quá trình implement service, phát hiện cần thêm schema mới:

1. **Dừng lại**, mô tả schema mới cho user.
2. Chờ user xác nhận.
3. Thêm schema vào `schemas.py`.
4. **Cập nhật `docs/SCHEMAS.md`** ngay lập tức.

---

## 5. Bước 3: Router (`router.py`)

### 5.1. Tài liệu tham khảo BẮT BUỘC

Đọc các file sau để xác định chính xác endpoint, method, auth, và authorization:

| File | Mục đích |
|---|---|
| [`docs/API.md`](../docs/API.md) | Endpoint chi tiết, request/response mẫu |
| [`docs/API_FLOW.md`](../docs/API_FLOW.md) | Luồng tương tác giữa các API |
| [`docs/SYSTEM_DESIGN_SSOT.md`](../docs/SYSTEM_DESIGN_SSOT.md) | Danh sách endpoint tổng quan + auth requirement |

### 5.2. Import chuẩn

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client

# Database dependency
from app.core.database import get_db

# Auth & Authorization dependencies
from app.shared.dependencies import get_current_user, get_supabase_client, require_role

# Shared response schemas (cho error, message, pagination)
from app.shared.schemas import ErrorResponse, MessageResponse, PaginatedResponse

# Module-specific schemas
from app.modules.<module_name>.schemas import (
    # Import các schema cần thiết
)

# Module service
from app.modules.<module_name>.service import <ModuleName>Service
```

### 5.3. Error Responses chuẩn

Định nghĩa dict chung cho error responses (dùng `ErrorResponse` từ `app/shared/schemas.py`):

```python
_error_responses = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}
```

### 5.4. Service Factory (Dependency Injection)

Tạo helper function để inject dependencies vào service:

```python
def _get_service(
    db: AsyncSession = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
) -> <ModuleName>Service:
    return <ModuleName>Service(db=db, supabase=supabase)
```

### 5.5. Router khởi tạo (Prefix TRONG router)

**Quan trọng:** Prefix cho endpoint được khai báo ngay trong file `router.py`, **KHÔNG phải** trong `main.py`.

```python
router = APIRouter(prefix="/<module_prefix>", tags=["<ModuleDisplayName>"])
```

### 5.6. Authentication & Authorization

Dùng các dependency từ `app/shared/dependencies.py`:

| Cần gì? | Dependency | Cách dùng |
|---|---|---|
| Xác thực user đăng nhập | `get_current_user` | `current_user: dict = Depends(get_current_user)` |
| Phân quyền theo role | `require_role(["doctor", "admin"])` | `current_user: dict = Depends(require_role(["doctor"]))` |
| Không cần auth (Public) | Không thêm dependency | Bỏ trống |

**Kiểm tra trong `API.md` và `SYSTEM_DESIGN_SSOT.md`** để xác định:
- Endpoint nào là Public?
- Endpoint nào yêu cầu Auth?
- Endpoint nào yêu cầu role cụ thể?

### 5.7. Endpoint Pattern

```python
# Public endpoint (không cần auth)
@router.post("/login", response_model=LoginResponse, responses={401: _error_responses[401]})
async def login(
    request: LoginRequest,
    service: <ModuleName>Service = Depends(_get_service)
) -> LoginResponse:
    return await service.login(request)

# Authenticated endpoint (cần đăng nhập)
@router.get("/me", response_model=SomeResponse, responses={401: _error_responses[401]})
async def get_me(
    current_user: dict = Depends(get_current_user),
    service: <ModuleName>Service = Depends(_get_service)
) -> SomeResponse:
    return await service.get_profile(current_user["sub"])

# Role-restricted endpoint (cần role cụ thể)
@router.post("/create", response_model=SomeResponse, status_code=201,
             responses={403: _error_responses[403]})
async def create_something(
    data: SomeRequest,
    current_user: dict = Depends(require_role(["doctor"])),
    service: <ModuleName>Service = Depends(_get_service)
) -> SomeResponse:
    return await service.create(data, current_user["sub"])
```

### 5.8. Response Models

- Dùng `response_model=` để khai báo kiểu trả về.
- Dùng `MessageResponse` từ `app/shared/schemas.py` cho các endpoint trả message đơn giản.
- Dùng `PaginatedResponse[T]` từ `app/shared/schemas.py` cho các endpoint có phân trang.
- Khai báo `status_code=201` cho các endpoint tạo mới (POST create).

---

## 6. Bước 4: Gắn Router vào `main.py`

### 6.1. Thêm import

```python
from app.modules.<module_name>.router import router as <module_name>_router
```

### 6.2. Gắn router (ở cuối file, sau các router khác)

```python
app.include_router(<module_name>_router)
```

### 6.3. Lưu ý quan trọng

- **KHÔNG thêm prefix ở `main.py`** — prefix đã được khai báo trong `router.py`.
- Đặt `include_router` ở **cuối file**, sau exception handlers.
- Giữ thứ tự import nhất quán với các router đã có.

### 6.4. Code mẫu (Tham khảo `main.py` hiện tại)

```python
# ... (các import và middleware đã có) ...
from app.modules.auth.router import router as auth_router
from app.modules.<new_module>.router import router as <new_module>_router  # ← Thêm dòng này

# ... (các middleware và exception handlers) ...

app.include_router(auth_router)
app.include_router(<new_module>_router)  # ← Thêm dòng này
```

---

## 7. Bước 5: Cập nhật Tài liệu (BẮT BUỘC)

Sau khi hoàn thành code, **phải** cập nhật các tài liệu liên quan:

| Thay đổi | File cần cập nhật |
|---|---|
| Thêm/sửa schema | `docs/SCHEMAS.md` |
| Thêm/sửa endpoint | `docs/API.md` |
| Thêm luồng nghiệp vụ mới | `docs/API_FLOW.md` |
| Thay đổi kiến trúc | `docs/SYSTEM_DESIGN_SSOT.md` |
| Thêm SQL mới (RPC, trigger) | `supabase/policies/<file>.sql` |

---

## 8. Checklist Tổng hợp

Trước khi báo cáo "hoàn thành" cho user, kiểm tra:

- [ ] Implementation Plan đã được user duyệt.
- [ ] `schemas.py` — Đúng với `SCHEMAS.md`. Không có schema tự thêm chưa được duyệt.
- [ ] `service.py` — Có logger. Logger chạy trước mỗi `return`. Tất cả function là `async`.
- [ ] `service.py` — Đã kiểm tra Supabase Free-Tier constraints.
- [ ] `service.py` — Nếu cần admin SQL → đã tạo file `.sql` và yêu cầu user chạy.
- [ ] `router.py` — Dùng `get_db` từ `app/core/database.py`.
- [ ] `router.py` — Dùng `get_current_user` / `require_role` từ `app/shared/dependencies.py`.
- [ ] `router.py` — Dùng `ErrorResponse`, `MessageResponse`, `PaginatedResponse` từ `app/shared/schemas.py`.
- [ ] `router.py` — Auth/Authorization đúng với `API.md` và `SYSTEM_DESIGN_SSOT.md`.
- [ ] `router.py` — Prefix khai báo trong `router.py`, không phải `main.py`.
- [ ] `main.py` — Đã import và `include_router`.
- [ ] Tài liệu — Đã cập nhật `SCHEMAS.md`, `API.md`, và các docs liên quan.
- [ ] Không có quyết định nào được tự ý đưa ra mà chưa hỏi user.

---

## 9. Tham chiếu nhanh (Quick Reference)

| Cần gì? | File | Import |
|---|---|---|
| Database session | `app/core/database.py` | `from app.core.database import get_db` |
| Xác thực user | `app/shared/dependencies.py` | `from app.shared.dependencies import get_current_user` |
| Phân quyền role | `app/shared/dependencies.py` | `from app.shared.dependencies import require_role` |
| Supabase client | `app/shared/dependencies.py` | `from app.shared.dependencies import get_supabase_client` |
| Error response | `app/shared/schemas.py` | `from app.shared.schemas import ErrorResponse` |
| Message response | `app/shared/schemas.py` | `from app.shared.schemas import MessageResponse` |
| Paginated response | `app/shared/schemas.py` | `from app.shared.schemas import PaginatedResponse` |
| Schema definitions | `docs/SCHEMAS.md` | (Tài liệu tham khảo) |
| Endpoint specs | `docs/API.md` | (Tài liệu tham khảo) |
| API flows | `docs/API_FLOW.md` | (Tài liệu tham khảo) |
| System architecture | `docs/SYSTEM_DESIGN_SSOT.md` | (Tài liệu tham khảo) |
