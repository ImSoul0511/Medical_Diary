"""
Railway Cron Job Trigger
========================
Script này được Railway Cron Service gọi theo lịch định sẵn (mỗi 5 phút).
Nó gọi endpoint nội bộ /prescriptions/internal/send-reminders của backend FastAPI.

Cách chạy thủ công để test:
    python cron_trigger.py

Biến môi trường cần thiết (đặt trên Railway Dashboard):
    BACKEND_URL   : URL Railway của backend, vd. https://medical-diary-backend.up.railway.app
    JWT_SECRET    : Giá trị JWT_SECRET của backend (dùng để xác thực X-Internal-Token)
"""

import os
import sys
import httpx
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cron_trigger")


def main():
    backend_url = os.environ.get("BACKEND_URL", "").strip().rstrip("/")
    jwt_secret = os.environ.get("JWT_SECRET", "").strip()

    # Tự động loại bỏ dấu nháy đơn/nháy kép bọc ngoài JWT_SECRET nếu có
    if (jwt_secret.startswith("'") and jwt_secret.endswith("'")) or (jwt_secret.startswith('"') and jwt_secret.endswith('"')):
        jwt_secret = jwt_secret[1:-1]
    if '\\"' in jwt_secret:
        jwt_secret = jwt_secret.replace('\\"', '"')

    if not backend_url:
        logger.error("BACKEND_URL is not set. Aborting.")
        sys.exit(1)

    # Tự động thêm protocol https:// nếu người dùng quên nhập
    if not backend_url.startswith(("http://", "https://")):
        backend_url = f"https://{backend_url}"
        logger.info(f"BACKEND_URL was missing protocol. Auto-prefixed to: {backend_url}")

    if not jwt_secret:
        logger.error("JWT_SECRET is not set. Aborting.")
        sys.exit(1)

    target = f"{backend_url}/prescriptions/internal/send-reminders"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Token": jwt_secret,
    }

    logger.info(f"Triggering medication reminder job → {target}")

    try:
        # Timeout 60s để chờ backend xử lý xong toàn bộ danh sách nhắc nhở
        response = httpx.post(target, headers=headers, json={}, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        logger.info(f"Success [{response.status_code}]: {data.get('message', data)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Backend returned error [{e.response.status_code}]: {e.response.text}")
        sys.exit(1)
    except httpx.RequestError as e:
        logger.error(f"Connection error to backend: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
