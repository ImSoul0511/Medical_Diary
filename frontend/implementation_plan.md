# Frontend Implementation Plan - Medical Diary

Ngay lap: 20/05/2026  
Trang thai: cho nguoi dung confirm truoc khi trien khai code  
Pham vi: lap ke hoach chuyen UI tham khao tu Figma Make thanh frontend ReactTS/TailwindCSS/Zustand trong `frontend/`

## 1. Nguyen tac bat buoc trong phase nay

- Chi lam frontend UI. Khong sua bat ky file nao trong `backend/`.
- Khong noi API, khong goi endpoint that, khong tao request den server.
- Khong them Supabase SDK, Supabase client, Realtime subscription, Storage upload, hoac bat ky logic Supabase truc tiep nao. Neu task sau nay lien quan Supabase SDK thi phai confirm rieng voi nguoi dung truoc khi lam.
- Truoc khi code UI, phai follow `ui_implementation.md` nhu SSOT cho folder structure, design tokens, route mapping, Zustand store plan, naming rules, responsive/accessibility va acceptance checklist.
- Khong copy cau truc cua `Medical Diary Design System/`. Thu muc do chi la nguon tham khao visual va flow.
- Khong dat ten file, folder, module, component, hook, store, service, type, constant bang tieng Viet hoac tieng Viet khong dau. Tat ca ten ky thuat dung tieng Anh.
- Duoc dung tieng Viet cho text hien thi trong UI: heading, label, placeholder, toast, empty state, error copy.
- `frontend/` hien tai duoc xem nhu workspace trong, chi bat dau scaffold/implement sau khi plan nay duoc confirm.
- Phan noi API se duoc de rieng cho nguoi dung tu trien khai thu cong theo `frontend/manual_api_integration.md`.

## 2. Nguon tham khao da doc

- `ui_implementation.md`: quy tac UI, design tokens, folder structure, route mapping, Zustand store plan, naming rules.
- `Medical Diary Design System/`: Figma Make reference cho route demo, layout density, sidebar/topbar, card, form, chart, QR, admin theme.
- `frontend_images/`: screenshot reference de gia lap cach doc Figma MCP.
- `.antigravity/frontend/mcp-figma-rule.md`: workflow discovery/planning theo Figma MCP, ap dung bang cach gia lap qua Figma Make va screenshots.
- `.antigravity/backend/API_FLOW.md`: flow nghiep vu de biet UI can co man hinh nao, chi dung tham khao, khong dung de noi API trong phase nay.
- `.antigravity/backend/SYSTEM_DESIGN_SSOT.md`: context role, data visibility, consent, emergency, audit, security.

Ghi chu: tai phase UI-only nay, backend routers/schemas chi la nguon doi chieu cho tuong lai. Khi bat dau phase API integration sau nay, agent phai doc lai router/schema backend tai thoi diem do truoc khi noi bat ky endpoint nao.

## 3. Muc tieu UI-only

Tao mot frontend ReactTS co giao dien day du de review flow san pham:

- Auth screens: login, register, admin login.
- Patient portal: dashboard, diary, health metrics, profile/records, privacy settings, consent management, emergency public view.
- Doctor portal: patient search, patient detail, prescription builder.
- Admin portal: doctor approval, audit logs.
- Global app shell: sidebar, topbar, role-aware navigation, responsive mobile layout.
- Reusable components dung TailwindCSS, lucide icons, Recharts cho chart mock.
- Zustand dung de quan ly state UI va mock data cuc bo giua components.

Khong co muc tieu:

- Khong tao `apiClient.ts` co `fetch`, `axios`, `XMLHttpRequest`, hoac base URL.
- Khong luu JWT/token that.
- Khong doc `.env` API URL.
- Khong goi backend local hay remote.
- Khong viet service network wrapper trong phase nay.
- Khong import hoac cai `@supabase/supabase-js`.

## 4. Tech stack de trien khai sau khi confirm

- Build tool: Vite React TypeScript.
- Styling: TailwindCSS.
- State management: Zustand.
- Routing: `react-router-dom`.
- Icons: `lucide-react`.
- Charts: `recharts`.
- Date formatting: `date-fns`.
- Class helpers: `clsx`, `tailwind-merge`.
- QR display: uu tien render mock QR bang CSS/HTML hoac thu vien QR chi khi can, khong goi API tao token.

Khong cai trong phase UI-only:

- `@supabase/supabase-js`.
- API SDK/generated client.
- Axios, neu chua co ly do ro rang o phase API sau.

## 5. Cau truc file du kien

Sau khi duoc confirm, scaffold frontend trong `frontend/` theo cau truc sau:

```text
frontend/
|-- public/
|-- src/
|   |-- app/
|   |   |-- App.tsx
|   |   |-- router.tsx
|   |   `-- providers.tsx
|   |-- components/
|   |   |-- AppShell.tsx
|   |   |-- Badge.tsx
|   |   |-- Button.tsx
|   |   |-- Card.tsx
|   |   |-- DataTable.tsx
|   |   |-- EmptyState.tsx
|   |   |-- FormInput.tsx
|   |   |-- Modal.tsx
|   |   |-- QRPreview.tsx
|   |   |-- Sidebar.tsx
|   |   |-- StatCard.tsx
|   |   `-- Topbar.tsx
|   |-- pages/
|   |   |-- Dashboard/
|   |   |   |-- AdminAuditLogs.tsx
|   |   |   |-- AdminDoctorApproval.tsx
|   |   |   |-- DoctorPatientDetail.tsx
|   |   |   |-- DoctorPrescription.tsx
|   |   |   |-- DoctorSearch.tsx
|   |   |   `-- PatientDashboard.tsx
|   |   |-- Diary/
|   |   |   `-- DiaryPage.tsx
|   |   |-- HealthMetrics/
|   |   |   `-- HealthMetricsPage.tsx
|   |   |-- Login/
|   |   |   |-- AdminLoginPage.tsx
|   |   |   |-- LoginPage.tsx
|   |   |   `-- RegisterPage.tsx
|   |   `-- Profile/
|   |       |-- ConsentManagement.tsx
|   |       |-- EmergencyPublicView.tsx
|   |       |-- PrivacySettings.tsx
|   |       `-- ProfilePage.tsx
|   |-- hooks/
|   |   |-- useConsent.ts
|   |   |-- useMockDelay.ts
|   |   `-- useNotifications.ts
|   |-- store/
|   |   |-- authStore.ts
|   |   |-- consentStore.ts
|   |   |-- medicalStore.ts
|   |   |-- notificationStore.ts
|   |   |-- uiStore.ts
|   |   `-- userStore.ts
|   |-- constants/
|   |   |-- consentScopes.ts
|   |   |-- mockData.ts
|   |   |-- roles.ts
|   |   `-- routes.ts
|   |-- types/
|   |   |-- admin.ts
|   |   |-- auth.ts
|   |   |-- consent.ts
|   |   |-- emergency.ts
|   |   |-- medical.ts
|   |   `-- user.ts
|   |-- utils/
|   |   |-- date.ts
|   |   |-- format.ts
|   |   |-- qr.ts
|   |   `-- validation.ts
|   `-- styles/
|       |-- globals.css
|       `-- tailwind.css
|-- package.json
|-- postcss.config.js
|-- tailwind.config.js
`-- tsconfig.json
```

Khac voi `ui_implementation.md` phase API day du, phase UI-only se khong tao `src/services/apiClient.ts` va khong tao endpoint wrappers co network calls. Huong dan tao service/API layer thu cong nam trong `frontend/manual_api_integration.md` de nguoi dung tu thuc hien sau.

## 6. Routing UI

Routes se giu gan voi Figma Make va `ui_implementation.md`, nhung component names bang tieng Anh:

| Route | Component | Role | Data trong phase nay |
|---|---|---|---|
| `/` | `LoginPage` | Public | mock auth state |
| `/dang-ky` | `RegisterPage` | Public | mock register success |
| `/quan-tri/dang-nhap` | `AdminLoginPage` | Public/Admin | mock admin auth |
| `/trang-chu` | `PatientDashboard` | Patient | mock profile, metrics, prescriptions, diaries |
| `/nhat-ky-trieu-chung` | `DiaryPage` | Patient | Zustand local diary list |
| `/chi-so-suc-khoe` | `HealthMetricsPage` | Patient | mock metrics + local add form |
| `/ho-so-benh-an` | `ProfilePage` | Patient | mock profile, records, prescriptions |
| `/quan-ly-cap-quyen` | `ConsentManagement` | Patient | mock pending requests and permissions |
| `/cai-dat-quyen-rieng-tu` | `PrivacySettings` | Patient | local privacy toggles |
| `/cap-cuu/:token` | `EmergencyPublicView` | Public | mock public emergency profile |
| `/bac-si/tim-kiem` | `DoctorSearch` | Doctor | mock patient search results |
| `/bac-si/benh-nhan/:patientId` | `DoctorPatientDetail` | Doctor | mock clinical tabs |
| `/bac-si/tao-don-thuoc/:patientId` | `DoctorPrescription` | Doctor | local prescription builder only |
| `/quan-tri/phe-duyet-bac-si` | `AdminDoctorApproval` | Admin | mock pending doctors |
| `/quan-tri/nhat-ky-kiem-toan` | `AdminAuditLogs` | Admin | mock audit log table |

Internal navigation bat buoc dung `Link`, `NavLink`, hoac `useNavigate` tu `react-router-dom`.

## 7. Design tokens can chuyen sang Tailwind

Mau chinh:

- `primary`: `#0284C7`
- `primaryDark`: `#0369A1`
- `secondary`: `#0F172A`
- `accent`: `#0D9488`
- `background`: `#F8FAFC`
- `card`: `#FFFFFF`
- `muted`: `#F1F5F9`
- `mutedForeground`: `#64748B`
- `border`: `#E2E8F0`
- `emergency`: `#DC2626`
- `success`: `#16A34A`
- `pending`: `#EA580C`
- `warning`: `#F59E0B`
- `adminPrimary`: `#0077B6`
- `adminSecondary`: `#005F8C`
- `adminAccent`: `#004E73`
- `adminBackground`: `#E0F2FE`

Typography:

- Font: `Inter`, fallback `Roboto`, `system-ui`, `sans-serif`.
- Base: `16px`.
- Body UI: `14px`.
- Small/metadata: `12px`.
- Heading trong dashboard: `20px` den `24px`.
- Khong scale font theo viewport width.

Spacing va layout:

- Base grid: `4px`.
- Desktop app shell: sidebar `256px`, topbar `56px`, page padding `24px`.
- Mobile page padding: `16px`.
- Card padding: `16px` compact, `24px` roomy.
- Card radius: `8px`.
- Input/button radius: `6px`.
- Chart height: `180px` den `240px`, fixed de tranh layout shift.

## 8. Component implementation order

1. `Button`, `Card`, `Badge`, `FormInput`.
2. `Modal`, `EmptyState`, `DataTable`, `StatCard`, `QRPreview`.
3. `Sidebar`, `Topbar`, `AppShell`.
4. Page-specific building blocks embedded trong page truoc, chi tach component khi lap lai that su.
5. Chart wrappers cho vitals va admin summary.

Design rules:

- Khong dat card long card neu chi can section layout.
- Buttons co icon nen dung `lucide-react`.
- Icon-only buttons phai co `aria-label`.
- Table desktop, card list hoac horizontal scroll tren mobile.
- Text trong button/card khong duoc tran container.
- Khong lam landing page marketing; first screen la login/system entry.

## 9. Zustand store plan cho UI-only

`authStore`:

- Luu `selectedRole`, `mockUser`, `isAuthenticated`, `isHydrated`.
- Actions: `loginMock`, `logoutMock`, `setSelectedRole`.
- Khong luu token that.

`userStore`:

- Luu mock profile, privacy settings, access history, doctor search results.
- Actions local: `updateProfileLocal`, `updatePrivacyLocal`, `searchDoctorsLocal`.

`medicalStore`:

- Luu mock metrics, diaries, records, prescriptions, prescription logs.
- Actions local: `addMetricLocal`, `addDiaryLocal`, `deleteDiaryLocal`, `updatePrescriptionLogLocal`.

`consentStore`:

- Luu pending requests, active permissions, selected scopes.
- Actions local: `approveRequestLocal`, `rejectRequestLocal`, `revokeDoctorLocal`.

`notificationStore`:

- Luu mock notifications and unread count.
- Actions local: `markAsReadLocal`, `clearAllLocal`.

`uiStore`:

- Luu sidebar state, role theme, global loading mock, last error, modal state.
- Actions local: `toggleSidebar`, `setRoleTheme`, `setGlobalLoading`, `setError`.

## 10. Page detail plan

### 10.1. Login pages

- Split layout desktop: left brand/medical panel, right form.
- Mobile: compact single-column form.
- Role selector cho patient/doctor trong `LoginPage`.
- Admin login rieng tai `/quan-tri/dang-nhap`.
- Submit chi update `authStore` va redirect mock theo role.

### 10.2. PatientDashboard

- Greeting banner gradient `primary -> primaryDark`.
- Stat grid: heart rate, blood pressure/respiratory, steps, medication progress.
- Today medication list co local taken/untaken toggle.
- Health trend charts dung mock data.
- Recent diary and medical records summary.
- Emergency QR preview di den privacy/emergency page, khong tao QR token that.

### 10.3. DiaryPage

- Composer gom textarea, symptom chips, severity slider/input.
- Submit them item vao local Zustand list.
- Timeline/list card co severity badge.
- Delete dung confirmation modal va local update.

### 10.4. HealthMetricsPage

- Compact input form cho heart rate, step count, respiratory rate, recorded date.
- Chart filters local theo ngay/tuan/thang.
- Empty state khi local list rong.
- Khong co doctor patient API query trong phase nay.

### 10.5. ProfilePage

- Profile form mock voi blood type, allergies, emergency contact.
- Medical records mock list.
- Prescription mock section va local medication log status.
- Export button disabled hoac hien toast "Chua ket noi API".

### 10.6. PrivacySettings

- Toggle list cho public emergency fields.
- QR preview cap nhat theo local privacy settings.
- Info alert khuyen nghi bat blood type, allergies, emergency contact.
- Save chi update local state.

### 10.7. ConsentManagement

- Pending request cards.
- Scope picker dung `consentScopes`.
- Approve/reject chi update local store.
- Active permissions list co revoke local.

### 10.8. EmergencyPublicView

- Public layout mau do/trang, contrast cao.
- Hien thi mock emergency profile theo privacy settings.
- CTA call emergency contact neu co.
- Khong yeu cau auth guard.

### 10.9. DoctorSearch

- Search form theo patient code/phone/identity number.
- Ket qua mock basic patient info.
- Request access modal local, scope picker local.
- Status badge pending sau khi submit mock.

### 10.10. DoctorPatientDetail

- AppShell doctor theme.
- Tabs: overview, vitals, diary, records, prescriptions.
- Moi tab dung mock data va empty/error state gia lap.
- Link sang prescription builder voi `patientId`.

### 10.11. DoctorPrescription

- Local prescription builder: diagnosis summary, medicine rows, dose, schedule, duration.
- Add/remove medicine rows trong local state.
- Submit button chi hien success local/toast, khong goi API.

### 10.12. AdminDoctorApproval

- Admin cyan background.
- Summary cards: pending count, approved this month, rejected this month, average review time.
- Data table pending doctors mock.
- Approve/reject update local row status.

### 10.13. AdminAuditLogs

- Filters local: actor, action, status, date range.
- Dense table voi expandable JSON diff mock.
- Empty state khi filter khong co result.

## 11. API integration guardrails cho phase sau

Phase UI-only se khong lam cac viec sau:

- Khong tao network request.
- Khong tao endpoint constants de code bat dau phu thuoc API.
- Khong tao `apiClient.ts`.
- Khong tao Supabase client.

Khi nguoi dung confirm phase API sau nay:

1. Doc lai `backend/app/modules/**/router.py` va `schemas.py` cua module dang lam.
2. So sanh voi docs trong `.antigravity/backend/`.
3. Neu backend code khac docs, frontend theo backend code.
4. Endpoint chua implement thi danh dau `planned` hoac `pending backend`, khong gia lap nhu production-ready.
5. Moi task co Supabase SDK phai hoi nguoi dung truoc.

Tai lieu huong dan manual:

- `frontend/manual_api_integration.md` se mo ta cach nguoi dung tu tao `src/services/`, `src/constants/endpoints.ts`, API client, Zustand async actions, endpoint checklist va test checklist sau khi UI da san sang.
- Tai lieu do chi la huong dan, khong co code runtime nao duoc tao trong phase UI-only.

Supabase SDK update truoc khi trien khai UI:

- UI phase khong can Supabase SDK.
- Khong them `@supabase/supabase-js` vao `package.json`.
- Khong tao `supabaseClient.ts`.
- Khong dung Supabase Realtime cho `notificationStore` trong phase UI-only; dung mock notifications/local actions.
- Khong upload file truc tiep tu frontend len Supabase Storage; doctor certificate/register UI chi dung input/file preview mock.
- Neu sau nay muon browser direct Supabase Auth, Realtime, Storage, hoac RPC, can co confirm moi truoc khi sua code.

## 12. Verification plan sau khi implement UI

Sau khi duoc confirm va implement:

- Chay typecheck/build: `npm run build`.
- Chay dev server de review UI.
- Kiem tra routes desktop/tablet/mobile:
  - `390x844`
  - `768x1024`
  - `1440x900`
  - `2560x1600`
- Kiem tra khong co `fetch(`, `axios`, `XMLHttpRequest`, `@supabase/supabase-js`, `VITE_API_BASE_URL` trong source phase UI-only.
- Kiem tra ten file/component/store/hook/service/type/constant khong dung tieng Viet.
- Kiem tra internal navigation dung React Router.
- Kiem tra loading/empty/error states tren moi page chinh.

## 13. Acceptance checklist truoc khi bat dau code

- [ ] Nguoi dung confirm plan nay.
- [ ] Chap nhan phase dau chi dung mock/local state, khong noi API.
- [ ] Chap nhan khong tao service network layer trong phase UI-only.
- [ ] Chap nhan huong dan noi API duoc tach sang `frontend/manual_api_integration.md` de nguoi dung tu lam.
- [ ] Chap nhan tat ca file technical name bang tieng Anh.
- [ ] Chap nhan frontend moi chi nam trong `frontend/`.
- [ ] Chap nhan `Medical Diary Design System/` chi la reference visual, khong copy structure.
- [ ] Chap nhan moi Supabase SDK task trong tuong lai can confirm rieng.

## 14. De xuat thu tu lam sau khi confirm

1. Scaffold Vite ReactTS trong `frontend/`.
2. Cai dependencies UI can thiet.
3. Cau hinh Tailwind tokens va global styles.
4. Tao routes, providers, Zustand stores local.
5. Tao reusable components.
6. Tao AppShell responsive.
7. Implement auth pages.
8. Implement patient pages.
9. Implement doctor pages.
10. Implement admin pages.
11. Chay build va UI verification.
12. Sua polish responsive/accessibility.
