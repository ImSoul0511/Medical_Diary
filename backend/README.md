# Medical Diary Backend

Hệ thống Backend cho dự án Medical Diary, sử dụng FastAPI và Supabase.

## Khởi động nhanh (Quick Start)

Để đảm bảo môi trường phát triển đồng nhất và hỗ trợ Hot-reload, dự án này **bắt buộc** chạy qua Docker.

### 1. Chuẩn bị
- Đảm bảo bạn đã có file `.env` trong thư mục `backend/` với đầy đủ các key của Supabase.
- Đã cài đặt Docker và Docker Compose.

### 2. Chạy ứng dụng
Mở terminal tại thư mục `backend/` và chạy lệnh:
```bash
docker-compose up -d --build
```

### 3. Kiểm tra Logs
Để theo dõi quá trình khởi chạy và debug:
```bash
docker logs -f medical_diary_backend
```

### 4. Truy cập API
- API: [http://localhost:8000](http://localhost:8000)
- Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

## Tài liệu liên quan
- [Thiết kế Hệ thống (SSOT)](./docs/SYSTEM_DESIGN_SSOT.md)
- [Hướng dẫn Docker chi tiết](./docs/DOCKER.md)
