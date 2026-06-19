# Medical Diary — Hệ thống Nhật ký Y tế & Quản lý Sức khỏe Cá nhân

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-1C1C1C?style=for-the-badge&logo=supabase&logoColor=3ECF8E)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Medical Diary** là một hệ thống toàn diện hỗ trợ người dùng theo dõi sức khỏe cá nhân, ghi nhật ký y tế, nhận diện xu hướng sức khỏe thời gian thực, quản lý đơn thuốc và chia sẻ dữ liệu y khoa bảo mật với bác sĩ. 

Hệ thống được thiết kế tối ưu với phong cách **Soft UI** hiện đại, cơ chế bảo mật đa tầng nghiêm ngặt (Row Level Security, pgcrypto, JWT + Cookie HttpOnly, Rate Limiting), kết nối bất đồng bộ và tự động hóa tác vụ thông qua Database Triggers và Cron Jobs.

---

## Tính năng Cốt lõi

### 1. Phân hệ Bệnh nhân (Patient)
*   **Trang chủ (Dashboard):** Hiển thị trực quan chỉ số đo tự động (nhịp tim, nhịp thở, số bước chân) bằng biểu đồ xu hướng. Theo dõi danh sách cữ thuốc cần uống trong ngày và xác nhận nhanh.
*   **Nhật ký Triệu chứng (Symptom Diary):** Ghi chép trạng thái thể chất bằng ngôn ngữ tự nhiên và tự đánh giá mức độ nghiêm trọng trên thang điểm 0 - 10.
*   **Chỉ số Sức khỏe (Health Metrics):** Lưu trữ lịch sử đo đạc nhập tay (huyết áp, đường huyết, SpO2, nhiệt độ, chiều cao, cân nặng) kèm loại thiết bị đo. Tự động tính toán chỉ số BMI.
*   **Hồ sơ Bệnh án (Medical Profile):** Quản lý nhóm máu, dị ứng, liên hệ khẩn cấp và tải lên tài liệu y tế cá nhân (ảnh, PDF kết quả xét nghiệm, X-quang). Hỗ trợ xuất dữ liệu ra PDF/JSON.
*   **Cài đặt Riêng tư & SOS QR Code:** 
    *   Cấu hình hiển thị thông tin khẩn cấp cứu sinh.
    *   Sinh mã QR SOS khẩn cấp động (thời hạn 1 ngày, 7 ngày, vĩnh viễn) cho phép cứu hộ viên quét xem thông tin cứu sinh mà không cần đăng nhập.
    *   Theo dõi chi tiết vết (IP, thời gian, thiết bị) mỗi lần mã QR được quét.

### 2. Phân hệ Bác sĩ (Doctor)
*   **Tìm kiếm & Quản lý:** Tìm kiếm bệnh nhân theo số điện thoại (chỉ hiển thị thông tin công khai ban đầu).
*   **Xin quyền truy cập (Consent Requests):** Yêu cầu xem dữ liệu riêng tư theo từng phạm vi (nhật ký triệu chứng, chỉ số, đơn thuốc, bệnh án).
*   **Thao tác Chuyên môn:** Sau khi được cấp quyền, bác sĩ có thể chẩn đoán bệnh án mới, kê đơn thuốc chi tiết (liều dùng, ngày bắt đầu, thời gian điều trị, các cữ giờ uống cụ thể) và tải lên tài liệu xét nghiệm y khoa.

### 3. Phân hệ Quản trị (Admin)
*   **Phê duyệt Bác sĩ:** Kiểm duyệt thông tin và tài liệu chứng chỉ hành nghề của bác sĩ đăng ký mới trước khi cho phép họ thao tác lâm sàng.
*   **Giám sát & Kiểm toán:** Theo dõi lịch sử thay đổi dữ liệu nhạy cảm thông qua Audit Logs hệ thống.

### 4. Tự động hóa & Thông báo Đa kênh
*   **Supabase Realtime (WebSockets):** Nhận thông báo tức thì trên giao diện (yêu cầu cấp quyền, cập nhật đơn thuốc...) không cần tải lại trang.
*   **Railway Cron + Resend API:** Tiến trình nền quét cữ thuốc đến hạn tự động gửi email nhắc nhở uống thuốc định kỳ mỗi 5 phút đến email của bệnh nhân.

---

## Công nghệ Sử dụng (Tech Stack)

### Frontend
*   **Thư viện chính:** React 18, TypeScript, Vite (bundler siêu tốc)
*   **Styling:** Tailwind CSS, Shadcn UI (Phong cách thiết kế Soft UI)
*   **Quản lý State:** Zustand (lưu in-memory state gọn nhẹ, tối ưu hóa re-render)
*   **Giao tiếp API:** Axios (sử dụng Interceptors tự động refresh JWT token ngầm qua HttpOnly Cookie)
*   **Biểu đồ:** Recharts

### Backend
*   **Framework:** FastAPI (Python 3.10) với lập trình bất đồng bộ nguyên bản (`async/await`)
*   **Xác thực dữ liệu:** Pydantic v2
*   **Tương tác DB:** SQLAlchemy 2.0 ORM (Async) & Alembic (DB Migrations)
*   **Giới hạn tần suất:** SlowAPI (Rate Limiting bảo vệ endpoint)
*   **Gửi Email:** Resend Python SDK kết hợp FastAPI `BackgroundTasks`

### Database & Deployment
*   **Database:** PostgreSQL (Cloud lưu trữ trên Supabase)
*   **Bảo mật DB:** Row Level Security (RLS) policies, Extension `pgcrypto` mã hóa AES-256 các cột CCCD và SĐT.
*   **Database Triggers:** Tự động tạo bản ghi cữ uống thuốc (`prescription_logs`) từ cấu hình đơn thuốc; tự động ghi vết thay đổi vào `data_access_logs`.
*   **Triển khai:** 
    *   Frontend: Triển khai liên tục trên **Vercel**
    *   Backend: Container hóa bằng **Docker** & triển khai trên **Railway**
    *   Cron Service: **Railway Cron** chạy định kỳ mỗi 5 phút kích hoạt trigger gửi email.

---

## Cấu trúc Thư mục Dự án

```text
MEDICAL_DIARY/
├── backend/                    # Mã nguồn FastAPI Backend
│   ├── app/
│   │   ├── core/               # Cấu hình chính (database, exceptions, security,...)
│   │   ├── middlewares/        # RLS và Logging middlewares
│   │   ├── shared/             # Dependencies, hàm tiện ích, gửi mail dùng chung
│   │   └── modules/            # Các module nghiệp vụ (auth, users, diaries,...)
│   ├── alembic/                # Quản lý Database Migrations
│   └── Dockerfile              # Cấu hình build Docker
├── frontend/                   # Mã nguồn React Frontend
│   ├── src/
│   │   ├── api/                # Cấu hình API client & Axios Interceptors
│   │   ├── components/         # Các UI components dùng chung (Soft UI)
│   │   ├── pages/              # Các trang chức năng (dashboard, auth, sos...)
│   │   ├── store/              # Zustand global state (authStore, notificationStore)
│   │   └── types/              # TypeScript definitions
│   └── package.json
├── README.md                   # Tài liệu hướng dẫn sử dụng chính
```

---

## Hướng dẫn Cài đặt & Vận hành Cục bộ (Local Run)

### 1. Cài đặt & Chạy Backend (FastAPI)

#### Yêu cầu hệ thống:
*   Python 3.10+
*   PostgreSQL hoặc tài khoản Supabase (PostgreSQL)

#### Các bước thực hiện:
1.  Di chuyển vào thư mục backend:
    ```bash
    cd backend
    ```
2.  Tạo và kích hoạt môi trường ảo:
    ```bash
    python -m venv venv
    # Trên Windows:
    .\venv\Scripts\activate
    # Trên macOS/Linux:
    source venv/bin/activate
    ```
3.  Cài đặt các thư viện phụ thuộc:
    ```bash
    pip install -r requirements.txt
    ```
4.  Cấu hình tệp môi trường `.env`:
    Tạo tệp `.env` tại thư mục `/backend` dựa theo mẫu sau:
    ```env
    DATABASE_URL=postgresql+asyncpg://<username>:<password>@<host>:<port>/<dbname>
    SUPABASE_URL=https://<your-project-id>.supabase.co
    SUPABASE_KEY=<your-supabase-anon-key>
    JWT_SECRET=<your-jwt-secret>
    ENCRYPTION_KEY=<your-aes-encryption-key-for-pgcrypto>
    RESEND_API_KEY=<your-resend-api-key>
    INTERNAL_TOKEN=<your-secure-internal-cron-token>
    ```
5.  Khởi chạy Database Migrations (nếu có cập nhật cấu trúc bảng):
    ```bash
    alembic upgrade head
    ```
6.  Khởi tạo các Hàm, Triggers và Realtime trên Database:
    Vì một số tính năng đặc thù (mã hóa pgcrypto, quản lý session, tự động sinh log đơn thuốc, audit logs và realtime) được thiết lập trực tiếp ở tầng cơ sở dữ liệu, bạn cần sao chép và thực thi tuần tự các tệp SQL trong thư mục `backend/supabase/policies/` (từ `001_` đến `008_`) trên **SQL Editor** của Supabase Dashboard (hoặc công cụ quản lý PostgreSQL của bạn).
7.  Chạy ứng dụng Backend:
    ```bash
    uvicorn app.main:app --reload
    ```
    *API Swagger Docs sẽ khả dụng tại:* `http://127.0.0.1:8000/docs`

---

### 2. Cài đặt & Chạy Frontend (React)

#### Yêu cầu hệ thống:
*   Node.js 18+
*   npm hoặc pnpm

#### Các bước thực hiện:
1.  Di chuyển vào thư mục frontend:
    ```bash
    cd frontend
    ```
2.  Cài đặt các gói phụ thuộc:
    ```bash
    npm install
    ```
3.  Cấu hình biến môi trường:
    Tạo tệp `.env` tại thư mục `/frontend`:
    ```env
    VITE_API_URL=http://127.0.0.1:8000
    VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
    VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
    ```
4.  Chạy ứng dụng ở chế độ phát triển:
    ```bash
    npm run dev
    ```
    *Giao diện người dùng sẽ khả dụng tại:* `http://localhost:5173`

---

## Cơ chế Bảo mật Hệ thống
1.  **Chống rò rỉ Access Token:** Access Token (JWT) được lưu hoàn toàn trên bộ nhớ `in-memory` của client (Zustand state) với thời gian hết hạn cực ngắn (15 phút). Refresh Token được lưu an toàn trong Cookie của trình duyệt với cờ `HttpOnly`, `Secure` và `SameSite=Strict`.
2.  **Row Level Security (RLS):** Middleware tại backend tự động thiết lập danh tính người dùng vào DB session thông qua câu lệnh `SET LOCAL request.jwt.claims`. Các chính sách RLS tại database sẽ tự động chặn hoặc cho phép truy vấn dựa trên chủ sở hữu hoặc bảng ủy quyền `consent_permissions`.
3.  **Mã hóa cột (pgcrypto):** Trường thông tin định danh cá nhân nhạy cảm (CCCD, SĐT) được mã hóa AES-256 ngay trong DB. Khóa giải mã được nạp vào session tạm thời qua transaction và không bao giờ lưu tĩnh tại Database.

---

## Thành viên Đóng góp (Contributors)

Dự án được phát triển và hoàn thiện bởi Nhóm 3 - Lớp 24CTT4:

| MSSV | Họ và tên | GitHub |
| :--- | :--- | :--- |
| 24120394 | Nguyễn Đặng Khôi Nguyên | [GitHub](https://github.com/username) |
| 24120085 | Lê Nguyễn Thùy Linh | [GitHub](https://github.com/username) |
| 24120370 | Trần Thị Lợi | [GitHub](https://github.com/username) |
| 24120474 | Trịnh Vỹ Triết | [GitHub](https://github.com/username) |
| 24120480 | Cái Lâm Trường | [GitHub](https://github.com/username) |

