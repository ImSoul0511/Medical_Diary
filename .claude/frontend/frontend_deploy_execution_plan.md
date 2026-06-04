# Frontend Deploy Execution Plan

## Purpose

Ke hoach nay dung de theo doi cac phase dua frontend den trang thai deploy duoc sau khi `src/api` duoc dev khac xu ly xong.

Pham vi hien tai:

- Cap nhat `pages/components` theo `types/store/api wrapper` voi assumption API wrapper da dung backend.
- `frontend/src/api` da duoc dua vao scope sau confirm rieng ngay 2026-06-04.
- Khong them Supabase client o frontend.
- Khong fallback sang mock data khi API loi.

## Source Of Truth

- `AGENTS.md` yeu cau follow moi file `.claude` co `trigger: always_on`.
- `.claude/tasks/AGENTS.md` noi API docs cu da outdated. Khi can endpoint, doc truc tiep `backend/app/modules/<module>/router.py` va `schemas.py`.
- `.claude/frontend/implementation_plan.md` la rule chinh cho Axios, auth token, CORS, guardrails, store/page conversion.
- `.claude/frontend/store_types_implementation_plan.md` la rule chinh cho ownership cua `types`, `store`, va `mappers`.

## Current Assumptions

- `frontend/src/api` la wrapper cua backend endpoint va do dev khac phu trach.
- Endpoint path, method, request, response se duoc doi chieu voi backend routers/schemas neu gap loi.
- API wrapper co the khac backend raw shape o diem camelCase, nhung phai giu semantic tuong ung voi backend.
- Sau confirm 2026-06-04, duoc phep sua `src/api` de khop backend routers/schemas hien tai.
- Store goi API wrapper, khong import Axios hoac `apiClient` truc tiep.
- Page/component goi store selectors/actions, khong import Axios, khong direct `fetch`, khong import `mockData` runtime.

## Progress Log

- [x] Auth naming update: `AuthUser.displayName` da duoc chuyen ve `AuthUser.fullName`.
- [x] `authStore` da map current user bang `fullName` de khop type UI hien tai.
- [x] `AuthUser.subtitle` duoc giu optional vi shell/topbar/sidebar co nhu cau hien thi context phu.
- [x] Requirement moi da them vao plan: cap nhat `pages/components` theo `types/store/api wrapper` voi API wrapper assumption.
- [x] Plan nay da ghi ro khong sua `src/api` khi chua co confirm.
- [x] 2026-06-04 codebase check: `npm run lint:guardrails` passed.
- [x] 2026-06-04 codebase check: `npm run build` was run and failed because pages/hooks/mock fixtures still target old types/store contracts.
- [x] 2026-06-04 review update: added build-error breakdown, Phase 1 gate, `RegisterMode` blocker, `medicalStore` consumers, and consent backend mismatch notes.
- [x] 2026-06-04 implementation update: migrated pages/hooks/components off runtime mock data and old local actions.
- [x] 2026-06-04 implementation update: deleted `frontend/src/constants/mockData.ts`.
- [x] 2026-06-04 implementation update: deleted unused compatibility `frontend/src/store/medicalStore.ts`.
- [x] 2026-06-04 verification update: `npm run build` passed.
- [x] 2026-06-04 verification update: `npm run lint:guardrails` passed.
- [x] 2026-06-04 local cookie update: Vite dev server is running at `http://localhost:5174/` to match `VITE_API_BASE_URL=http://localhost:8000`.
- [x] 2026-06-04 API update: removed `apiClient` export from `src/api/index.ts`.
- [x] 2026-06-04 API update: aligned module wrappers with current backend routers/schemas for users, consent, diaries, doctors, emergency, health_metrics, medical_records, notifications, prescriptions, and admin.
- [x] 2026-06-04 store update: replaced runtime `apiWrapperMissing` call sites with real API wrapper calls through mappers.
- [x] 2026-06-04 import update: stores now import API wrappers from module folders such as `api/auth/authApi` and `api/medical_records/medicalRecordApi`.
- [x] 2026-06-04 verification update: `npm run build` passed after API/store rewiring.
- [x] 2026-06-04 verification update: `npm run lint:guardrails` passed after guardrail path update.
- [ ] Phase tiep theo: smoke test voi backend reachable.

## Phase Dependencies

```txt
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
              gate        stable      can overlap with Phase 4    validation
```

Rules:

- Phase 3 must not add display fields to frontend types until Phase 1 verifies backend routers/schemas.
- Phase 4 can be handled while touching Phase 3 files, but all runtime mock imports must be gone before Phase 5 can pass.
- Phase 5 is a validation gate for Phase 3 and Phase 4, not a separate feature phase.

## Rough Effort Estimate

- Phase 1: about 1 focused session for backend schema mismatch report.
- Phase 3: about 2-3 sessions because it touches most page wiring.
- Phase 4: about 30 minutes if handled alongside Phase 3; longer if mock fixtures must be preserved outside runtime.
- Phase 5: about 1 session for final build fixes and guardrails verification.
- Phase 6: about 1 session with reachable backend and deploy-like env.

## Latest Codebase Check: 2026-06-04

Assumption used for this check:

- API wrapper is completed by another dev.
- Backend is deployed and reachable.

Current result:

- [x] Guardrails pass: Axios is centralized and banned browser API/storage/Supabase wiring was not found.
- [x] No direct Axios import found outside `frontend/src/api/apiClient.ts`.
- [x] No direct `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, or frontend Supabase client usage found in runtime `src`.
- [x] Pages/components/hooks do not import API wrappers directly in the current scan.
- [x] Stores call API wrappers instead of Axios/apiClient directly.
- [x] `authStore` uses RAM `accessToken`; no browser storage token persistence was found.
- [x] `apiClient` has a 401 refresh lock/queue, `_retry`, and `skipAuthRefresh` handling.
- [x] `authApi` uses `withCredentials` only for login/refresh/logout.
- [x] `apiClient` reads `VITE_API_BASE_URL` with fallback `http://localhost:8000`.
- [x] Frontend build passes.
- [x] Runtime mock imports were removed from pages.
- [x] Hooks/pages were moved off old local/mock store action names.
- [x] Pages were moved off removed `types/medical` and old mock-only fields.
- [x] Runtime API-wrapper placeholders were removed from store actions.
- [x] Backend auth refresh mismatch resolved: `backend/app/modules/auth/router.py` exposes `POST /auth/refresh` again.

Previous build-error snapshot:

These were the main build blockers before the implementation pass. They are currently resolved enough for `npm run build` to pass.

| File | Approx errors | Main issue |
| --- | ---: | --- |
| `ProfilePage.tsx` | 14 | removed `types/medical`, old `updateProfileLocal`, null-safety, missing `phoneNumber`/`address` |
| `PatientDashboard.tsx` | 8 | old metric/log/record fields, nullable `profile` |
| `EmergencyPublicView.tsx` | 6 | nullable `profile` |
| `PrivacySettings.tsx` | 5 | old `updatePrivacyLocal`, nullable `profile` |
| `HealthMetricsPage.tsx` | 3 | `systolic`/`diastolic` no longer in current metric types |
| `ConsentManagement.tsx` | 3 | UI expects `specialty`/`hospital`, backend consent schemas do not return them |
| `DoctorPatientDetail.tsx` | 3 | removed `types/medical`, old mock profile fields, old `Prescription.title` |
| `DoctorSearch.tsx` | 2 | old mock profile fields `phoneNumber`/`address` |
| `RegisterPage.tsx` | 1 | missing `RegisterMode` export or local type |

Main blockers found:

- [x] `Topbar` and `useNotifications` moved from `Notification.unread` to `isRead`.
- [x] Old `*Local` actions were removed from pages/hooks.
- [x] Removed `../../types/medical` imports from pages.
- [x] Removed runtime `mockData` page imports.
- [x] Removed old fields such as `systolic`, `diastolic`, `medicineName`, `scheduledAt`, `MedicalRecord.title`, and `Prescription.title`.
- [x] Added `RegisterMode` to `types/auth.ts`.
- [x] Removed consent UI references to backend-missing `specialty/hospital`.
- [x] Added null-safe rendering for nullable store state such as `profile`.
- [x] Deleted `mockData.ts` from runtime `src`.

Remaining Runtime Gaps:

- [x] `notificationStore.loadNotifications()` and `markAsRead()` now use `notificationsApi`.
- [x] `doctorStore` actions now use `doctorsApi`.
- [x] `adminStore` actions now use `adminApi`.
- [x] `emergencyStore` actions now use `emergencyApi`.
- [x] `consentStore` review/approve/reject/revoke actions now use backend-aligned consent endpoints.
- [x] `medicalRecordStore.loadMine()` and `loadPatientRecords()` now use backend-aligned medical record endpoints.
- [x] `prescriptionStore.updateLogStatus()`, `addPrescriptionItem()`, and `deletePrescription()` now use `prescriptionApi`.
- [x] `authStore.registerDoctor()` now uses multipart `authApi.registerDoctor()`.
- [x] Backend mismatch resolved: `auth/router.py` exposes `POST /auth/refresh` for frontend refresh lock.
- [ ] Smoke test with real backend still pending.

## Phase 0: Baseline And Rule Audit

- [x] Doc `AGENTS.md`.
- [x] Doc `.claude/tasks/AGENTS.md`.
- [x] Doc `.claude/frontend/implementation_plan.md`.
- [x] Doc `.claude/frontend/store_types_implementation_plan.md`.
- [x] Xac nhan backend routers/schemas la source of truth khi can endpoint.
- [x] Xac nhan khong dung API docs cu lam source of truth.
- [x] Xac nhan khong them Supabase frontend client.
- [x] Xac nhan khong sua `src/api` trong task planning nay before API-scope confirm.
- [x] 2026-06-04 user confirmed API import/wrapper fix scope, so `src/api` changes are allowed for this pass.

Exit criteria:

- [x] Plan khong vi pham AGENTS va always-on rules.

## Phase 1: Contract Snapshot

Muc tieu: dong bang contract UI hien tai truoc khi sua page.

Gate status: complete for current page migration. Remaining issues are API-wrapper/store placeholders, not UI contract discovery.

- [x] Liet ke toan bo imports cu tu `frontend/src/types/medical.ts` va `frontend/src/types/user.ts`.
- [x] Liet ke page/component/hook dang doc field khong con ton tai trong type moi.
- [x] Liet ke page/component/hook dang goi local/mock store action cu.
- [x] Liet ke page/component/hook dang import `mockData` runtime.
- [x] Doi chieu consent mismatch voi backend `router.py`/`schemas.py`.
- [x] Doi chieu notification mismatch voi backend `router.py`/`schemas.py`.
- [x] Doi chieu doctor/user profile mismatch voi backend `router.py`/`schemas.py`.
- [x] Ghi report mismatch truoc khi sua neu can thay doi ngoai `pages/components/hooks`.

Resolved mismatches:

- `Notification.unread` da chuyen sang `isRead`.
- `useConsent` khong con goi action local cu.
- `useNotifications` khong con goi action local cu va field cu.
- Pages khong con import broad `types/medical`. File nay da bi xoa; khong restore.
- Pages khong con hien thi field mock nhu `MedicalRecord.title`, `Prescription.title`, `HealthMetric.systolic/diastolic`.
- Profile pages da null-safe voi `userStore.profile`.
- `RegisterMode = "patient" | "doctor"` da duoc export tu `types/auth.ts`.

Backend-verified mismatch:

- Consent `AccessRequestItem` currently returns `request_id`, `doctor_id`, `doctor_name`, `requested_scope`, `reason`, `status`, `requested_at`.
- Consent `ConsentHistoryItem` currently returns `doctor_id`, `doctor_name`, `scope`, `granted_at`, `expires_at`.
- Therefore `AccessRequest.specialty`, `AccessRequest.hospital`, and `ActivePermission.specialty` must not be added blindly to UI types unless backend is changed first.

## Phase 2: Store And Mapper Stabilization

Muc tieu: dam bao store/mappers la layer trung gian on dinh giua API wrapper va UI.

- [x] Tao `frontend/src/mappers/` theo domain.
- [x] Tao/cap nhat cac domain stores thieu theo plan.
- [x] Giu `medicalStore.ts` o dang compatibility layer trong qua trinh migration, sau do xoa khi khong con consumer.
- [x] Store khong fallback mock sau API error.
- [x] Store khong import Axios hoac `apiClient` truc tiep.
- [x] Chay lai TypeScript build sau khi page/hook duoc wire lai.
- [x] Neu store/action mismatch voi API wrapper assumption, report truoc khi sua `src/api`.

Current `medicalStore.ts` consumers to migrate before removing compatibility layer:

- [x] `frontend/src/pages/Profile/ProfilePage.tsx`
- [x] `frontend/src/pages/HealthMetrics/HealthMetricsPage.tsx`
- [x] `frontend/src/pages/Diary/DiaryPage.tsx`
- [x] `frontend/src/pages/Dashboard/PatientDashboard.tsx`
- [x] `frontend/src/pages/Dashboard/DoctorPatientDetail.tsx`
- [x] `frontend/src/store/medicalStore.ts` deleted after consumers were migrated.

## Phase 3: Pages And Components Wiring

Muc tieu: cap nhat UI theo `types/store/api wrapper` voi assumption API wrapper da dung backend.

- [x] Thay imports tu type cu sang domain type moi.
- [x] Thay store actions local/mock bang async store actions hien tai.
- [x] Page load data qua store action trong lifecycle phu hop.
- [x] Form submit qua store action, khong goi API wrapper truc tiep tru khi component that su la thin workflow boundary da duoc confirm.
- [x] Hien thi loading/empty/error state tu store.
- [x] Hien thi display fields thay vi ID cho user thong thuong.
- [x] Dung `fullName` thay cho `displayName` trong auth-related UI.
- [x] Fix null-safety cho `profile`, selected records, selected prescriptions, public emergency profile.
- [x] Khong manual transform snake_case DTO trong page/component.

Primary targets:

- [x] `Topbar`: replace `unread`, `markAsReadLocal`, `clearAllLocal`.
- [x] `Sidebar`/`AppShell` auth display
- [x] Patient dashboard: migrate off `medicalStore`, remove old metric/log/record fields, add null-safety.
- [x] Diary page: migrate off `medicalStore`.
- [x] Health metrics page: migrate off `medicalStore`, remove unsupported BP fields unless backend/type changes.
- [x] Profile/privacy/consent pages: migrate off old local actions, fix nullable `profile`, handle consent fields per backend.
- [x] Medical records pages
- [x] Prescriptions and prescription logs pages
- [x] Doctor search/detail/prescription pages
- [x] Admin doctor approval/audit pages
- [x] Emergency token/public view pages
- [x] Notification hooks/components: replace old local actions and old unread/audience fields.
- [x] Register page: add or localize `RegisterMode`, then wire real register workflow.

## Phase 4: Runtime Mock Removal

Muc tieu: khong con runtime path nao fallback sang mock data.

- [x] Remove page/component imports tu `frontend/src/constants/mockData.ts`.
- [x] Remove auto-login/dev mock token path neu con.
- [x] Neu mock fixtures con can cho design/test, doi ten/di chuyen ra ngoai runtime `src` import path.
- [x] `mockData.ts` must be deleted, moved outside `src`, or rewritten against current split types. Since TypeScript compiles files in `src`, unused broken mock files still block build.
- [x] API failure phai surface backend error, khong load fixture thay the.

## Phase 5: Build And Guardrails

Muc tieu: frontend pass cac check toi thieu de deploy.

- [x] Chay `npm run lint:guardrails`. Latest result: passed.
- [x] Chay `npm run build`. Latest result: passed. Vite emitted only a chunk-size warning.
- [x] Start local dev server. Latest result: running at `http://localhost:5174/`.
- [x] Fix TypeScript errors trong pham vi pages/components/hooks/store/types.
- [x] Khong fix bang cach bypass type voi `any` neu co the map dung contract.
- [x] Neu loi den tu `src/api`, report de dev API xu ly hoac xin confirm truoc khi sua.

## Phase 6: Manual Smoke Before Deploy

Muc tieu: dam bao flow chinh chay duoc voi backend that.

- [ ] Login sai password hien backend error.
- [ ] Login dung role redirect dung route.
- [ ] Reload goi refresh va khoi phuc access token RAM.
- [ ] Nhieu request protected dong thoi chi trigger mot refresh owner.
- [ ] Logout clear RAM state va refresh cookie.
- [ ] Patient pages load du lieu that hoac empty state dung.
- [ ] Doctor pages khong hien du lieu khi chua co consent.
- [ ] Admin pages khong fallback mock khi API fail.
- [ ] Emergency public view chi hien du lieu public duoc phep.

## AGENTS Compliance Review

Ket qua ra soat sau khi tao plan:

- [x] 2026-06-04: Da doc lai plan va keyword-audit cac diem nhay cam: API docs, backend routers/schemas, Supabase, secret, Axios/apiClient, fetch, token storage, mock fallback.
- [x] Khong dua API docs cu lam source of truth.
- [x] Co rule doi chieu backend `router.py` va `schemas.py` khi can endpoint.
- [x] Khong yeu cau them Supabase frontend client.
- [x] Khong yeu cau frontend dung service role/admin key/secret key.
- [x] Khong cho phep direct Axios ngoai `src/api/apiClient.ts`.
- [x] Khong cho phep page/component/store direct `fetch`.
- [x] Khong cho phep access token vao `localStorage`/`sessionStorage`.
- [x] Khong cho phep mock data fallback runtime.
- [x] Ghi ro `src/api` do dev khac phu trach va khong sua khi chua co confirm.
- [x] Giu nguyen cac rule Axios/credential trong `.claude/frontend/implementation_plan.md`; plan nay khong yeu cau sua `withCredentials` hay `apiClient`.

Conclusion:

- Plan nay phu hop voi `AGENTS.md` va cac rule `trigger: always_on` lien quan.
- Phase 3 UI migration da xong va build pass. Rui ro con lai nam o API-wrapper placeholders va smoke test voi backend that.
