# Hướng dẫn Docker - Medical Diary Backend

Tài liệu này hướng dẫn cách thiết lập Docker cho môi trường phát triển (Development).

## 1. Các file cấu hình

### .dockerignore
__pycache__
*.pyc
.env
venv/
.git
.vscode/

### Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

EXPOSE 8000

# Chạy với reload để hỗ trợ Volumes trong lúc code
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

### docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    container_name: medical_diary_backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./app:/code/app
    restart: unless-stopped

## 2. Cách sử dụng

### Khởi chạy lần đầu hoặc khi đổi thư viện
docker compose up -d --build

### Chạy Database Migration (lần đầu hoặc khi có model mới)
docker compose exec api alembic upgrade head

### Tạo migration mới khi sửa models
docker compose exec api alembic revision --autogenerate -m "mô tả thay đổi"

### Xem Log để Debug
docker logs -f medical_diary_backend

### Dừng hệ thống
docker compose down

## 3. Tại sao dùng cấu hình này?
* **Volumes (`./app:/code/app`)**: Giúp bạn sửa code ở máy thật và Container nhận ngay lập tức mà không cần build lại Image.
* **Env File**: Tự động nạp các Key của Supabase Cloud từ file `.env`.
* **Reload**: FastAPI sẽ tự động khởi động lại server bên trong container khi phát hiện thay đổi file từ Volume.