import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.rate_limiter import limiter
from app.modules.auth.router import router as auth_router

app = FastAPI(
    title="Medical Diary API",
    description="Backend API cho hệ thống Nhật ký Y tế Cá nhân",
    version="1.0.0",
)

# Rate limiter
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Bắt lỗi khi slowapi từ chối request vượt giới hạn tần suất (vd: login quá 5 lần/phút).
    Chuẩn hóa response về format lỗi chung thay vì trả plain text mặc định của slowapi.
    """
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error_code": "RATE_LIMIT_EXCEEDED",
            "message": "Quá nhiều yêu cầu, vui lòng thử lại sau",
            "request_id": request_id,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """
    Bắt lỗi validation Pydantic (sai kiểu, thiếu field, vi phạm constraint).
    Ghi đè handler mặc định của FastAPI (trả list errors dài) để trả về
    format lỗi chuẩn hóa, nhất quán với mọi lỗi khác trong hệ thống.
    """
    request_id = getattr(request.state, "request_id", "")
    first_error = exc.errors()[0] if exc.errors() else {}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": first_error.get("msg", "Dữ liệu không hợp lệ"),
            "request_id": request_id,
        },
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID injection
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """
    Gắn một UUID duy nhất vào mỗi request trước khi xử lý.

    `request.state.request_id` được các exception handler đọc để đưa vào
    trường `request_id` của error response — giúp debug và trace log
    khi cần tìm lại một request cụ thể trong hệ thống.
    UUID cũng được gắn vào response header `X-Request-ID` để client log lại phía họ.
    """
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


# Routers
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Chào mừng đến với Medical Diary API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
