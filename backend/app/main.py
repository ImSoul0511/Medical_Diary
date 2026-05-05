from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.rls import RLSMiddleware

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

@app.get("/")
async def root():
    return {"message": "Chào mừng đến với Medical Diary API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }
