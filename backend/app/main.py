from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging 
from app.middlewares.rls import RLSMiddleware
from app.middlewares.logging import LoggingMiddleware
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limiter import limiter

from app.modules.auth.router import router as auth_router
from app.modules.consent.router import router as consent_router
from app.modules.doctors.router import router as doctors_router
from app.modules.health_metrics.router import router as health_metrics_router
from app.modules.diaries.router import router as diaries_router
from app.modules.prescriptions.router import router as prescriptions_router
from app.modules.medical_records.router import router as medical_records_router
from app.modules.users.router import router as users_router
from app.modules.admin.router import router as admin_router
from app.modules.emergency.router import router as emergency_router
from app.modules.notifications.router import router as notifications_router

# Cấu hình Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(
    title="Medical Diary API",
    description="Backend API cho hệ thống Nhật ký Y tế Cá nhân (v2.1)",
    version="1.0.0"
)

# Gắn limiter state
app.state.limiter = limiter

# 1. CORS Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. RLS Middleware (Quan trọng: Phải đứng sau CORS)
app.add_middleware(RLSMiddleware)

# Thêm SlowAPI middleware (sau CORS, trước RLS)
app.add_middleware(SlowAPIMiddleware)

# 3. Logging Middleware (Phải đứng sau RLS để log được RLS context)
app.add_middleware(LoggingMiddleware)

# 4. Exception Handlers (Phải đứng sau Middleware)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/")
async def root():
    return {"message": "Chào mừng đến với Medical Diary API"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

app.include_router(auth_router)
app.include_router(consent_router)
app.include_router(doctors_router)
app.include_router(health_metrics_router)
app.include_router(diaries_router)
app.include_router(prescriptions_router)
app.include_router(medical_records_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(emergency_router)
app.include_router(notifications_router)
