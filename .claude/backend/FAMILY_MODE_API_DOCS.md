# Tài liệu API - Chế độ Gia đình (Family Mode)

Tài liệu này cung cấp đặc tả chi tiết về các API liên quan đến quản lý người phụ thuộc (Dependent).

---

## 1. Đăng ký người phụ thuộc (Tạo tài khoản ảo)

API này cho phép người giám hộ (đã đăng nhập) tạo một hồ sơ người phụ thuộc. Hệ thống sẽ tự sinh email ảo (`@dependent.local`) và mật khẩu ngẫu nhiên để phục vụ việc lưu trữ dữ liệu y tế riêng biệt.

* **URL:** `/auth/register-family-member`
* **Method:** `POST`
* **Rate Limit:** 5 requests / phút
* **Auth Required:** `Bearer Token` (Người giám hộ)

### Request Body (JSON)
```json
{
  "full_name": "Nguyễn Văn A",
  "gender": "male",
  "date_of_birth": "2015-01-01",
  "relationship": "Con trai"
}
```

* **Constraints:**
  * `full_name`: string (2 - 100 ký tự).
  * `gender`: Enum (`male` hoặc `female`).
  * `date_of_birth`: Ngày hợp lệ định dạng `YYYY-MM-DD`. Người phụ thuộc bắt buộc phải **dưới 15 tuổi**.
  * `relationship`: string (Tối đa 50 ký tự, vd: "Con trai", "Con gái", "Cháu").

### Response (Thành công - 201 Created)
```json
{
  "id": "54069eb4-c981-4752-a7c6-c36ad08bae94",
  "full_name": "Nguyễn Văn A",
  "relationship": "Con trai"
}
```

### Các Lỗi Thường Gặp (Error Responses)
* **400 Bad Request:** Lỗi dữ liệu đầu vào hoặc "Người phụ thuộc phải dưới 15 tuổi".
* **401 Unauthorized:** Token của người giám hộ bị thiếu hoặc hết hạn.

---

## 2. Tách/Nâng cấp tài khoản người phụ thuộc

API này được sử dụng khi người phụ thuộc đã đủ tuổi hoặc có số điện thoại/CCCD riêng và muốn tách ra thành một tài khoản tự quản lý độc lập. Quyền giám hộ sẽ bị xóa bỏ hoàn toàn sau khi API này thực thi thành công.

* **URL:** `/auth/upgrade-dependent`
* **Method:** `POST`
* **Rate Limit:** 5 requests / phút
* **Auth Required:** `Bearer Token` (Người giám hộ hiện tại)

### Request Body (JSON)
```json
{
  "dependent_id": "54069eb4-c981-4752-a7c6-c36ad08bae94",
  "email": "nguyenvana_thatt@gmail.com",
  "password": "MậtKhẩuĐủMạnh123",
  "phone_number": "0912345678",
  "cccd": "001203004455"
}
```

* **Constraints:**
  * `dependent_id`: UUID hợp lệ của người phụ thuộc.
  * `email`: Email thật (chưa từng được đăng ký trong hệ thống).
  * `password`: Mật khẩu mới (Tối thiểu 8 ký tự) để người phụ thuộc tự đăng nhập sau này.
  * `phone_number`: Số điện thoại thật (Regex hỗ trợ đầu số `+` hoặc số thông thường, từ 10-15 số).
  * `cccd`: (Tùy chọn) Số CMND/CCCD thật, đúng 12 chữ số.

### Response (Thành công - 200 OK)
```json
{
  "message": "Nâng cấp tài khoản thành công. Tài khoản đã được tách độc lập."
}
```

### Các Lỗi Thường Gặp (Error Responses)
* **403 Forbidden:** "Không có quyền truy cập người phụ thuộc này" (Xảy ra nếu người gọi API không phải là người giám hộ hợp lệ của `dependent_id` này).
* **400 Bad Request:** Báo lỗi từ database hoặc Supabase Auth (Vd: Email đã được sử dụng bởi một tài khoản khác).
* **422 Unprocessable Entity:** Thiếu hoặc sai định dạng UUID, Email, SĐT, hoặc mật khẩu dưới 8 ký tự.

---

## Hướng dẫn Test bằng cURL (CURL Examples)

**Đăng ký người phụ thuộc:**
```bash
curl -X 'POST' \
  'http://localhost:8000/auth/register-family-member' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <TOKEN_NGUOI_GIAM_HO>' \
  -H 'Content-Type: application/json' \
  -d '{
  "full_name": "Nguyen Van B",
  "gender": "male",
  "date_of_birth": "2015-05-20",
  "relationship": "Con"
}'
```

**Nâng cấp tài khoản:**
```bash
curl -X 'POST' \
  'http://localhost:8000/auth/upgrade-dependent' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <TOKEN_NGUOI_GIAM_HO>' \
  -H 'Content-Type: application/json' \
  -d '{
  "dependent_id": "MÃ_UUID_CỦA_ĐỨA_TRẺ",
  "email": "email.moi.cua.tre@gmail.com",
  "password": "MatKhauMoi123",
  "phone_number": "0987654321",
  "cccd": "012345678912"
}'
```
