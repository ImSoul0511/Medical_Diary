# Store And Types Implementation Plan

## Scope

Tài liệu này chỉ lập kế hoạch chuẩn hóa `frontend/src/store/` và `frontend/src/types/`.

Không xử lý trong tài liệu này:

- Chuẩn hóa `frontend/src/api/`.
- Sửa endpoint path sai trong API wrappers hiện tại.
- Wire page sang backend thật ngay lập tức.
- Realtime/Supabase frontend client.

Nguyên tắc nền:

- Backend `router.py` và `schemas.py` là nguồn sự thật cho dữ liệu thô.
- `src/types/` chứa UI/domain models dùng cho store, page, component.
- `src/store/` chứa state và action theo workflow UI.
- Store không gọi Axios trực tiếp; store gọi API wrapper.
- Page không tự transform DTO phức tạp; mapping nên nằm trong mapper hoặc action của store.
- Không dùng mock data làm fallback khi API lỗi.

## Current Problems

### 1. Store đang bị gộp quá rộng

`medicalStore.ts` hiện đang chứa nhiều domain:

- health metrics
- diaries
- medical records
- prescriptions
- prescription logs

Khi nối backend thật, store này sẽ phình lớn và khó kiểm soát loading/error theo từng màn hình.

### 2. Store còn thiếu domain chính

Backend có các module này nhưng frontend chưa có store tương ứng:

- doctors
- admin
- emergency

### 3. Store hiện còn mock/local-action

Các action dạng `addMetricLocal`, `addDiaryLocal`, `approveRequestLocal`, `markAsReadLocal` chỉ phục vụ prototype. Khi chuyển sang real API, nên đổi sang action bất đồng bộ:

- `createMetric`
- `createDiary`
- `reviewAccessRequest`
- `markAsRead`

### 4. Types đang bị trộn module

`types/medical.ts` hiện chứa cả metric, diary, medical record, prescription. Nên tách theo domain để tránh import thừa và tránh nhầm ownership.

### 5. UI types và API DTO chưa có ranh giới rõ

UI types nên dùng camelCase và phục vụ render. API DTO nên giữ snake_case và nằm trong API/module types. Vì tài liệu này không xử lý `src/api`, chỉ cần chuẩn bị `src/types` theo UI model.

## Target Folder Shape

```txt
frontend/src/store/
  authStore.ts
  userStore.ts
  healthMetricsStore.ts
  diaryStore.ts
  medicalRecordStore.ts
  prescriptionStore.ts
  consentStore.ts
  doctorStore.ts
  adminStore.ts
  emergencyStore.ts
  notificationStore.ts
  uiStore.ts

frontend/src/types/
  auth.ts
  user.ts
  healthMetrics.ts
  diary.ts
  medicalRecord.ts
  prescription.ts
  consent.ts
  doctor.ts
  admin.ts
  emergency.ts
  notification.ts
  api.ts
  ui.ts
```

Optional later:

```txt
frontend/src/mappers/
  userMapper.ts
  healthMetricsMapper.ts
  diaryMapper.ts
  medicalRecordMapper.ts
  prescriptionMapper.ts
  consentMapper.ts
  doctorMapper.ts
  adminMapper.ts
  emergencyMapper.ts
  notificationMapper.ts
```

## Shared Store Patterns

Mỗi domain store nên có pattern nhất quán:

```ts
type StoreState = {
  data: ...
  isLoading: boolean;
  isSaving?: boolean;
  error: string | null;
};
```

Với list:

```ts
type ListState<T> = {
  items: T[];
  isLoading: boolean;
  error: string | null;
  lastLoadedAt?: string | null;
};
```

Với mutation theo từng item:

```ts
type MutationState = {
  pendingIds: string[];
  error: string | null;
};
```

Hoặc đơn giản hơn trong từng store:

```ts
reviewingRequestId: string | null;
deletingId: string | null;
savingId: string | null;
```

## Types Plan

### `types/auth.ts`

Giữ:

```ts
export type Role = "user" | "doctor" | "admin";
export type RoleTheme = "patient" | "doctor" | "admin";
```

Nên chỉnh:

```ts
export type AuthUser = {
  id: string;
  role: Role;
  displayName: string;
  email?: string;
  initials: string;
};

export type AuthSession = {
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  userAgent: string;
  ip: string;
};

export type LoginForm = {
  email: string;
  password: string;
  role: Role;
};

export type RegisterPatientForm = {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
};

export type RegisterDoctorForm = RegisterPatientForm & {
  cccd: string;
  licenseNumber: string;
  specialty: string;
  hospital: string;
  certificateFile: File | null;
};
```

Remove later:

```ts
export type MockUser = AuthUser;
```

### `types/user.ts`

Nên là UI profile model:

```ts
export type Gender = "male" | "female" | "other";

export type PrivacySettings = {
  showBloodType: boolean;
  showAllergies: boolean;
  showEmergencyContact: boolean;
};

export type UserProfile = {
  id: string;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  privacySettings: PrivacySettings;
};

export type UserProfileForm = {
  fullName: string;
  gender: Gender | "";
  dateOfBirth: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
};

export type AccessHistoryItem = {
  id: string;
  doctorName: string;
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | string;
  dataType: string;
  accessedAt: string;
};

export type DoctorPublicProfile = {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
};
```

Note: backend `UserProfileResponse` không trả `phoneNumber` hoặc `address`, nên UI type không nên bắt buộc các field đó.

### `types/healthMetrics.ts`

```ts
export type HealthMetric = {
  id: string;
  userId: string;
  heartRate: number | null;
  stepCount: number | null;
  respiratoryRate: number | null;
  recordedAt: string;
  createdAt: string;
};

export type HealthMetricForm = {
  heartRate: string;
  stepCount: string;
  respiratoryRate: string;
  recordedAt: string;
};

export type HealthMetricFilters = {
  patientId?: string;
  start?: string;
  end?: string;
};

export type HealthMetricChartPoint = {
  label: string;
  heartRate: number | null;
  stepCount: number | null;
  respiratoryRate: number | null;
};
```

Remove from old `medical.ts` later:

- `HealthMetric`

### `types/diary.ts`

```ts
export type SymptomEntry = {
  name: string;
  severity: number;
};

export type DiaryEntry = {
  id: string;
  userId: string;
  content: string | null;
  symptoms: SymptomEntry[];
  createdAt: string;
  updatedAt: string;
};

export type DiaryForm = {
  content: string;
  symptoms: SymptomEntry[];
};

export type DiaryFilters = {
  patientId?: string;
};
```

Backend không có `mood`, nên `mood` chỉ giữ nếu UI tự tính hoặc là local-only field.

### `types/medicalRecord.ts`

```ts
export type MedicalRecord = {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  notes: string | null;
  attachments: string[];
  createdAt: string;
};

export type MedicalRecordForm = {
  patientId: string;
  diagnosis: string;
  notes: string;
  attachments: string[];
};
```

Backend hiện không trả `doctorName` hoặc `hospital`. Nếu UI cần hiển thị, phải lấy thêm từ endpoint khác hoặc để optional display metadata:

```ts
doctorName?: string;
hospital?: string;
```

### `types/prescription.ts`

```ts
export type PrescriptionLogStatus = "untaken" | "taken" | "skipped";

export type CustomPrescriptionLogDraft = {
  scheduledDate: string;
  scheduledTime: string;
};

export type PrescriptionItem = {
  id: string;
  medicationName: string;
  dosage: string;
  durationDays: number | null;
  scheduledTimes: string[];
  startDate: string | null;
  status: "active" | "cancelled" | string;
};

export type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  notes: string | null;
  items: PrescriptionItem[];
  createdAt: string;
};

export type PrescriptionLog = {
  id: string;
  prescriptionItemId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: PrescriptionLogStatus;
  takenAt: string | null;
};

export type PrescriptionDraft = {
  patientId: string;
  notes: string;
};

export type PrescriptionItemDraft = {
  medicationName: string;
  dosage: string;
  durationDays: string;
  scheduledTimes: string[];
  startDate: string;
  customLogs: CustomPrescriptionLogDraft[];
};
```

### `types/consent.ts`

Giữ `ConsentScope`, nhưng chuẩn hóa status theo backend:

```ts
export type ConsentScope =
  | "blood_type"
  | "allergies"
  | "emergency_contact"
  | "medical_records"
  | "prescriptions"
  | "diaries"
  | "heart_rate"
  | "step_count"
  | "respiratory_rate";

export type AccessRequestStatus = "pending" | "approved" | "rejected" | string;

export type AccessRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  reason: string;
  requestedScopes: ConsentScope[];
  requestedAt: string;
  status: AccessRequestStatus;
};

export type ActivePermission = {
  id: string;
  doctorId: string;
  doctorName: string;
  approvedScopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string | null;
};

export type ConsentHistoryItem = {
  doctorId: string;
  doctorName: string;
  scopes: ConsentScope[];
  grantedAt: string;
  expiresAt: string | null;
};

export type ConsentReviewForm = {
  action: "approved" | "rejected";
  approvedScopes: ConsentScope[];
  expiresInDays: number | null;
};
```

### `types/doctor.ts`

```ts
import type { ConsentScope } from "./consent";
import type { Gender } from "./user";

export type PatientSearchResult = {
  id: string;
  fullName: string;
  gender: Gender | string;
};

export type PatientProfile = {
  fullName: string;
  gender: Gender | string;
  dateOfBirth: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
};

export type RequestAccessForm = {
  patientId: string;
  requestedScopes: ConsentScope[];
  reason: string;
};

export type RequestAccessResult = {
  requestId: string;
  status: string;
  createdAt: string;
};
```

### `types/admin.ts`

Current file is close, but align with backend:

```ts
export type DoctorApprovalStatus = "pending_verification" | "approved" | "rejected" | string;

export type DoctorApproval = {
  id: string;
  fullName: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  certificateUrl: string;
  registeredAt: string;
  status: DoctorApprovalStatus;
};

export type DoctorVerifyForm = {
  action: "approved" | "rejected";
  notes: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  tableName: string;
  targetUserId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogFilters = {
  page: number;
  limit: number;
  action?: string;
  userId?: string;
  dateFrom?: string;
};
```

### `types/emergency.ts`

Current `EmergencyProfile` is not enough.

```ts
export type EmergencyProfile = {
  fullName: string;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
};

export type EmergencyToken = {
  id: string;
  token: string;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string;
};

export type EmergencyTokenCreateForm = {
  ttlMinutes: number | null;
};

export type EmergencyTokenUpdateForm = {
  ttlMinutes: number | null;
};

export type EmergencyAccessLog = {
  id: string;
  tokenId: string;
  accessedAt: string;
};
```

### `types/notification.ts`

```ts
export type NotificationType =
  | "access_request"
  | "prescription_new"
  | "prescription_reminder"
  | "emergency_token_expired"
  | string;

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
};
```

### `types/api.ts`

Nên dùng cho UI-level request state, không duplicate backend DTO:

```ts
export type RequestStatus = "idle" | "loading" | "success" | "error";

export type ApiRequestState = {
  status: RequestStatus;
  error: string | null;
  requestId?: string | null;
};

export type PaginationState = {
  page: number;
  limit: number;
  total: number;
};
```

## Store Plan

### `authStore.ts`

Keep current real auth flow, then expand.

State:

```ts
selectedRole: Role;
currentUser: AuthUser | null;
accessToken: string | null;
sessions: AuthSession[];
isAuthenticated: boolean;
isHydrated: boolean;
isLoading: boolean;
isLoadingSessions: boolean;
error: string | null;
```

Actions:

```ts
login(role, email, password)
registerPatient(form)
registerDoctor(form)
refreshSession()
logout()
loadSessions()
revokeSession(sessionId, password)
revokeAllSessions(password)
setAccessToken(token)
setSelectedRole(role)
clearAuth()
```

Notes:

- No mock token.
- No `localStorage`.
- `refreshSession` stays single-flight.

### `userStore.ts`

State:

```ts
profile: UserProfile | null;
profileForm: UserProfileForm | null;
accessHistory: AccessHistoryItem[];
doctorSearchResults: DoctorPublicProfile[];
isLoadingProfile: boolean;
isSavingProfile: boolean;
isSavingPrivacy: boolean;
isLoadingAccessHistory: boolean;
isSearchingDoctors: boolean;
isExporting: boolean;
error: string | null;
```

Actions:

```ts
loadMe()
updateProfile(payload)
updatePrivacy(payload)
loadAccessHistory()
searchDoctors(filters)
exportData(format, scope)
setProfileForm(form)
resetProfileForm()
clearError()
```

Pages:

- `ProfilePage`
- `PrivacySettings`
- `PatientDashboard`

### `healthMetricsStore.ts`

State:

```ts
items: HealthMetric[];
latest: HealthMetric | null;
filters: HealthMetricFilters;
chartData: HealthMetricChartPoint[];
isLoading: boolean;
isCreating: boolean;
error: string | null;
```

Actions:

```ts
loadMine(filters?)
loadPatientMetrics(patientId, filters?)
createMetric(form)
setFilters(filters)
clear()
```

Pages:

- `HealthMetricsPage`
- `PatientDashboard`
- `DoctorPatientDetail`

### `diaryStore.ts`

State:

```ts
items: DiaryEntry[];
filters: DiaryFilters;
isLoading: boolean;
isCreating: boolean;
deletingId: string | null;
error: string | null;
```

Actions:

```ts
loadMine()
loadPatientDiaries(patientId)
createDiary(form)
deleteDiary(diaryId)
setFilters(filters)
clear()
```

Pages:

- `DiaryPage`
- `PatientDashboard`
- `DoctorPatientDetail`

### `medicalRecordStore.ts`

State:

```ts
myRecords: MedicalRecord[];
patientRecords: MedicalRecord[];
selectedPatientId: string | null;
isLoadingMine: boolean;
isLoadingPatient: boolean;
isCreating: boolean;
error: string | null;
```

Actions:

```ts
loadMine()
loadPatientRecords(patientId)
createRecord(form)
clearPatientRecords()
```

Pages:

- `ProfilePage`
- `PatientDashboard`
- `DoctorPatientDetail`

### `prescriptionStore.ts`

State:

```ts
prescriptions: Prescription[];
logsByPrescriptionId: Record<string, PrescriptionLog[]>;
todayLogs: PrescriptionLog[];
selectedPrescriptionId: string | null;
builderDraft: PrescriptionDraft;
itemDrafts: PrescriptionItemDraft[];
isLoadingPrescriptions: boolean;
isLoadingLogs: boolean;
isCreatingPrescription: boolean;
isAddingItem: boolean;
updatingLogId: string | null;
deletingPrescriptionId: string | null;
error: string | null;
```

Actions:

```ts
loadPrescriptions()
loadPrescriptionLogs(prescriptionId)
updateLogStatus(logId, status)
createPrescription(draft)
addPrescriptionItem(prescriptionId, draft)
deletePrescription(prescriptionId)
setBuilderDraft(draft)
addItemDraft()
updateItemDraft(index, patch)
removeItemDraft(index)
resetBuilder()
```

Pages:

- `PatientDashboard`
- `ProfilePage`
- `DoctorPatientDetail`
- `DoctorPrescription`

### `consentStore.ts`

State:

```ts
pendingRequests: AccessRequest[];
activePermissions: ActivePermission[];
history: ConsentHistoryItem[];
selectedScopes: ConsentScope[];
isLoadingRequests: boolean;
isLoadingHistory: boolean;
reviewingRequestId: string | null;
revokingDoctorId: string | null;
error: string | null;
```

Actions:

```ts
loadAccessRequests()
loadHistory()
reviewAccessRequest(requestId, form)
approveRequest(requestId, scopes, expiresInDays)
rejectRequest(requestId)
revokeDoctorPermission(doctorId)
setSelectedScopes(scopes)
clearError()
```

Pages:

- `ConsentManagement`
- `PatientDashboard`

### `doctorStore.ts`

State:

```ts
patientSearchResults: PatientSearchResult[];
selectedPatient: PatientProfile | null;
selectedPatientId: string | null;
requestAccessResult: RequestAccessResult | null;
requestAccessDraft: RequestAccessForm | null;
isSearching: boolean;
isLoadingPatient: boolean;
isRequestingAccess: boolean;
error: string | null;
```

Actions:

```ts
searchPatients(phoneNumber)
loadPatientDetail(patientId)
requestAccess(form)
setRequestAccessDraft(draft)
clearSearch()
clearSelectedPatient()
clearRequestResult()
```

Pages:

- `DoctorSearch`
- `DoctorPatientDetail`

### `adminStore.ts`

State:

```ts
pendingDoctors: DoctorApproval[];
auditLogs: AuditLog[];
auditFilters: AuditLogFilters;
pagination: PaginationState;
isLoadingDoctors: boolean;
isLoadingAuditLogs: boolean;
verifyingDoctorId: string | null;
error: string | null;
```

Actions:

```ts
loadPendingDoctors()
verifyDoctor(doctorId, form)
loadAuditLogs(filters?)
setAuditFilters(filters)
clearError()
```

Pages:

- `AdminDoctorApproval`
- `AdminAuditLogs`

### `emergencyStore.ts`

State:

```ts
tokens: EmergencyToken[];
accessHistory: EmergencyAccessLog[];
publicProfile: EmergencyProfile | null;
createdToken: string | null;
isLoadingTokens: boolean;
isLoadingHistory: boolean;
isLoadingPublicProfile: boolean;
isCreating: boolean;
updatingTokenId: string | null;
revokingTokenId: string | null;
error: string | null;
```

Actions:

```ts
createToken(form)
loadTokens()
loadTokenHistory()
updateToken(tokenId, form)
revokeToken(tokenId)
loadPublicProfile(token)
clearPublicProfile()
clearCreatedToken()
```

Pages:

- patient QR section
- `EmergencyPublicView`

### `notificationStore.ts`

State:

```ts
items: Notification[];
unreadCount: number;
isLoading: boolean;
markingReadId: string | null;
error: string | null;
```

Actions:

```ts
loadNotifications()
markAsRead(id)
receiveNotification(notification)
markAllLocalRead()
clear()
```

Pages/components:

- `Topbar`
- toast/global notification UI

### `uiStore.ts`

Keep separate from backend data.

State:

```ts
sidebarCollapsed
mobileSidebarOpen
currentRoleTheme
globalLoading
lastError
toastMessage
```

Optional later:

```ts
activeModal
confirmDialog
```

## Migration Steps

### Phase 1: Type cleanup

1. Create new split files in `src/types`.
2. Keep old `types/medical.ts` temporarily if pages still import it.
3. Move one domain at a time:
   - `healthMetrics.ts`
   - `diary.ts`
   - `medicalRecord.ts`
   - `prescription.ts`
4. Update imports gradually.
5. Remove old duplicate exports only after pages compile.

### Phase 2: Store split without API wiring

1. Create new stores using existing mock data only as initial fixture if needed.
2. Replace page imports from `medicalStore` to specific stores.
3. Keep behavior equivalent.
4. Remove `medicalStore` after no import remains.

### Phase 3: Store async action shape

1. Rename local actions to real action names.
2. Add loading/error state per action.
3. Keep mock implementation only behind clearly named fixture loader if API is not ready.
4. Do not fallback from failed API to mock.

### Phase 4: Connect to real API wrappers

1. For each store, call its matching API wrapper.
2. Map DTO to UI type.
3. Surface backend errors through store `error`.
4. Update pages to render loading/empty/error states.

Recommended order:

```txt
authStore already mostly real
userStore
healthMetricsStore
diaryStore
medicalRecordStore
prescriptionStore
consentStore
doctorStore
adminStore
emergencyStore
notificationStore
```

## Page To Store Ownership

```txt
PatientDashboard
  userStore
  healthMetricsStore
  diaryStore
  medicalRecordStore
  prescriptionStore
  notificationStore

DiaryPage
  diaryStore

HealthMetricsPage
  healthMetricsStore

ProfilePage
  userStore
  medicalRecordStore
  prescriptionStore

PrivacySettings
  userStore

ConsentManagement
  consentStore

EmergencyPublicView
  emergencyStore

DoctorSearch
  doctorStore
  consentStore

DoctorPatientDetail
  doctorStore
  healthMetricsStore
  diaryStore
  medicalRecordStore
  prescriptionStore

DoctorPrescription
  prescriptionStore

AdminDoctorApproval
  adminStore

AdminAuditLogs
  adminStore

Topbar
  notificationStore
  authStore
  uiStore
```

## Acceptance Checklist

- No page imports `mockData` directly.
- No store uses `mockData` as fallback after API error.
- `medicalStore.ts` is removed or reduced to a temporary compatibility layer.
- Every backend domain used by UI has one clear owning store.
- `src/types` contains UI/domain types only.
- API DTO types are not mixed into UI type files.
- Store actions expose loading and error states.
- Page components do not call Axios or `apiClient` directly.
- Page components do not transform backend snake_case manually.
- Status strings match backend values: `approved/rejected`, `untaken/taken/skipped`, etc.
