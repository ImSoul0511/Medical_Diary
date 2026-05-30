# Cấu hình Production & Nhắc nhở URL Local

> [!IMPORTANT]
> Khi triển khai hệ thống lên môi trường Production (hoặc Staging), bắt buộc phải cập nhật các cấu hình kết nối local sang cấu hình domain thực tế để các tính năng chạy ngầm (cron jobs/triggers) và email hoạt động chính xác.

## 1. Cấu hình Database Cron Job (Supabase pg_net)

Mã nguồn SQL tại `backend/supabase/policies/007_medication_reminder_cron.sql` sử dụng các tham số cài đặt tạm thời trong Postgres. Bạn phải chạy các lệnh SQL sau trên SQL Editor của Supabase Production:

### A. URL Backend API
Thay thế URL mạng Docker local (`http://medical_diary_backend:8000`) thành URL domain API của bạn:
```sql
ALTER DATABASE postgres SET app.backend_url = 'https://api.yourproductiondomain.com';
```

### B. Khóa bảo mật JWT Secret
Thay thế khóa bảo mật tạm thời thành khóa JWT_SECRET thực tế được cấu hình trên Backend của bạn:
```sql
ALTER DATABASE postgres SET app.jwt_secret = 'your-actual-production-jwt-secret-key';
```

---

## 2. Biến môi trường Backend (file `.env` hoặc Config Provider)

Đảm bảo các biến môi trường sau được cấu hình chính xác:

*   `DATABASE_URL`: Đường dẫn kết nối trực tiếp đến Postgres Production (Supabase connection string có chứa password).
*   `JWT_SECRET`: Khóa bí mật dùng để tạo và xác thực token người dùng (phải trùng khớp với `app.jwt_secret` ở phần 1).
*   `ENCRYPTION_KEY`: Khóa mã hóa thông tin nhạy cảm của người dùng (SĐT, CCCD) bằng thuật toán mã hóa đối xứng.

### SMTP Cấu hình gửi Email Nhắc nhở:
Cung cấp các thông tin tài khoản SMTP thực tế để hệ thống có thể gửi email thật cho bệnh nhân thay vì ghi log `[MOCK EMAIL]`:
*   `SMTP_HOST` (ví dụ: `smtp.gmail.com`, `smtp.resend.com`)
*   `SMTP_PORT` (ví dụ: `587` hoặc `465`)
*   `SMTP_USER`
*   `SMTP_PASSWORD`
*   `SMTP_FROM` (ví dụ: `noreply@yourdomain.com`)

---

## 3. Cấu hình Frontend (URL Scan QR Khẩn cấp)

Tại Frontend, khi sinh mã QR khẩn cấp, URL chứa token quét phải được trỏ đến tên miền Web chính thức:
`https://yourproductiondomain.com/emergency-scan?token=emg_xxxx`
