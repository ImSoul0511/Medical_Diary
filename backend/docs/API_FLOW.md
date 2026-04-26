# Luồng tương tác API (API Integration Flows) - Medical Diary

Tài liệu này mô tả trình tự gọi các API (Sequence) cho các nghiệp vụ cốt lõi trong hệ thống. Nó giúp Frontend Developer và AI Agents hiểu rõ "kịch bản" giao tiếp giữa Client và Server.

---

## 1. Luồng Xác thực & Quản lý Quyền riêng tư (User Onboarding Flow)

Đây là luồng cơ bản nhất khi một bệnh nhân mới bắt đầu sử dụng ứng dụng: đăng ký, đăng nhập và thiết lập giới hạn bảo mật ngay từ đầu.

```mermaid
sequenceDiagram
    participant FE as Frontend (App/Web)
    participant Auth as API: /auth
    participant User as API: /users

    FE->>Auth: POST /auth/register (Tạo tài khoản)
    Auth-->>FE: 201 Created (Chưa có Token)
    
    FE->>Auth: POST /auth/login (Đăng nhập)
    Auth-->>FE: 200 OK (Trả về JWT Token)
    
    Note over FE,User: Lưu JWT vào LocalStorage/Cookie
    
    FE->>User: GET /users/me (Gửi kèm Bearer Token)
    User-->>FE: 200 OK (Trả về Profile & Privacy Settings)
    
    FE->>User: PATCH /users/privacy (Thiết lập show_blood_type, show_allergies, ...)
    User-->>FE: 200 OK (Cập nhật thành công)

    Note over FE,Auth: Khi User muốn đăng xuất
    
    FE->>Auth: POST /auth/logout (Đăng xuất thiết bị hiện tại)
    Auth-->>FE: 200 OK (Invalidate session hiện tại)
```

---

## 2. Luồng Ủy quyền Y tế (Doctor Consent Flow)

Đây là luồng phức tạp và quan trọng nhất của hệ thống, thể hiện quy trình Bác sĩ phải xin phép trước khi được đụng vào hồ sơ của Bệnh nhân.

```mermaid
sequenceDiagram
    participant DocFE as App Bác sĩ
    participant PatFE as App Bệnh nhân
    participant DocAPI as API: /doctors
    participant ConAPI as API: /consent
    participant MedAPI as API: /medical-records

    DocFE->>DocAPI: GET /doctors/search-patients?phone=0123...&cccd=0123... (Tìm bệnh nhân)
    DocAPI-->>DocFE: 200 OK (Trả về thông tin cơ bản: Tên, ID)

    DocFE->>DocAPI: POST /doctors/request-access (Xin quyền xem hồ sơ)
    DocAPI-->>DocFE: 201 Created (Trạng thái: Pending)
    
    Note over DocAPI,PatFE: Hệ thống Notification báo cho Bệnh nhân
    
    PatFE->>ConAPI: GET /consent/access-requests (Xem danh sách xin quyền)
    ConAPI-->>PatFE: 200 OK (Thấy request của Bác sĩ)
    
    PatFE->>ConAPI: PATCH /consent/access-requests/{id} (Action: APPROVED)
    ConAPI-->>PatFE: 200 OK (Cấp quyền thành công)

    Note over DocFE,MedAPI: Bác sĩ giờ đã có quyền truy cập
    
    DocFE->>MedAPI: GET /medical-records/{patient_id}
    MedAPI-->>DocFE: 200 OK (Supabase RLS cho phép lấy dữ liệu)
```

---

## 3. Luồng Khám bệnh & Kê đơn (Medical Examination Flow)

Sau khi Bác sĩ đã được Bệnh nhân cấp quyền (từ Luồng 2), quy trình khám bệnh thực tế sẽ diễn ra như sau:

```mermaid
sequenceDiagram
    participant DocFE as App Bác sĩ
    participant PatFE as App Bệnh nhân
    participant Vitals as API: /health-metrics
    participant Diary as API: /diaries
    participant Med as API: /medical-records
    participant Rx as API: /prescriptions

    Note over DocFE,Vitals: Bác sĩ xem dữ liệu bệnh nhân (cần consent scope tương ứng)

    DocFE->>Vitals: GET /health-metrics?patient_id={id} (Xem dữ liệu đo lường)
    Note over Vitals: Kiểm tra: hasRole("doctor") + consent scope (heart_rate, step_count, respiratory_rate)
    Vitals-->>DocFE: 200 OK (Lịch sử nhịp tim, bước chân, nhịp thở)

    DocFE->>Diary: GET /diaries?patient_id={id} (Xem nhật ký bệnh nhân)
    Note over Diary: Kiểm tra: hasRole("doctor") + consent scope "diaries"
    Diary-->>DocFE: 200 OK (Ghi chép + đánh giá triệu chứng)

    Note over DocFE,Med: Bác sĩ tạo chẩn đoán & kê đơn (KHÔNG cần consent)
    
    DocFE->>Med: POST /medical-records (Tạo chẩn đoán chính thức + attachments ảnh)
    Med-->>DocFE: 201 Created (Ghi nhận bệnh án)
    
    DocFE->>Rx: POST /prescriptions (Tạo vỏ đơn thuốc)
    Rx-->>DocFE: 201 Created (Trả về prescription_id)
    
    DocFE->>Rx: POST /prescriptions/{id}/items (Thêm loại thuốc)
    Rx-->>DocFE: 201 Created (Lưu chi tiết loại thuốc)
    
    Note over Rx,PatFE: DB Trigger tự động tạo prescription_logs (dựa trên số ngày và khung giờ, status = untaken)
    Note over Rx,PatFE: Bệnh nhân nhận được đơn thuốc
    
    PatFE->>Rx: GET /prescriptions (Xem đơn thuốc mới nhất)
    Rx-->>PatFE: 200 OK (Chi tiết liều dùng)

    PatFE->>Rx: GET /prescription-logs?prescription_id={id} (Xem danh sách ngày uống thuốc)
    Rx-->>PatFE: 200 OK (Mỗi ngày 1 bản ghi, tất cả status = untaken)
    
    PatFE->>Rx: PATCH /prescription-logs/{log_id} (status: "taken")
    Rx-->>PatFE: 200 OK (Đánh dấu đã uống ngày hôm nay)

    Note over PatFE,Rx: Nếu lỡ ấn nhầm, User có thể hoàn tác
    
    PatFE->>Rx: PATCH /prescription-logs/{log_id} (status: "untaken")
    Rx-->>PatFE: 200 OK (Hoàn tác thành công)
```

---

## 4. Luồng Truy cập Khẩn cấp (Emergency Access Flow)

Áp dụng khi Bệnh nhân gặp tai nạn, cấp cứu viên (không cần tài khoản) quét mã QR để lấy thông tin nhóm máu, dị ứng.

```mermaid
sequenceDiagram
    participant PatFE as App Bệnh nhân
    participant EmgFE as Web Cấp cứu (Public)
    participant EmgAPI as API: /emergency
    participant DB as Supabase DB

    Note over PatFE,EmgAPI: Bệnh nhân tạo sẵn mã QR khi ra đường
    PatFE->>EmgAPI: POST /emergency/token (Tạo mã QR TTL 30 phút)
    EmgAPI-->>PatFE: 201 Created (Trả về Token)

    Note over PatFE,EmgAPI: User quản lý QR token
    PatFE->>EmgAPI: GET /emergency/tokens (Xem tất cả QR đã tạo)
    EmgAPI-->>PatFE: 200 OK (Danh sách token + trạng thái)

    PatFE->>EmgAPI: PATCH /emergency/tokens/{id} (Sửa TTL — gia hạn/rút ngắn)
    EmgAPI-->>PatFE: 200 OK (Cập nhật thành công)
    
    Note over EmgFE,EmgAPI: Cấp cứu viên quét mã QR
    EmgFE->>EmgAPI: GET /emergency/access/{token}
    
    EmgAPI->>DB: Truy vấn profiles (Lọc theo privacy_settings)
    EmgAPI->>DB: Ghi vào emergency_access_logs (thời điểm quét)
    
    DB-->>EmgAPI: Trả về các trường User bật trong privacy_settings
    EmgAPI-->>EmgFE: 200 OK (Hiển thị Nhóm máu, Dị ứng, SĐT người nhà tùy cấu hình)

    Note over PatFE,EmgAPI: User xem lịch sử quét QR
    PatFE->>EmgAPI: GET /emergency/tokens/history
    EmgAPI-->>PatFE: 200 OK (Danh sách thời điểm quét từng token)
```

---

## 5. Luồng Quản trị viên (Admin Audit Flow)

Luồng dành cho Admin hệ thống để kiểm tra xem có Bác sĩ nào lạm dụng quyền hạn hay không.

```mermaid
sequenceDiagram
    participant AdminFE as Admin Dashboard
    participant AdminAPI as API: /admin
    participant DB as Supabase DB

    AdminFE->>AdminAPI: GET /admin/doctors/pending (Xem bác sĩ chờ duyệt)
    AdminAPI-->>AdminFE: 200 OK (Danh sách bác sĩ)
    
    AdminFE->>AdminAPI: PATCH /admin/doctors/{id}/verify (Duyệt chứng chỉ)
    AdminAPI-->>AdminFE: 200 OK (Bác sĩ được phép hoạt động)
    
    AdminFE->>AdminAPI: GET /admin/audit-logs?action=SELECT (Tra cứu truy cập)
    AdminAPI->>DB: Truy vấn bảng data_access_logs
    DB-->>AdminAPI: Trả về lịch sử DB Trigger đã bắt lại
    AdminAPI-->>AdminFE: 200 OK (Danh sách ai đã xem hồ sơ nào, lúc mấy giờ)
```