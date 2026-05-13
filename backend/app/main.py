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
from app.modules.auth.router import router as auth_router 
from app.modules.users.router import router as users_router

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

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong môi trường dev có thể để tất cả, sẽ cấu hình lại khi production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. RLS Middleware (Quan trọng: Phải đứng sau CORS)
app.add_middleware(RLSMiddleware)

# 3. Logging Middleware (Phải đứng sau RLS để log được RLS context)
app.add_middleware(LoggingMiddleware)

# 4. Exception Handlers (Phải đứng sau Middleware)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
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
app.include_router(users_router)
