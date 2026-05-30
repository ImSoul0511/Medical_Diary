# Tài liệu Hướng dẫn Gửi Email (Email Notification Guide)

Hệ thống cung cấp một tiện ích gửi thư điện tử dùng chung để gửi email thông báo, nhắc nhở định kỳ cho bệnh nhân thông qua giao thức SMTP.

---

## 1. Cấu hình biến môi trường (.env)

Các tham số SMTP được cấu hình tại tệp `.env` ở Backend và được nạp vào lớp cấu hình `Settings` (`app/core/config.py`):
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your_email@gmail.com
```
* **Chế độ Mock (Development):** Nếu bỏ trống `SMTP_USER` hoặc `SMTP_PASSWORD`, hệ thống sẽ tự động ghi nội dung thư vào logger (`[MOCK EMAIL] Gửi đến...`) mà không ném lỗi crash ứng dụng.

---

## 2. Tiện ích Gửi Email dùng chung

Hàm gửi thư đồng bộ được định nghĩa tại:
📄 `app/shared/email.py`

```python
from app.shared.email import send_email_sync

# Chữ ký hàm:
# send_email_sync(email: str, subject: str, body: str) -> None
```

---

## 3. Cách sử dụng (Usage Patterns)

Do việc kết nối tới SMTP server là tác vụ I/O đồng bộ (blocking), chúng ta bắt buộc phải đẩy việc gửi email chạy dưới nền để tránh làm nghẽn Event Loop của FastAPI. Có 2 cách tùy theo ngữ cảnh:

### Cách A: Gửi ngầm sau khi Endpoint phản hồi thành công (BackgroundTasks)
Sử dụng khi gửi email theo yêu cầu (On-Demand) từ hành động của người dùng (ví dụ: Bác sĩ xin quyền truy cập -> Bệnh nhân nhận mail thông báo).
* **Đặc điểm:** Tác vụ gửi thư chỉ kích hoạt **sau khi** giao dịch database đã commit thành công và phản hồi HTTP 2xx đã được gửi về client.

* **Cách dùng tại Router:**
```python
from fastapi import APIRouter, BackgroundTasks, Depends
from app.modules.doctors.schemas import RequestAccessRequest

@router.post("/request-access")
async def request_access(
    data: RequestAccessRequest,
    background_tasks: BackgroundTasks, # Nhận đối tượng BackgroundTasks từ FastAPI
    service: DoctorService = Depends(_get_service),
) -> RequestAccessResponse:
    # Truyền background_tasks vào service
    return await service.request_access(data, background_tasks)
```

* **Cách dùng tại Service:**
```python
from fastapi import BackgroundTasks
from app.shared.email import send_email_sync

async def request_access(self, data: RequestAccessRequest, background_tasks: BackgroundTasks):
    # 1. Thao tác nghiệp vụ và ghi DB
    self.db.add(new_request)
    await self.db.flush() # Lưu tạm vào transaction
    
    # 2. Đăng ký tác vụ gửi mail ngầm
    background_tasks.add_task(send_email_sync, email, subject, body)
```

---

### Cách B: Gửi ngầm trong hàm không đồng bộ (asyncio.to_thread)
Sử dụng khi gửi email trong các hàm định kỳ hoặc cron job (ví dụ: quét cữ uống thuốc và gửi mail nhắc nhở tự động).

* **Cách dùng tại Service:**
```python
import asyncio
from app.shared.email import send_email_sync

async def send_scheduled_reminders(self):
    # Quét dữ liệu cần gửi...
    for row in rows:
        # Chạy hàm send_email_sync đồng bộ trong một thread pool riêng
        await asyncio.to_thread(send_email_sync, email, subject, body)
```
