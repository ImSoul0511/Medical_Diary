# Báo Cáo Triển Khai: Module Users (Self-service)

## 1. Tổng quan
Module Users là trung tâm quản lý thông tin định danh và hồ sơ cá nhân của người dùng trên hệ thống Medical Diary. Module này cho phép người dùng tự quản lý dữ liệu (Self-service), thiết lập quyền riêng tư và xuất dữ liệu cá nhân (Export), tuân thủ các nguyên tắc bảo mật cơ bản.

## 2. Các tính năng và triển khai chính

### 2.1. Quản lý Hồ sơ Cá nhân (Profile Management)
- Triển khai các API `GET /users/me` và `PATCH /users/me` cho phép người dùng xem và cập nhật thông tin cá nhân cơ bản (họ tên, ngày sinh, nhóm máu, dị ứng, liên hệ khẩn cấp).
- **Kiến trúc Service Layer:** Tuân thủ chặt chẽ nguyên tắc chỉ sử dụng `AsyncSession` để thao tác trực tiếp với cơ sở dữ liệu PostgreSQL, không phụ thuộc vào Supabase Client ở lớp này. Các bản ghi sử dụng cơ chế Soft-delete (kiểm tra `deleted_at IS NULL`).

### 2.2. Quản lý Quyền riêng tư (Privacy Settings)
- Tách biệt logic cập nhật hồ sơ và cập nhật quyền riêng tư để tăng tính bảo mật và dễ quản lý.
- Thiết kế API `PATCH /users/privacy` chuyên biệt để cấu hình ẩn/hiện các thông tin nhạy cảm (nhóm máu, dị ứng, liên hệ khẩn cấp) với các bên thứ ba (bác sĩ, người dùng khác). Dữ liệu này được lưu trữ hiệu quả dưới dạng JSONB trong PostgreSQL.

### 2.3. Xuất Dữ liệu Y tế (Data Export)
- Phát triển API `GET /users/me/export` hỗ trợ xuất toàn bộ hồ sơ y tế theo tham số `format`.
- **Hỗ trợ định dạng JSON:** Xuất dữ liệu dưới dạng máy đọc được, tối ưu cho việc tích hợp hoặc sao lưu cá nhân.
- **Hỗ trợ định dạng PDF:** Tích hợp thư viện `reportlab` (module `Platypus`) để xuất hồ sơ định dạng PDF chuyên nghiệp. File PDF được thiết kế sẵn layout bảng biểu (Table), bố cục rõ ràng, hỗ trợ font chữ tiếng Việt (Roboto) và thiết kế riêng một vị trí trống kích thước 4x6 cm để dán ảnh thẻ, tương tự hồ sơ khám bệnh thực tế.

### 2.4. Tìm kiếm Bác sĩ và Lịch sử Truy cập
- Tích hợp tính năng cho bệnh nhân tìm kiếm các bác sĩ đã được xác thực trên hệ thống (`GET /users/search-doctors`), hỗ trợ lọc theo tên và chuyên khoa.
- Xây dựng nền tảng API cho chức năng xem "Ai đã xem hồ sơ của tôi" (`GET /users/me/access-history`), đọc dữ liệu từ bảng audit log (`data_access_logs`), sẵn sàng cho việc tích hợp DB Trigger ghi nhận lịch sử tự động ở các giai đoạn sau.

## 3. Các quyết định kỹ thuật đáng chú ý
- **Bảo toàn dữ liệu xuất khẩu:** Logic xuất file PDF/JSON được thiết kế để luôn truy xuất 100% dữ liệu y tế gốc của người dùng, không bị ảnh hưởng hay che giấu bởi `privacy_settings`. (Cài đặt quyền riêng tư chỉ áp dụng khi phân quyền hiển thị cho người khác).
- **Trải nghiệm người dùng trong báo cáo:** Mã hóa các key tiếng Anh thành tiếng Việt chuẩn hóa (vd: `blood_type` -> `Nhóm máu (Blood Type)`) ngay tại Service layer để tạo ra văn bản PDF thân thiện nhất với người dùng Việt Nam.
