---
trigger: always
---

# Kế hoạch triển khai UI - Medical Diary

Ngày lập kế hoạch: 20/05/2026  
Phạm vi: tài liệu triển khai frontend, không tái cấu trúc hoặc viết code ứng dụng trong lượt này.

## 1. Nguồn tham khảo và nguyên tắc bắt buộc

### 1.1. Nguồn đã đọc

- `Medical Diary Design System/`: app Figma Make dùng để tham khảo visual, route demo, component density và design token. UI đã chạy được tại `http://127.0.0.1:5173/`.
- `frontend_images/`: 22 ảnh chụp desktop 2560x1600, dùng như screenshot Figma MCP giả lập.
- `.antigravity/frontend/mcp-figma-rule.md`: quy trình Figma MCP được áp dụng bằng cách mô phỏng qua thư mục Figma Make và ảnh chụp, vì file Figma Make không dùng MCP trực tiếp được.
- `.antigravity/backend/API_FLOW.md`: luồng onboarding, consent bác sĩ, khám bệnh/kê đơn, QR cấp cứu, admin audit.
- `.antigravity/backend/SYSTEM_DESIGN_SSOT.md`: context hệ thống, role, data visibility, security, RLS, soft-delete, hybrid SQLAlchemy + Supabase.
- `.antigravity/backend/API.md`, `.antigravity/backend/SCHEMAS.md`, `.antigravity/backend/DB_SCHEMAS.md`: request/response mẫu, schema Pydantic, DB tables.
- `backend/app/modules/**/router.py` và `backend/app/modules/**/schemas.py`: endpoint và schema thực tế đang có trong code.

### 1.2. Ràng buộc triển khai

- Stack frontend: ReactTS + NodeJS + TailwindCSS.
- Quản lý state toàn cục: Zustand.
- Routing nội bộ: `react-router-dom`.
- Chỉ dùng `Medical Diary Design System` làm tài nguyên tham khảo. Không bê nguyên cấu trúc `src/app/screens/vn`, `components/ui` hoặc cách tổ chức Figma Make vào frontend thật.
- Frontend thật phải tuân thủ cấu trúc thư mục đã yêu cầu trong mục 4.
- Nghiêm cấm đặt tên file, folder, module, component, hook, store, service, type, constant bằng tiếng Việt hoặc tiếng Việt không dấu. Tất cả tên kỹ thuật phải dùng tiếng Anh theo PascalCase/camelCase/kebab-case phù hợp; tiếng Việt chỉ dùng cho nội dung hiển thị trong UI.
- Backend hiện là FastAPI, nhưng frontend service layer vẫn đặt dưới `src/services/` để gọi API qua HTTP. "NodeJS" ở frontend nên hiểu là runtime/tooling cho React/Vite, không thay thế backend hiện tại.

### 1.3. Quy tắc đối chiếu backend code và docs

- Agent triển khai frontend bắt buộc đọc `backend/app/modules/**/router.py` và `backend/app/modules/**/schemas.py` đã được triển khai trước khi nối UI/service tới bất kỳ endpoint nào. Router và schema thực tế trong backend là nguồn ưu tiên để xác định path, method, request, response, auth/role và validation.
- Các tài liệu trong `.antigravity/backend/` và `backend/docs/` chỉ dùng để tham khảo nghiệp vụ, flow và endpoint dự kiến. Không được lấy docs làm nguồn cuối cùng nếu backend đã có router/schema khác.
- Trong mỗi phiên làm việc, với endpoint chưa được triển khai trong backend hoặc module router/schema còn rỗng, agent được follow tài liệu trong docs để dựng UI/service interface tạm thời, nhưng phải đánh dấu endpoint đó là `planned` hoặc `pending backend`.
- Mỗi khi triển khai frontend cho một endpoint mới, agent phải check lại module backend tương ứng xem `schemas.py` và `router.py` đã được thêm/sửa khác với phần frontend đang làm không. Điều này đặc biệt quan trọng nếu frontend từng tham khảo docs trong lúc chờ backend triển khai.
- Nếu phát hiện docs và backend code khác nhau, frontend phải theo backend code đã triển khai và ghi chú chênh lệch trong tài liệu hoặc comment task liên quan.
- Mọi task triển khai có liên quan đến Supabase SDK ở frontend hoặc thay đổi cách gọi Supabase trực tiếp đều phải confirm lại với người dùng trước khi thực hiện. Mặc định frontend gọi backend API qua `src/services/`; không tự ý thêm Supabase SDK, Supabase client, Realtime subscription, Storage upload trực tiếp từ frontend nếu chưa được xác nhận.

## 2. Định hướng UI từ Figma Make và screenshots

### 2.1. Tinh thần giao diện

Giao diện là dashboard y tế tiếng Việt, ưu tiên scan nhanh, ít trang trí, rõ trạng thái và nhiều dữ liệu dạng bảng/card/chart. Không làm landing page marketing cho app chính. First screen sau login là công cụ sử dụng thật: dashboard bệnh nhân, màn hình bác sĩ hoặc dashboard admin theo role.

Các pattern quan sát được:

- Login dùng split layout: panel màu lớn bên trái, form đăng nhập bên phải.
- App shell dùng sidebar cố định 256px, top header 56px, content padding 24px.
- Patient/doctor dùng nền rất nhạt `#F8FAFC` với sidebar tối `#0F172A`.
- Admin dùng nền cyan nhạt `#E0F2FE`, vẫn giữ sidebar tối.
- Emergency public view là màn hình đỏ toàn trang, typography lớn, ít thông tin nhưng cực kỳ rõ.
- Card dashboard có border/radius nhẹ, shadow mỏng, dùng chart và badge để giảm tải đọc.

### 2.2. Không copy cấu trúc Figma Make

Không tạo frontend theo dạng:

```text
src/app/screens/vn/*
src/app/components/ui/*
ScreenNavigationVN.tsx
```

Frontend thật sẽ chỉ lấy:

- Token màu, spacing, radius, typography.
- Tên flow nghiệp vụ và route concept.
- Component behavior: sidebar, topbar, card, tabs, badge, switch, table, QR preview, chart.
- Nội dung tiếng Việt làm gợi ý microcopy.

## 3. Design tokens đề xuất cho TailwindCSS

### 3.1. Màu chính

| Token | Hex | Dùng cho |
|---|---:|---|
| `primary` | `#0284C7` | CTA chính, patient active nav, link, chart huyết áp |
| `primaryDark` | `#0369A1` | Gradient/header patient dashboard |
| `secondary` | `#0F172A` | Sidebar, text heading đậm |
| `accent` | `#0D9488` | Doctor flow, step count, chỉ số tích cực |
| `background` | `#F8FAFC` | Nền app patient/doctor |
| `card` | `#FFFFFF` | Card, form, table container |
| `muted` | `#F1F5F9` | Row hover, input section, subtle panels |
| `mutedForeground` | `#64748B` | Text phụ, label phụ |
| `border` | `#E2E8F0` | Border card/input/table |
| `inputBackground` | `#FFFFFF` | Input nền trắng |
| `ring` | `#0284C7` | Focus ring |

### 3.2. Màu trạng thái

| Token | Hex | Dùng cho |
|---|---:|---|
| `emergency` | `#DC2626` | QR cấp cứu, dị ứng, badge nguy hiểm, destructive action |
| `success` | `#16A34A` | Đồng ý consent, uống thuốc xong, approve doctor |
| `pending` | `#EA580C` | Chờ duyệt, thuốc chưa đủ, warning nhẹ |
| `warning` | `#F59E0B` | Chart/cảnh báo trung tính |
| `infoBg` | `#EFF6FF` | Alert thông tin, health stat background |
| `successBg` | `#DCFCE7` | Badge bình thường/thành công |
| `dangerBg` | `#FEF2F2` | Icon/badge nguy hiểm |
| `warningBg` | `#FEF3C7` | Badge pending |

### 3.3. Admin palette

| Token | Hex | Dùng cho |
|---|---:|---|
| `adminPrimary` | `#0077B6` | Admin CTA, icon chính |
| `adminSecondary` | `#005F8C` | Hover/active admin |
| `adminAccent` | `#004E73` | Nhấn sâu |
| `adminBackground` | `#E0F2FE` | Nền dashboard admin |
| `adminMuted` | `#BAE6FD` | Text/sidebar accent admin |

### 3.4. Chart palette

| Token | Hex | Dùng cho |
|---|---:|---|
| `chartHeart` | `#DC2626` | Nhịp tim |
| `chartBloodPressure` | `#0284C7` | Huyết áp |
| `chartSteps` | `#0D9488` | Bước chân |
| `chartRespiratory` | `#7C3AED` | Nhịp thở/SpO2 |
| `chartWarning` | `#F59E0B` | Cảnh báo/thuốc |

### 3.5. Typography

- Font chính: `Inter`.
- Font fallback: `Roboto`, `system-ui`, `sans-serif`.
- Base HTML font size: `16px`.
- Scale:
  - `h1`: `24px`, weight 600-700, line-height 1.5.
  - `h2`: `20px`, weight 600.
  - `h3`: `16px`, weight 600.
  - `body`: `14px`, weight 400.
  - `small`: `12px`, weight 400-500.
  - Micro label/badge: `10px` hoặc `11px`.
- Không scale font bằng viewport width. Text trong card/table cần giữ nhỏ, dễ scan.

### 3.6. Spacing, padding, radius

Base grid: 4px.

| Token | Giá trị | Dùng cho |
|---|---:|---|
| `space.1` | `4px` | Icon/text gap nhỏ |
| `space.2` | `8px` | Gap inline, badge padding |
| `space.3` | `12px` | Sidebar nav padding, form gap nhỏ |
| `space.4` | `16px` | Card compact padding, grid gap nhỏ |
| `space.5` | `20px` | Logo/sidebar section padding |
| `space.6` | `24px` | Page padding desktop, card roomy padding |
| `space.8` | `32px` | Section margin, auth form top gap |
| `space.10` | `40px` | Auth panel spacing |
| `space.12` | `48px` | Desktop auth/layout large padding |

Responsive padding:

- Mobile page: `px-4 py-4`.
- Tablet page: `px-5 py-5`.
- Desktop app shell: `p-6`.
- Auth desktop: `p-12`.

Radius:

- Card: `8px`.
- Input/select/textarea: `6px`.
- Button: `6px` hoặc `8px` tùy size.
- Logo tile: `10px` đến `12px`.
- Avatar: full circle.
- Không dùng card lồng card nếu chỉ cần section layout.

### 3.7. Tailwind theme nên cấu hình

```ts
// tailwind.config.ts - định hướng token, không phải code cuối cùng bắt buộc
theme: {
  extend: {
    colors: {
      primary: "#0284C7",
      primaryDark: "#0369A1",
      secondary: "#0F172A",
      accent: "#0D9488",
      background: "#F8FAFC",
      card: "#FFFFFF",
      muted: "#F1F5F9",
      mutedForeground: "#64748B",
      border: "#E2E8F0",
      emergency: "#DC2626",
      success: "#16A34A",
      pending: "#EA580C",
      adminPrimary: "#0077B6",
      adminBackground: "#E0F2FE",
    },
    borderRadius: {
      card: "8px",
      input: "6px",
    },
    fontFamily: {
      sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
    },
  },
}
```

## 4. Cấu trúc thư mục frontend bắt buộc

Tạo frontend thật trong `frontend/`, không đặt trong `Medical Diary Design System/`.

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── FormInput.tsx
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── Badge.tsx
│   │   ├── StatCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── EmptyState.tsx
│   │   └── QRPreview.tsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   ├── PatientDashboard.tsx
│   │   │   ├── DoctorSearch.tsx
│   │   │   ├── DoctorPatientDetail.tsx
│   │   │   ├── DoctorPrescription.tsx
│   │   │   ├── AdminDoctorApproval.tsx
│   │   │   └── AdminAuditLogs.tsx
│   │   ├── Profile/
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── PrivacySettings.tsx
│   │   │   ├── ConsentManagement.tsx
│   │   │   └── EmergencyPublicView.tsx
│   │   ├── Diary/
│   │   │   └── DiaryPage.tsx
│   │   ├── HealthMetrics/
│   │   │   └── HealthMetricsPage.tsx
│   │   └── Login/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       └── AdminLoginPage.tsx
│   ├── hooks/
│   │   ├── useFetch.ts
│   │   ├── useConsent.ts
│   │   └── useNotifications.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── consentStore.ts
│   │   ├── medicalStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── doctors.ts
│   │   ├── healthMetrics.ts
│   │   ├── diaries.ts
│   │   ├── consent.ts
│   │   ├── medicalRecords.ts
│   │   ├── prescriptions.ts
│   │   ├── emergency.ts
│   │   ├── admin.ts
│   │   └── notifications.ts
│   ├── constants/
│   │   ├── endpoints.ts
│   │   ├── routes.ts
│   │   ├── roles.ts
│   │   └── consentScopes.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── consent.ts
│   │   ├── medical.ts
│   │   ├── emergency.ts
│   │   ├── admin.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── qr.ts
│   │   ├── validation.ts
│   │   └── format.ts
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

Ghi chú: các màn doctor/admin vẫn nằm trong `pages/Dashboard/` để giữ đúng các top-level folder người dùng yêu cầu, thay vì tạo thêm `pages/Doctors` hoặc `pages/Admin`.

## 5. Routing và page mapping

| Route frontend | Page | Role | Backend chính |
|---|---|---|---|
| `/` | `Login/LoginPage` | Public | `POST /auth/login` |
| `/dang-ky` | `Login/RegisterPage` | Public | `POST /auth/register`, `POST /auth/register-doctor` |
| `/quan-tri/dang-nhap` | `Login/AdminLoginPage` | Public/Admin | `POST /auth/login` |
| `/trang-chu` | `Dashboard/PatientDashboard` | User | `/users/me`, `/health-metrics`, `/prescriptions`, `/diaries`, `/medical-records/me` |
| `/nhat-ky-trieu-chung` | `Diary/DiaryPage` | User | `GET/POST/DELETE /diaries` |
| `/chi-so-suc-khoe` | `HealthMetrics/HealthMetricsPage` | User | `GET/POST /health-metrics` |
| `/ho-so-benh-an` | `Profile/ProfilePage` | User | `/users/me`, `/medical-records/me`, `/prescriptions`, `/users/me/export` |
| `/quan-ly-cap-quyen` | `Profile/ConsentManagement` | User | `/consent/access-requests`, `/consent/history`, `/consent/revoke/{doctor_id}` |
| `/cai-dat-quyen-rieng-tu` | `Profile/PrivacySettings` | User | `GET /users/me`, `PATCH /users/privacy` |
| `/cap-cuu/:token` | `Profile/EmergencyPublicView` | Public | `GET /emergency/access/{token}` - cần backend |
| `/bac-si/tim-kiem` | `Dashboard/DoctorSearch` | Doctor | `GET /doctors/search-patients`, `POST /doctors/request-access` - cần backend |
| `/bac-si/benh-nhan/:patientId` | `Dashboard/DoctorPatientDetail` | Doctor | Doctor read endpoints - Phase 4B |
| `/bac-si/tao-don-thuoc/:patientId` | `Dashboard/DoctorPrescription` | Doctor | `POST /medical-records`, `POST /prescriptions`, `POST /prescriptions/{id}/items` - cần backend |
| `/quan-tri/phe-duyet-bac-si` | `Dashboard/AdminDoctorApproval` | Admin | `/admin/doctors/pending`, `/admin/doctors/{id}/verify` - cần backend |
| `/quan-tri/nhat-ky-kiem-toan` | `Dashboard/AdminAuditLogs` | Admin | `/admin/audit-logs` - cần backend |

## 5.1. Quy chuẩn đặt tên kỹ thuật

Không đặt tên tiếng Việt cho bất kỳ phần tử kỹ thuật nào. Dùng tiếng Anh nhất quán:

- File component/page: PascalCase, ví dụ `PatientDashboard.tsx`, `PrivacySettings.tsx`, `EmergencyPublicView.tsx`.
- Hook: camelCase bắt đầu bằng `use`, ví dụ `useConsent.ts`, `useNotifications.ts`.
- Store/service/type/constant: camelCase hoặc domain noun tiếng Anh, ví dụ `authStore.ts`, `healthMetrics.ts`, `consentScopes.ts`.
- Folder: PascalCase cho page groups theo yêu cầu (`Dashboard`, `Profile`, `Diary`, `HealthMetrics`, `Login`), hoặc kebab/camel theo pattern dự án nếu mở rộng sau.
- Route URL có thể dùng tiếng Việt không dấu theo UX hiện tại như `/trang-chu`, nhưng tên file/module xử lý route vẫn phải là tiếng Anh.
- Text tiếng Việt chỉ xuất hiện trong label, placeholder, toast, error message, heading hiển thị cho người dùng.

## 6. Zustand store plan

### 6.1. `authStore`

State:

- `accessToken: string | null`
- `tokenType: "bearer" | string`
- `user: { id: string; role: "user" | "doctor" | "admin" } | null`
- `isAuthenticated: boolean`
- `isHydrated: boolean`
- `sessions: SessionResponse[]`

Actions:

- `login(email, password)`
- `register(payload)`
- `registerDoctor(formData)`
- `logout()`
- `revokeAll(password)`
- `revokeSelectedSession(sessionId, password)`
- `loadSessions()`
- `hydrateFromStorage()`

Storage:

- Ưu tiên lưu token trong memory + localStorage cho MVP.
- Khi backend hỗ trợ cookie httpOnly thì chuyển token storage sang cookie/session.

### 6.2. `userStore`

State:

- `profile: UserProfileResponse | null`
- `privacySettings`
- `accessHistory: AccessHistoryItem[]`
- `doctorSearchResults: DoctorPublicResponse[]`

Actions:

- `loadMe()`
- `updateProfile(payload)`
- `updatePrivacy(payload)`
- `loadAccessHistory()`
- `searchDoctors({ name, specialty })`
- `exportData({ format, scope })`

### 6.3. `consentStore`

State:

- `pendingRequests: AccessRequestItem[]`
- `activePermissions: ConsentHistoryItem[]`
- `selectedScopes: string[]`

Actions:

- `loadPendingRequests()`
- `approveRequest(requestId, approvedScope, expiresInDays)`
- `rejectRequest(requestId)`
- `loadConsentHistory()`
- `revokeDoctor(doctorId)`

### 6.4. `medicalStore`

State:

- `healthMetrics: HealthMetricResponse[]`
- `diaries: DiaryResponse[]`
- `medicalRecords: MedicalRecordResponse[]`
- `prescriptions: PrescriptionResponse[]`
- `prescriptionLogsByPrescriptionId: Record<string, PrescriptionLogResponse[]>`

Actions:

- `createMetric(payload)`
- `loadMetrics({ start, end })`
- `createDiary(payload)`
- `loadDiaries()`
- `deleteDiary(diaryId)`
- `loadMedicalRecords()`
- `loadPrescriptions()`
- `loadPrescriptionLogs(prescriptionId)`
- `updatePrescriptionLogStatus(logId, status)`

### 6.5. `notificationStore`

State:

- `items: NotificationResponse[]`
- `unreadCount: number`

Actions:

- `loadNotifications()`
- `markAsRead(id)`
- `subscribeRealtime()` - sau khi Supabase Realtime endpoint ổn định.

### 6.6. `uiStore`

State:

- `sidebarCollapsed`
- `currentRoleTheme`
- `toastQueue`
- `globalLoading`
- `lastError`

Actions:

- `setRoleTheme(role)`
- `toggleSidebar()`
- `setGlobalLoading(value)`
- `setError(error)`

## 7. API client và error handling

### 7.1. API client chuẩn

`services/apiClient.ts` cần:

- Đọc `VITE_API_BASE_URL`.
- Tự gắn `Authorization: Bearer <token>` nếu có.
- Set `Content-Type: application/json` cho JSON request.
- Không set `Content-Type` khi gửi `FormData` cho `register-doctor`.
- Chuẩn hóa lỗi theo backend:

```ts
type ErrorResponse = {
  error_code: string;
  message: string;
  request_id: string;
};
```

- Nếu `401`: clear authStore và redirect login.
- Nếu `403`: hiện state "không đủ quyền" hoặc "chưa được cấp consent".
- Nếu `422`: map lỗi validation vào field form.
- Với `StreamingResponse` export file: xử lý blob và filename từ `Content-Disposition`.

### 7.2. Endpoint constants

`constants/endpoints.ts` nên tách rõ:

- `implementedEndpoints`: endpoint đã có router thực tế.
- `plannedEndpoints`: endpoint đã có trong docs nhưng backend chưa implement/include.

Điều này tránh frontend gọi nhầm endpoint chưa tồn tại trong MVP.

## 8. Endpoint cần thiết theo module

### 8.1. Core

| Method | Path | Auth | Request | Response | Trạng thái |
|---|---|---|---|---|---|
| `GET` | `/` | Public | none | `{ message: string }` | Có trong `main.py` |
| `GET` | `/health` | Public | none | `{ status: "healthy", version: string }` | Có trong `main.py` |

### 8.2. Auth

| Method | Path | Auth | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | Public | `{ email: EmailStr, password: string >= 8 }` | `{ access_token, token_type, user: { id, role } }` | Login bệnh nhân/bác sĩ/admin |
| `POST` | `/auth/register` | Public | `{ email, phone_number, password, full_name, gender, date_of_birth }` | `{ message }` | Register bệnh nhân |
| `POST` | `/auth/register-doctor` | Public multipart | `email`, `phone_number`, `password`, `full_name`, `date_of_birth`, `gender`, `cccd`, `license_number`, `specialty`, `hospital`, `certificate_file` | `{ id, full_name, status, certificate_url }` | Register bác sĩ |
| `POST` | `/auth/logout` | Bearer | none | `{ message }` | Logout |
| `POST` | `/auth/revoke-all` | Bearer | `{ password }` | `{ message }` | Đăng xuất mọi thiết bị |
| `GET` | `/auth/sessions` | Bearer | none | `{ sessions: SessionResponse[] }` | Quản lý phiên |
| `POST` | `/auth/revoke-selected-session` | Bearer | `{ session_id, password }` | `{ message }` | Hủy phiên cụ thể |

Lưu ý UI: sau `register` backend không trả token, phải điều hướng người dùng về login.

### 8.3. Users

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/users/me` | Bearer | none | `UserProfileResponse` | Dashboard/Profile/Privacy |
| `PATCH` | `/users/me` | Bearer | `UserProfileUpdateRequest` partial | `UserProfileResponse` | Cập nhật hồ sơ |
| `PATCH` | `/users/privacy` | Bearer | `{ show_blood_type?, show_allergies?, show_emergency_contact? }` | `dict` privacy settings | Cài đặt QR public view |
| `GET` | `/users/me/export?format=json|pdf&scope=...` | Bearer | query | file stream | Export dữ liệu |
| `GET` | `/users/me/access-history` | Bearer | none | `AccessHistoryItem[]` | Lịch sử ai xem dữ liệu |
| `GET` | `/users/search-doctors?name=&specialty=` | Bearer role `user` | query optional | `DoctorPublicResponse[]` | Tìm bác sĩ |

Schema chính:

```ts
type UserProfileResponse = {
  id: string;
  full_name: string;
  gender: string;
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
  privacy_settings: Record<string, boolean>;
};
```

### 8.4. Consent

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/consent/access-requests` | Bearer role `user` | none | `AccessRequestItem[]` | Quản lý cấp quyền - yêu cầu chờ duyệt |
| `PATCH` | `/consent/access-requests/{request_id}` | Bearer role `user` | `{ action: "approved" | "rejected", approved_scope?: string[], expires_in_days?: number }` | `{ message }` | Đồng ý/từ chối |
| `POST` | `/consent/revoke/{doctor_id}` | Bearer role `user` | none | `{ message }` | Rút quyền |
| `GET` | `/consent/history` | Bearer role `user` | none | `ConsentHistoryItem[]` | Danh sách bác sĩ đang có quyền |

Scope hợp lệ:

```text
blood_type, allergies, emergency_contact,
medical_records, prescriptions, diaries,
heart_rate, step_count, respiratory_rate
```

UI nên map label:

- `blood_type`: Nhóm máu
- `allergies`: Dị ứng
- `emergency_contact`: SĐT khẩn cấp
- `medical_records`: Hồ sơ bệnh án
- `prescriptions`: Đơn thuốc
- `diaries`: Nhật ký triệu chứng
- `heart_rate`: Nhịp tim
- `step_count`: Bước chân
- `respiratory_rate`: Nhịp thở

### 8.5. Health Metrics

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `POST` | `/health-metrics` | Bearer role `user` | `{ heart_rate?, step_count?, respiratory_rate?, recorded_at }` | `HealthMetricResponse` | Nhập/sync chỉ số |
| `GET` | `/health-metrics?start=&end=` | Bearer role `user` | query optional ISO datetime | `HealthMetricResponse[]` | Dashboard charts |

Validation:

- `heart_rate`: 30-250.
- `step_count`: >= 0.
- `respiratory_rate`: 5-60.
- Ít nhất một chỉ số phải có giá trị.

Docs có `patient_id` cho bác sĩ xem bệnh nhân, nhưng router hiện ghi rõ chưa hỗ trợ Phase 4B.

### 8.6. Diaries

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `POST` | `/diaries` | Bearer role `user` | `{ content?: string, symptoms?: { name, severity }[] }` | `DiaryResponse` | Tạo nhật ký |
| `GET` | `/diaries` | Bearer role `user` | none | `DiaryResponse[]` | Danh sách nhật ký |
| `DELETE` | `/diaries/{diary_id}` | Bearer role `user` | none | `204 No Content` | Soft-delete nhật ký |

UI notes:

- Severity dùng thang 1-10.
- Form phải chặn submit nếu cả `content` và `symptoms` đều trống.
- Xóa chỉ là soft-delete ở backend, UI nên optimistic remove nhưng rollback nếu lỗi.

### 8.7. Medical Records

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/medical-records/me` | Bearer role `user` | none | `MedicalRecordResponse[]` | Bệnh nhân xem hồ sơ |

Endpoint có trong docs nhưng chưa có router thực tế:

| Method | Path | Request | Response | UI phụ thuộc |
|---|---|---|---|---|
| `GET` | `/medical-records/{user_id}` | path user id | `MedicalRecordResponse[]` | Bác sĩ xem bệnh án sau consent |
| `POST` | `/medical-records` | `{ patient_id, diagnosis, notes?, attachments? }` | `MedicalRecordResponse` | Bác sĩ tạo bệnh án |

### 8.8. Prescriptions

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/prescriptions` | Bearer role `user` | none | `PrescriptionResponse[]` | Bệnh nhân xem đơn thuốc |
| `GET` | `/prescription-logs?prescription_id={id}` | Bearer role `user` | query `prescription_id` | `PrescriptionLogResponse[]` | Lịch uống thuốc |
| `PATCH` | `/prescription-logs/{log_id}` | Bearer role `user` | `{ status: "taken" | "skipped" | "untaken" }` | `PrescriptionLogResponse` | Đánh dấu uống thuốc |

Endpoint có trong docs nhưng chưa có router thực tế:

| Method | Path | Request | Response | UI phụ thuộc |
|---|---|---|---|---|
| `POST` | `/prescriptions` | `{ patient_id, notes? }` | prescription id/object | Bác sĩ tạo vỏ đơn |
| `POST` | `/prescriptions/{id}/items` | `{ medication_name, dosage, duration_days, scheduled_times }` | prescription item | Bác sĩ thêm thuốc |
| `DELETE` | `/prescriptions/{id}` | none | `204 No Content` | Xóa mềm đơn |

UI notes:

- `scheduled_times` hiển thị dạng `HH:mm`, backend response log có thể là `HH:MM:SS`.
- `taken_at` chỉ có khi status là `taken`.
- DB trigger tạo log uống thuốc sau khi thêm `prescription_items`, nên UI cần reload logs sau khi tạo thuốc.

### 8.9. Doctors - cần backend hoàn thiện

Theo docs/API_FLOW nhưng router hiện rỗng.

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/doctors/search-patients?phone=&cccd=` | Bearer role `doctor` | query | `{ id, full_name }[]` | Bác sĩ tìm bệnh nhân |
| `POST` | `/doctors/request-access` | Bearer role `doctor` | `{ patient_id, requested_scope, reason }` | `{ status: "pending", message }` | Gửi yêu cầu consent |

UI behavior khi backend chưa có:

- Vẫn thiết kế form và service method.
- Disable submit hoặc hiện toast "Tính năng đang chờ backend" tùy môi trường.
- Không hardcode mock vào store chính, chỉ dùng fixture trong Storybook/test nếu cần.

### 8.10. Emergency - cần backend hoàn thiện

Theo docs/API_FLOW nhưng router hiện rỗng.

| Method | Path | Auth | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `POST` | `/emergency/token` | Bearer role `user` | `{ ttl_minutes?: number | null }` | `{ emergency_token, expires_at }` | Tạo QR |
| `GET` | `/emergency/tokens` | Bearer role `user` | none | `EmergencyTokenItem[]` | Quản lý QR |
| `PATCH` | `/emergency/tokens/{id}` | Bearer role `user` | `{ ttl_minutes?: number | null }` | token updated | Gia hạn/rút ngắn |
| `DELETE` | `/emergency/tokens/{id}` | Bearer role `user` | none | `204` hoặc `{ message }` | Vô hiệu hóa QR |
| `GET` | `/emergency/access/{token}` | Public | token path | `{ full_name, blood_type?, allergies?, emergency_contact? }` | Public emergency view |
| `GET` | `/emergency/tokens/history` | Bearer role `user` | none | `EmergencyAccessLogItem[]` | Lịch sử quét |

Emergency public UI:

- Nền `#DC2626` toàn trang.
- H1 lớn, chữ trắng.
- Card trắng cho nhóm máu, dị ứng, bệnh lý, người liên hệ.
- CTA `Gọi ngay` màu success `#16A34A`, CTA `Gọi cấp cứu 115` nổi bật.
- Không yêu cầu login.

### 8.11. Admin - cần backend hoàn thiện

Theo docs/API_FLOW nhưng router hiện rỗng.

| Method | Path | Auth/Role | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/admin/doctors/pending` | Admin + IP allowlist | query optional pagination | `PendingDoctorResponse[]` | Phê duyệt bác sĩ |
| `PATCH` | `/admin/doctors/{id}/verify` | Admin | `{ action: "approved" | "rejected", notes? }` | `{ message }` | Duyệt/từ chối |
| `GET` | `/admin/audit-logs?action=&user_id=&date_from=` | Admin | filters | paginated `AuditLogItem` | Nhật ký kiểm toán |

Admin UI:

- Nền `adminBackground`.
- Sidebar vẫn tối, active dùng `adminPrimary`.
- Table dense, sticky header nếu danh sách dài.
- Hành động nguy hiểm dùng outline đỏ, duyệt dùng success solid.

### 8.12. Notifications - cần backend hoàn thiện

Theo docs nhưng router hiện rỗng.

| Method | Path | Auth | Request | Response | UI dùng |
|---|---|---|---|---|---|
| `GET` | `/notifications?page=&limit=` | Bearer | query | `PaginatedResponse<NotificationResponse>` | Bell dropdown |
| `PATCH` | `/notifications/{id}/read` | Bearer | none | `{ message }` | Đánh dấu đã đọc |

Notification types:

- `access_request`
- `prescription_new`
- `prescription_reminder`
- `emergency_token_expired`

## 9. Flow tích hợp theo API_FLOW

### 9.1. Onboarding bệnh nhân

1. User mở `/dang-ky`.
2. FE gọi `POST /auth/register`.
3. Backend trả `{ message }`, chưa có token.
4. FE chuyển về `/`.
5. FE gọi `POST /auth/login`.
6. Lưu token vào `authStore`, gọi `GET /users/me`.
7. Nếu thiếu thiết lập quyền riêng tư, điều hướng `/cai-dat-quyen-rieng-tu`.
8. User cập nhật QR public fields bằng `PATCH /users/privacy`.

### 9.2. Doctor consent

1. Doctor đăng nhập, vào `/bac-si/tim-kiem`.
2. FE gọi endpoint planned `GET /doctors/search-patients`.
3. Doctor chọn scope: `diaries`, `heart_rate`, `step_count`, `respiratory_rate`, `medical_records`, `prescriptions`, hoặc public fields.
4. FE gọi planned `POST /doctors/request-access`.
5. Patient nhận notification, vào `/quan-ly-cap-quyen`.
6. FE gọi `GET /consent/access-requests`.
7. Patient approve/reject qua `PATCH /consent/access-requests/{id}`.
8. Doctor chỉ đọc được dữ liệu private sau khi backend consent/RLS cho phép.

### 9.3. Bệnh nhân ghi dữ liệu sức khỏe

1. Dashboard load `GET /health-metrics`, `GET /diaries`, `GET /prescriptions`, `GET /medical-records/me`.
2. User thêm chỉ số: `POST /health-metrics`.
3. User viết nhật ký: `POST /diaries`.
4. User xóa nhật ký: `DELETE /diaries/{id}`.
5. User cập nhật uống thuốc: `PATCH /prescription-logs/{log_id}`.

### 9.4. Khám bệnh và kê đơn

1. Doctor được consent, vào chi tiết bệnh nhân.
2. Planned: gọi `GET /health-metrics?patient_id={id}`, `GET /diaries?patient_id={id}`, `GET /medical-records/{user_id}`.
3. Doctor tạo bệnh án bằng planned `POST /medical-records`.
4. Doctor tạo đơn bằng planned `POST /prescriptions`.
5. Doctor thêm thuốc bằng planned `POST /prescriptions/{id}/items`.
6. Patient dashboard reload `GET /prescriptions`, `GET /prescription-logs`.

### 9.5. QR cấp cứu

1. Patient bật/tắt public fields ở `/cai-dat-quyen-rieng-tu`.
2. Planned: tạo QR bằng `POST /emergency/token`.
3. Public route `/cap-cuu/:token` gọi `GET /emergency/access/{token}`.
4. Backend chỉ trả các trường privacy cho phép và ghi `emergency_access_logs`.

### 9.6. Admin

1. Admin login qua `/quan-tri/dang-nhap`.
2. Planned: load `GET /admin/doctors/pending`.
3. Admin approve/reject bằng `PATCH /admin/doctors/{id}/verify`.
4. Audit page gọi `GET /admin/audit-logs` với filter action/user/date.

## 10. Component plan

### 10.1. Reusable components

- `Button`: variants `primary`, `secondary`, `outline`, `ghost`, `danger`, `success`; sizes `sm`, `md`, `lg`; supports icon left/right.
- `Card`: plain card, no nested card. Props `padding`, `interactive`, `tone`.
- `FormInput`: label, error, helper text, icon, password toggle.
- `Modal`: confirmation, destructive confirm, form modal.
- `Badge`: status colors: success/pending/emergency/info/muted.
- `Switch`: privacy toggles.
- `CheckboxGroup`: consent scopes.
- `AppShell`: role-aware sidebar/topbar.
- `Sidebar`: patient/doctor/admin nav config.
- `Topbar`: breadcrumbs, notification bell, avatar, patient emergency QR button.
- `StatCard`: icon, value, unit, trend, status.
- `DataTable`: admin/records table with loading/empty/error states.
- `QRPreview`: display QR and emergency fields.
- `ChartCard`: wrapper for Recharts, consistent height and legend.
- `PageHeader`: icon, title, description, action slot.

### 10.2. Page-specific components

- Dashboard:
  - `PatientGreetingBanner`
  - `VitalsSummaryGrid`
  - `MedicationTodayList`
  - `HealthTrendCharts`
  - `AppointmentList`
- Diary:
  - `DiaryComposer`
  - `SymptomSelector`
  - `DiaryTimeline`
- Profile/Privacy:
  - `EmergencyPreview`
  - `PrivacyFieldToggleList`
  - `AccessRequestCard`
  - `ActivePermissionList`
- Doctor:
  - `PatientSearchForm`
  - `ConsentScopePicker`
  - `PatientClinicalTabs`
  - `PrescriptionBuilder`
- Admin:
  - `PendingDoctorTable`
  - `AuditLogFilters`
  - `AuditLogTable`

## 11. Page implementation details

### 11.1. Login

- Desktop: split 40/60, left panel primary/accent theo role.
- Mobile: chỉ form, logo nhỏ phía trên.
- Role selector gồm bệnh nhân/bác sĩ; admin là link riêng.
- Submit gọi `authStore.login`; redirect theo role:
  - `user` -> `/trang-chu`
  - `doctor` -> `/bac-si/tim-kiem`
  - `admin` -> `/quan-tri/phe-duyet-bac-si`

### 11.2. Register

- Tab bệnh nhân/bác sĩ.
- Bệnh nhân dùng JSON `POST /auth/register`.
- Bác sĩ dùng `FormData` `POST /auth/register-doctor`, có upload chứng chỉ.
- Sau thành công:
  - Bệnh nhân: chuyển login.
  - Bác sĩ: hiển thị trạng thái `pending_verification`.

### 11.3. Patient dashboard

- Load song song profile, metrics, prescriptions, diaries, medical records.
- Top banner gradient `primary -> primaryDark`, card stats 4 cột desktop, 2 cột tablet/mobile.
- QR card dùng planned emergency token nếu backend có; tạm dùng privacy preview từ profile nếu chưa có.
- Medication list lấy từ `prescriptions` + `prescription-logs`.
- Charts dùng Recharts, fixed height 180-220px để không layout shift.

### 11.4. Diary

- Composer có textarea, symptom chips và severity slider/stepper.
- Submit gọi `POST /diaries`.
- List dạng timeline/card, có badge severity.
- Delete dùng confirm modal, gọi `DELETE /diaries/{diary_id}`.

### 11.5. Health Metrics

- Metric input compact: heart rate, step count, respiratory rate, recorded_at.
- Charts filter theo `start/end`.
- Empty state khi chưa có dữ liệu.
- Doctor view chỉ bật sau khi backend hỗ trợ `patient_id`.

### 11.6. Profile and records

- `ProfilePage`: xem/sửa thông tin cá nhân bằng `GET/PATCH /users/me`.
- Hồ sơ bệnh án: `GET /medical-records/me`.
- Đơn thuốc: `GET /prescriptions`, drilldown logs bằng `GET /prescription-logs`.
- Export: `GET /users/me/export`, hỗ trợ JSON/PDF và scope picker.

### 11.7. Privacy settings

- QR preview nằm trên cùng, hiển thị số trường đang bật.
- Toggle fields:
  - blood type -> `show_blood_type`
  - allergies -> `show_allergies`
  - emergency contact -> `show_emergency_contact`
- Save button gọi `PATCH /users/privacy`.
- Có info alert: khuyến nghị bật tối thiểu nhóm máu, dị ứng, SĐT người thân.

### 11.8. Consent management

- Pending requests từ `GET /consent/access-requests`.
- Request card hiển thị doctor name, specialty/hospital nếu response/backend bổ sung sau, requested scopes, reason, requested_at.
- Approve cho phép chỉnh `approved_scope` và `expires_in_days`.
- Reject gửi `{ action: "rejected" }`.
- Active permissions từ `GET /consent/history`, revoke bằng `POST /consent/revoke/{doctor_id}`.

### 11.9. Doctor pages

- Search form theo patient code/phone/cccd nhưng service phụ thuộc backend.
- Consent scope picker dùng constant chung.
- Patient detail dùng tabs: vitals, diary, records, prescriptions.
- Prescription builder cần thiết kế theo docs, nhưng action submit disabled nếu endpoint chưa có.

### 11.10. Admin pages

- Doctor approval table: pending count, approved this month, average review time.
- Row actions: view certificate, approve, reject.
- Audit logs: filters action/status/user/date, table dense có JSON diff collapsed/expand.
- Vì router admin chưa có, service đặt planned và UI có fallback "Chưa có API".

## 12. TypeScript type mapping tối thiểu

```ts
export type Role = "user" | "doctor" | "admin";

export type LoginRequest = {
  email: string;
  password: string;
};

export type UserBrief = {
  id: string;
  role: Role;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: UserBrief;
};

export type SymptomEntry = {
  name: string;
  severity: number;
};

export type DiaryCreateRequest = {
  content?: string | null;
  symptoms?: SymptomEntry[] | null;
};

export type PrescriptionLogStatus = "untaken" | "taken" | "skipped";
```

Types phải bám `backend/app/modules/**/schemas.py` trước, chỉ dùng `.antigravity/backend/SCHEMAS.md` cho endpoint chưa implement.

## 13. Responsive và accessibility

- Sidebar desktop fixed 256px; mobile chuyển sang drawer hoặc bottom nav tối giản.
- Topbar cao 56px; không để breadcrumb đè action.
- Table desktop full width; mobile dùng card list hoặc horizontal scroll có hint.
- Button icon phải có `aria-label` nếu không có text.
- Form field luôn có label thật, helper/error text dưới input.
- Focus ring dùng `primary` hoặc `adminPrimary`.
- Emergency page phải có contrast cao, text lớn, CTA gọi điện rõ.
- Chart cần legend text và tooltip, không chỉ dựa vào màu.

## 14. Loading, empty, error states

Mỗi page cần 4 trạng thái:

- `loading`: skeleton card/table/charts.
- `empty`: thông điệp tiếng Việt ngắn, có CTA nếu cần.
- `error`: hiển thị `message` từ `ErrorResponse`, kèm `request_id` dạng nhỏ để trace.
- `success`: toast ngắn, không reload toàn trang nếu chỉ update state.

Ví dụ:

- Consent empty: "Không có yêu cầu truy cập đang chờ."
- Diary empty: "Chưa có nhật ký triệu chứng."
- Metrics empty: "Chưa có chỉ số trong khoảng thời gian này."
- Admin planned API: "API quản trị chưa được bật trong backend hiện tại."

## 15. Thứ tự triển khai đề xuất

1. Khởi tạo Vite ReactTS trong `frontend/`.
2. Cài TailwindCSS, React Router, Zustand, lucide-react, recharts, date-fns.
3. Cấu hình token Tailwind theo mục 3.
4. Tạo `types/` từ schema thực tế.
5. Tạo `services/apiClient.ts`, `constants/endpoints.ts`.
6. Tạo Zustand stores.
7. Tạo component primitives: Button, Card, FormInput, Badge, Modal.
8. Tạo AppShell theo role.
9. Implement Login/Register.
10. Implement Patient Dashboard, Diary, HealthMetrics, Profile, Privacy, Consent.
11. Implement Doctor/Admin pages ở trạng thái ready-for-API, có fallback planned endpoint.
12. Thêm route guards theo role.
13. Kiểm thử build, responsive, error state, auth redirect.

## 16. Kiểm thử cần có

- `npm run build`: TypeScript và Vite build sạch.
- Test service:
  - apiClient gắn token đúng.
  - apiClient parse `ErrorResponse`.
  - FormData register doctor không set JSON content type.
- Test store:
  - login lưu token/user.
  - logout clear state.
  - update prescription log cập nhật đúng status.
- Test UI:
  - role redirect sau login.
  - privacy toggles gọi đúng payload.
  - consent approve/reject gọi đúng payload.
  - emergency route public không yêu cầu token.
- Manual responsive:
  - 390x844 mobile.
  - 768x1024 tablet.
  - 1440x900 desktop.
  - 2560x1600 desktop lớn như screenshots.

## 17. Checklist chấp nhận

- [ ] Không dùng cấu trúc Figma Make làm cấu trúc frontend thật.
- [ ] Không đặt tên file, folder, module, component, hook, store, service, type, constant bằng tiếng Việt hoặc tiếng Việt không dấu.
- [ ] Frontend nằm trong `frontend/` và theo tree yêu cầu.
- [ ] ReactTS + TailwindCSS + Zustand được dùng nhất quán.
- [ ] Màu, padding, radius, font scale bám design token ở mục 3.
- [ ] Endpoint implemented/planned được tách rõ.
- [ ] Trước khi nối endpoint mới, đã đọc lại `backend/app/modules/**/router.py` và `schemas.py` tương ứng; nếu backend khác docs thì frontend theo backend.
- [ ] Endpoint chưa có backend chỉ dùng theo docs ở trạng thái `planned` hoặc `pending backend`, không giả định đã production-ready.
- [ ] Mọi task liên quan Supabase SDK/frontend Supabase client đã được confirm với người dùng trước khi làm.
- [ ] Tất cả internal navigation dùng React Router.
- [ ] Store không giữ dữ liệu nhạy cảm quá mức cần thiết.
- [ ] Public emergency route hoạt động không cần đăng nhập khi backend sẵn sàng.
- [ ] Doctor/Admin pages không gọi endpoint planned trong production nếu backend chưa bật.
- [ ] Mọi lỗi API hiển thị message và request_id.
