import asyncio
import sys
import os

# Thêm thư mục backend vào sys.path để import được app
sys.path.append(os.getcwd())

from sqlalchemy import text
from supabase import create_client
from app.core.database import engine
from app.core.config import settings

async def check_connections():
    print("--- KIỂM TRA KẾT NỐI SUPABASE ---")
    
    # 1. Kiểm tra Database (SQLAlchemy)
    print("\n1. Kiểm tra Database (PostgreSQL)...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Kết nối Database THÀNH CÔNG!")
            print(f"   Phiên bản: {version}")
    except Exception as e:
        print(f"❌ Kết nối Database THẤT BẠI!")
        print(f"   Lỗi: {e}")

    # 2. Kiểm tra Supabase SDK
    print("\n2. Kiểm tra Supabase SDK (Auth/API)...")
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        # Thử gọi một hàm đơn giản (vd: lấy danh sách bảng - thực tế là gọi API)
        # Ở đây chỉ cần khởi tạo và check URL/Key cơ bản
        if supabase:
            print(f"✅ Khởi tạo Supabase Client THÀNH CÔNG!")
            print(f"   URL: {settings.SUPABASE_URL}")
        else:
            print(f"❌ Khởi tạo Supabase Client THẤT BẠI!")
    except Exception as e:
        print(f"❌ Lỗi SDK: {e}")

if __name__ == "__main__":
    asyncio.run(check_connections())
