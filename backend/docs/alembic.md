# Hướng dẫn Quản lý Database với Alembic

Tài liệu này hướng dẫn cách sử dụng Alembic để quản lý các thay đổi cấu trúc cơ sở dữ liệu (Schema) trong dự án Medical Diary.

---

## 1. Alembic là gì?
**Alembic** là một công cụ migration cho SQLAlchemy. Nó đóng vai trò giống như "Git cho Database", cho phép bạn:
- Theo dõi lịch sử thay đổi của các bảng.
- Tự động tạo mã SQL để cập nhật Database từ Python Models.
- Quay lại (Rollback) các phiên bản cũ nếu có lỗi.
- Đảm bảo tất cả thành viên trong nhóm đều có cùng một cấu trúc Database.

---

## 2. Quy trình làm việc (Workflow) chuẩn

Mỗi khi bạn cần thay đổi Database (thêm bảng, sửa cột, thêm index...), hãy làm theo các bước sau:

### Bước 1: Chỉnh sửa Models
Bạn sửa đổi cấu trúc bảng trong các file `app/modules/{module_name}/models.py`.

### Bước 2: Tạo file Migration tự động (Autogenerate)
Chạy lệnh sau để Alembic so sánh giữa code và database hiện tại để sinh ra file script:
```powershell
docker compose exec api alembic revision --autogenerate -m "mô tả thay đổi"
```
*Lưu ý: Thay "mô tả thay đổi" bằng nội dung ngắn gọn (VD: "add profiles table", "update user phone length").*

### Bước 3: Kiểm tra file script
Mở thư mục `backend/alembic/versions/`, tìm file vừa được tạo. Hãy lướt qua hàm `upgrade()` và `downgrade()` để đảm bảo Alembic nhận diện đúng ý định của bạn.

### Bước 4: Áp dụng thay đổi lên Database (Upgrade)
Sau khi kiểm tra xong, hãy chạy lệnh này để thực thi SQL lên Supabase:
```powershell
docker compose exec api alembic upgrade head
```

---

## 3. Các câu lệnh thông dụng

| Lệnh | Chức năng |
| :--- | :--- |
| `alembic revision --autogenerate -m "..."` | Tạo bản nháp migration mới dựa trên thay đổi code. |
| `alembic upgrade head` | Cập nhật database lên phiên bản mới nhất. |
| `alembic downgrade -1` | Quay lại (hủy bỏ) 1 bản cập nhật gần nhất. |
| `alembic history` | Xem lịch sử các bản migration đã tạo. |
| `alembic current` | Xem phiên bản hiện tại mà database đang đứng. |

---

## 4. Một số lưu ý quan trọng

1. **Không sửa file migration đã được commit:** Nếu bạn làm sai, hãy dùng `downgrade` rồi xóa file, hoặc tạo một bản migration mới để sửa lỗi.
2. **Kiểm tra file `.env`:** Đảm bảo `DATABASE_URL` trỏ đúng vào database bạn muốn thao tác.
3. **PYTHONPATH:** Cấu hình đã được thiết lập trong `env.py` nên bạn không cần thêm `PYTHONPATH=.` thủ công nữa.
4. **Cơ chế Hybrid:** Alembic quản lý các bảng và index chính. Các phần đặc thù của Supabase như **RLS Policies** hay **Triggers** vẫn nên được quản lý riêng trong thư mục `supabase/policies/` dưới dạng SQL thuần.
