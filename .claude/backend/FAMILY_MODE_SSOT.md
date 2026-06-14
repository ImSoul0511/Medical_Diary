---
trigger: always_on
---

# Tài liệu Thiết kế Kỹ thuật - Chế độ Gia đình (Family Mode)

Tài liệu này mô tả chi tiết kiến trúc, luồng hoạt động, và các API liên quan đến tính năng **Family Mode** (Chế độ gia đình) và **Dependent Upgrade** (Nâng cấp/Tách tài khoản phụ thuộc).

---

## 1. Tổng quan Nghiệp vụ
Tính năng Family Mode cho phép một người dùng (Người giám hộ - Guardian) quản lý hồ sơ y tế cho người khác (Người phụ thuộc - Dependent, ví dụ: Trẻ em, người lớn tuổi).

**Đặc điểm cốt lõi:**
* Người phụ thuộc vẫn là một `User/Profile` thực thụ trong hệ thống cơ sở dữ liệu. Mọi dữ liệu y tế (vaccine, dị ứng, hồ sơ) được gắn trực tiếp vào ID của người phụ thuộc, không bị trộn lẫn với người giám hộ.
* Ban đầu, người phụ thuộc được khởi tạo dưới dạng "tài khoản ảo" (Virtual Account).
* Khi người phụ thuộc đủ khả năng tự quản lý (vd: đủ tuổi, có điện thoại/CCCD riêng), tài khoản có thể được "Tách" (Upgraded) để trở thành tài khoản độc lập, mang theo toàn bộ lịch sử y tế.

---

## 2. Kiến trúc Database (Bảng `family_members`)

Sự liên kết được quản lý bởi bảng `family_members`:
```python
class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True)
    guardian_id = Column(UUID, ForeignKey("profiles.id", ondelete="CASCADE"))
    dependent_id = Column(UUID, ForeignKey("profiles.id", ondelete="CASCADE"), unique=True)
    relationship = Column(String(50)) # Ví dụ: cha, mẹ, người giám hộ
```
*Lưu ý:* `dependent_id` là UNIQUE, nghĩa là tại một thời điểm, một người phụ thuộc chỉ có tối đa 1 người giám hộ chính thức.

---

## 3. Luồng Hoạt động (Workflows)

### 3.1. Đăng ký Người phụ thuộc (Giai đoạn Tài khoản Ảo)
* **API:** `POST /auth/register-family-member`
* **Người gọi:** Người giám hộ (đã đăng nhập).
* **Luồng xử lý:**
  1. Validate tuổi (< 15 tuổi mới được phép đăng ký dưới dạng trẻ em).
  2. Tạo **Email ảo** (`<guardian_id>_child_<random>@dependent.local`) và **Mật khẩu ngẫu nhiên**.
  3. Gọi Supabase Auth Admin để tạo tài khoản ảo.
  4. Tạo bản ghi trong bảng `profiles` (lưu Tên, Ngày sinh, Giới tính).
  5. Tạo bản ghi trong `family_members` liên kết `guardian_id` và `dependent_id`.

### 3.2. Quyền Truy cập Dữ liệu Y tế (Access Control)
Bất cứ khi nào các API y tế (như `/vaccines`, `/allergies`, `/medical-records`) nhận request thao tác trên một `target_user_id`, hệ thống sẽ kiểm tra bảo mật:
1. Có phải `current_user_id == target_user_id` không? (Tự truy cập hồ sơ mình).
2. Có bản ghi nào trong bảng `family_members` mà `guardian_id == current_user_id` VÀ `dependent_id == target_user_id` không?
Nếu thỏa mãn điều kiện 2, người giám hộ được phép xem, thêm, sửa, xóa dữ liệu trên hồ sơ của người phụ thuộc.

### 3.3. Tách Tài khoản / Nâng cấp (Dependent Upgrade)
* **API:** `POST /auth/upgrade-dependent`
* **Người gọi:** Người giám hộ (đã đăng nhập).
* **Mục đích:** Bổ sung Email, Password thật, SĐT để biến tài khoản ảo thành tài khoản độc lập.
* **Luồng xử lý:**
  1. Xác thực `current_user_id` đúng là người giám hộ của `dependent_id`.
  2. **Cập nhật Supabase Auth:** Đổi `email` ảo thành email thật do người dùng cung cấp. Đổi mật khẩu thành mật khẩu do người dùng nhập. Cài đặt `email_confirm = True`.
  3. **Cập nhật Profiles:** Mã hóa SĐT (`phone_encrypted`) và CCCD (`cccd_encrypted` - tùy chọn) bằng `pgcrypto` và lưu vào `profiles`.
  4. **Tách tài khoản:** Xóa bản ghi trong bảng `family_members`. 
Từ lúc này, quyền giám hộ bị hủy bỏ hoàn toàn. Người phụ thuộc dùng email và mật khẩu mới để đăng nhập trực tiếp vào hệ thống.

---

## 4. Các Biện pháp Bảo mật (Security Measures)

1. **Transaction & Rollback:** Trong cả API Đăng ký lẫn API Nâng cấp, việc ghi vào Database Postgres và gọi Supabase Auth được đặt trong block try/except. Nếu bất kỳ bước nào thất bại, hệ thống sẽ tự động gọi lệnh rollback Database và xóa/hoàn tác user trên Supabase để ngăn chặn tình trạng rác dữ liệu.
2. **Chống dò rỉ thông tin (No Data Leak):** CCCD và Số điện thoại khi nâng cấp được mã hóa PGP ngay từ tầng query SQL (`pgp_sym_encrypt`).
3. **Phân quyền chặt chẽ:** Việc xóa (tách) tài khoản loại bỏ triệt để bản ghi trong `family_members`, đảm bảo người lớn không thể truy cập trái phép vào hồ sơ của đứa trẻ sau khi đứa trẻ đã trưởng thành và quản lý độc lập.

---

## 5. Tham chiếu Mã nguồn
* `app/modules/users/models.py`: Định nghĩa bảng `FamilyMember`.
* `app/modules/auth/schemas.py`: `RegisterFamilyMemberRequest`, `UpgradeDependentRequest`.
* `app/modules/auth/service.py`: Chứa logic `register_family_member` và `upgrade_dependent_account`.
* `app/modules/auth/router.py`: Expose các REST endpoints cho nghiệp vụ gia đình.
