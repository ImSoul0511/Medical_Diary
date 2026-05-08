import logging
from fastapi import Request 
from fastapi.responses import JSONResponse 
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.shared.schemas import ErrorResponse 

logger = logging.getLogger("medical_diary")

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Bắt mọi HTTPException (401, 403, 404, ...)"""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.warning(
        f"[{request_id}] HTTP EXCEPTION {exc.status_code}: {exc.detail}"
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