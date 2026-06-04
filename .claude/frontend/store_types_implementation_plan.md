# Store And Types Implementation Plan

## Scope

Tai lieu nay chi lap ke hoach cho `frontend/src/types/` va `frontend/src/store/`.

Khong xu ly trong tai lieu nay:

- Chuan hoa `frontend/src/api/`.
- Sua endpoint path sai trong API wrappers.
- Sua UI pages ngay trong buoc nay.
- Them Supabase frontend client.

Nguon su that:

- Backend `router.py` va `schemas.py` la source of truth cho raw API contract.
- `src/types/` la UI/domain model dung cho store, page, component.
- `src/store/` quan ly state va workflow UI.
- Store goi API wrapper, khong goi `apiClient`/Axios truc tiep.
- Page khong tu transform snake_case DTO phuc tap; mapper nen nam trong API wrapper hoac store action.
- Khong fallback ve mock data khi API loi.

## Current Status

`frontend/src/types/` da duoc tach xong theo domain hien tai:

```txt
frontend/src/types/
  admin.ts
  api.ts
  auth.ts
  consent.ts
  diary.ts
  doctor.ts
  emergency.ts
  healthMetrics.ts
  medicalRecord.ts
  notification.ts
  prescriptions.ts
  users.ts
```

`frontend/src/store/` van can xu ly tiep:

```txt
frontend/src/store/
  authStore.ts
  consentStore.ts
  medicalStore.ts
  notificationStore.ts
  uiStore.ts
  userStore.ts
```

Store con thieu hoac can tach:

- `healthMetricsStore.ts`
- `diaryStore.ts`
- `medicalRecordStore.ts`
- `prescriptionStore.ts`
- `doctorStore.ts`
- `adminStore.ts`
- `emergencyStore.ts`

`medicalStore.ts` hien dang gom qua nhieu domain, nen chi nen giu tam thoi trong qua trinh migration.

## Decisions From Current Review

### IDs

Frontend khong nen hien thi UUID cho user thong thuong.

Van giu ID trong type/store de:

- render React key
- goi detail/update/delete API
- lien ket patient/doctor/prescription/log
- route noi bo
- debug/admin/audit khi can

UI nen hien thi display fields thay vi ID.

### `users.ts`

`UserProfile` dung cho UI hien thi profile.

`UserProfileForm` dung cho form update profile. Form co the dung chuoi rong `""` de dieu khien input, sau do mapper chuyen `""` thanh `null` neu backend can.

`allergies` giu la:

```ts
allergies: string | null;
```

Ly do: backend `profiles.allergies` dang la `Text`, khong phai array/JSONB. Neu UI can hien thi chip/list thi tach chuoi o layer render/helper.

`AccessHistoryItem` dung cho access history page/section sau nay. UI co the chi hien thi "bac si da truy cap luc nao"; `action` va `dataType` khong nen la noi dung bat buoc tren UI neu man hinh khong can.

Recommended shape neu muon giam UI noise:

```ts
export type AccessHistoryItem = {
  id: string;
  doctorName: string;
  action?: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | string;
  dataType?: string;
  accessedAt: string;
};
```

### `healthMetrics.ts`

`HealthMetricForm` ton tai vi backend co `POST /health-metrics` cho user nhap chi so.

`HealthMetricFilters` map voi query cua `GET /health-metrics`:

- `patientId`
- `start`
- `end`

Day la UI filter state, khong phai DTO bat buoc cua backend.

### `medicalRecord.ts`

Backend da duoc cap nhat de `MedicalRecordResponse` tra them display fields:

- `patient_name`
- `doctor_name`
- `doctor_specialty`
- `doctor_hospital`

Frontend type nen giu:

```ts
patientName: string | null;
doctorName: string | null;
doctorSpecialty: string | null;
doctorHospital: string | null;
```

UI khong nen hien thi `patientId`/`doctorId` tru khi la admin/debug.

`MedicalRecordForm` la payload UI cho bac si tao ho so benh an qua `POST /medical-records`.

Form payload nen gom:

- `patientId`
- `diagnosis`
- `notes`
- `attachments`

`patientName` chi la display context khi dang tao form, khong phai payload chinh.

### `prescriptions.ts`

Backend da duoc cap nhat de `PrescriptionResponse` tra them display fields:

- `patient_name`
- `doctor_name`
- `doctor_hospital`
- `doctor_specialty`

Frontend `Prescription` nen toi thieu co:

```ts
export type Prescription = {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  doctorHospital?: string | null;
  doctorSpecialty?: string | null;
  notes: string | null;
  items: PrescriptionItem[];
  createdAt: string;
};
```

Neu page chua hien thi hospital/specialty thi co the de optional, nhung mapper nen khong lam mat du lieu backend tra ve.

UI nen hien thi:

- ten bac si
- ten benh nhan neu la doctor/admin view
- ghi chu don thuoc
- danh sach thuoc
- lich uong/log status

UI khong nen hien thi `patientId`, `doctorId`, `prescriptionItemId` cho user thong thuong.

`PrescriptionDraft` dung cho `POST /prescriptions`.

`PrescriptionItemDraft` dung cho `POST /prescriptions/{prescription_id}/items`.

Auto mode can:

- `durationDays`
- `scheduledTimes`
- `startDate`

Manual mode can:

- `customLogs`

### `doctor.ts`

`PatientProfile.allergies` giu `string | null` vi backend la `Text`.

Doctor module hien co cac workflow:

- search patient theo phone number
- xem patient profile theo consent/privacy
- request access
- xem du lieu patient qua cac module khac neu co consent
- tao medical record
- tao prescription

`PatientProfile` chi nen chua display fields cua patient, khong nen gom medical data vao cung type.

### `consent.ts`

Consent status can khop backend:

- `pending`
- `approved`
- `rejected`

`expiresAt` co the `null` neu quyen khong co han ro rang. Neu type hien tai de `string`, store mapper can chuan hoa can than hoac cap nhat thanh `string | null`.

`expiresInDays` trong form co the la `string` neu den tu input; mapper chuyen sang number/null khi submit.

### `admin.ts`

`DoctorVerifyForm` nen map dung backend schema. Neu backend dung `notes` ma type dang dung `note`, mapper/API wrapper phai doi ten truoc khi submit.

### `emergency.ts`

`EmergencyProfile.allergies` giu `string | null`.

Emergency public view chi hien thi du lieu duoc phep:

- full name
- blood type
- allergies
- emergency contact

Khong dua full `UserProfile` ra public emergency view.

## Target Store Shape

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
```

Optional mapper folder sau khi store bat dau wire API:

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

## Shared Store Pattern

Moi store nen co loading/error ro theo workflow:

```ts
type ListState<T> = {
  items: T[];
  isLoading: boolean;
  error: string | null;
  lastLoadedAt?: string | null;
};
```

Voi mutation:

```ts
type MutationState = {
  savingId?: string | null;
  deletingId?: string | null;
  error: string | null;
};
```

Quy tac:

- `load*` set loading rieng cho list/detail.
- `create/update/delete` set loading rieng cho mutation.
- Store action return data khi page can dieu huong sau mutation.
- Store khong swallow error; phai set `error` va throw/return controlled failure neu page can toast.
- Store khong fallback mock sau API error.

## Store Implementation Plan

### `authStore.ts`

Status: already mostly real.

Keep:

- RAM access token
- `refreshSession` single-flight
- no localStorage/sessionStorage token
- logout clears RAM and calls backend

Main actions:

```ts
login(role, email, password)
registerPatient(form)
registerDoctor(form)
refreshSession()
logout()
loadSessions()
revokeSession(sessionId, password)
revokeAllSessions(password)
setSelectedRole(role)
clearAuth()
```

### `userStore.ts`

Owns:

- current user profile
- profile form state
- privacy settings
- doctor search results for patient-side search
- access history
- export data state

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
updateProfile(form)
updatePrivacy(settings)
loadAccessHistory()
searchDoctors(filters)
exportData(format, scope)
setProfileForm(form)
resetProfileForm()
clearError()
```

### `healthMetricsStore.ts`

Owns:

- patient self metrics
- doctor-view patient metrics
- filters/chart data

Actions:

```ts
loadMine(filters?)
loadPatientMetrics(patientId, filters?)
createMetric(form)
setFilters(filters)
clear()
```

### `diaryStore.ts`

Owns:

- patient self diary
- doctor-view patient diary

Actions:

```ts
loadMine()
loadPatientDiaries(patientId)
createDiary(form)
deleteDiary(diaryId)
setFilters(filters)
clear()
```

### `medicalRecordStore.ts`

Owns:

- current patient's own medical records
- doctor-view selected patient's records
- create record flow

Actions:

```ts
loadMine()
loadPatientRecords(patientId)
createRecord(form)
clearPatientRecords()
```

Display rule:

- Use `patientName`, `doctorName`, `doctorSpecialty`, `doctorHospital` for UI.
- Keep IDs hidden except internal/admin/debug.

### `prescriptionStore.ts`

Owns:

- prescriptions
- prescription logs
- doctor prescription builder
- log status mutation

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

Display rule:

- Patient view shows doctor name and medication schedule.
- Doctor/admin view shows patient name too.
- IDs are internal only.

### `consentStore.ts`

Owns:

- pending access requests
- active permissions
- consent history
- review/revoke workflow

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

### `doctorStore.ts`

Owns:

- patient search
- selected patient profile
- request access flow

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

Medical data is not stored here. It belongs to:

- `healthMetricsStore`
- `diaryStore`
- `medicalRecordStore`
- `prescriptionStore`

### `adminStore.ts`

Owns:

- pending doctor approvals
- audit logs
- audit filters/pagination

Actions:

```ts
loadPendingDoctors()
verifyDoctor(doctorId, form)
loadAuditLogs(filters?)
setAuditFilters(filters)
clearError()
```

### `emergencyStore.ts`

Owns:

- patient's emergency tokens
- emergency access history
- public emergency profile view

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

### `notificationStore.ts`

Owns:

- notification list
- unread count
- mark read state
- receive realtime/polling notification

Actions:

```ts
loadNotifications()
markAsRead(id)
receiveNotification(notification)
markAllLocalRead()
clear()
```

### `uiStore.ts`

Owns UI-only state:

- sidebar collapsed/open
- role theme
- global loading
- toast/dialog state
- last UI error

No backend data should live here.

## Migration Steps

### Phase 1: Types cleanup

Status: done.

Remaining notes only:

- Keep `users.ts` and `prescriptions.ts` plural unless the team chooses a rename pass.
- Do not reintroduce broad `medical.ts` domain mixing.
- If mapper needs raw DTO types, place them near `src/api`, not inside UI `src/types`.

### Phase 2: Store split

1. Create missing domain stores.
2. Move state/actions out of `medicalStore.ts` by domain.
3. Keep behavior equivalent first.
4. Remove `medicalStore.ts` only after no import remains.

Recommended order:

```txt
healthMetricsStore
diaryStore
medicalRecordStore
prescriptionStore
doctorStore
adminStore
emergencyStore
notificationStore polish
userStore polish
```

### Phase 3: Async action normalization

1. Rename local/mock actions to real workflow names.
2. Add loading/error state per action.
3. Keep fixture loaders only if explicitly named as fixtures.
4. Never fallback from failed API to mock data.

### Phase 4: Connect stores to API wrappers

1. Each store calls matching API wrapper.
2. Mapper converts backend DTO snake_case to UI type camelCase.
3. Store surfaces backend errors through state.
4. Pages render loading/empty/error states.

### Phase 5: Page wiring

After `src/api`, CORS, `types`, and stores are stable, remaining UI work is mainly:

- replace mock imports with store selectors/actions
- load data on page mount
- render display fields instead of IDs
- submit forms through stores
- add loading/empty/error states
- remove dead mock/local action paths

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

- `types/` remains split by domain.
- No broad `types/medical.ts` reintroduced for multiple modules.
- IDs are kept in models but not displayed to normal users.
- Medical records render patient/doctor display fields.
- Prescriptions render patient/doctor display fields.
- `allergies` remains `string | null` unless backend changes DB/schema.
- Every backend domain used by UI has one clear owning store.
- `medicalStore.ts` is removed or reduced to a temporary compatibility layer.
- Store actions expose loading/error states.
- Store actions call API wrappers, not Axios/apiClient directly.
- Pages do not import `mockData` directly.
- Stores do not use mock data as API-error fallback.
- Pages do not manually transform backend snake_case DTOs.
- Status values match backend: `approved/rejected`, `untaken/taken/skipped`, `pending_verification/approved/rejected`.
