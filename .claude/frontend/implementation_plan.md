# Frontend API Integration Plan

## Summary

- Convert the current `frontend/` from UI-only mock/local state to real FastAPI integration.
- Treat `backend/app/modules/**/router.py` and `schemas.py` as the API source of truth; do not rely on outdated API docs when they differ.
- Keep this as a frontend-only task: no backend edits, no Supabase SDK, no direct Supabase client. Notifications use backend polling.
- Current baseline: `npm run build` passes, `npm run lint:guardrails` passes, and no runtime API wiring exists yet.

## Key Changes

- Add `src/services/` and `src/constants/endpoints.ts`.
  - Use `fetch`, not Axios.
  - Read `VITE_API_BASE_URL` from env; add `.env.example` with `http://localhost:8000`.
  - Central `apiClient.ts` handles JSON, `FormData`, blob export, `204`, bearer auth, normalized `{ error_code, message, request_id }`, `401`, `403`, `422`, and `429`.
- Store auth token in `sessionStorage`.
  - `authStore` becomes real auth state: `token`, `user`, `isAuthenticated`, `isLoading`, `error`.
  - Remove `AppShell` auto-login mock behavior.
  - Add role guards in router; `/cap-cuu/:token`, login, register, admin login stay public.
- Keep API DTOs snake_case and map them to existing UI camelCase models.
  - Add mapper utilities so backend payloads are not ad hoc transformed inside pages.
  - Update UI types where backend differs: no live `systolic/diastolic`, notification uses `is_read`, consent request uses `request_id`, medical records show backend fields available.
- Update `scripts/check-guardrails.mjs`.
  - Allow `fetch(` only in `src/services/apiClient.ts`.
  - Allow `VITE_API_BASE_URL` only in API config/client.
  - Continue banning `@supabase/supabase-js`, `supabaseClient`, direct browser Supabase, and direct fetch calls from pages/stores.

## Endpoint Wiring

- Auth/User first:
  - `POST /auth/login`, `/auth/register`, `/auth/register-doctor`, `/auth/logout`, `/auth/sessions`, `/auth/revoke-all`, `/auth/revoke-selected-session`.
  - `GET/PATCH /users/me`, `PATCH /users/privacy`, `GET /users/me/export`, `GET /users/me/access-history`, `GET /users/search-doctors`.
- Patient data:
  - `GET/POST /health-metrics`, `GET/POST/DELETE /diaries`.
  - `GET /medical-records/me`, `GET /prescriptions`, `GET /prescription-logs`, `PATCH /prescription-logs/{log_id}`.
- Consent/doctor/admin:
  - `GET/PATCH /consent/access-requests`, `POST /consent/revoke/{doctor_id}`, `GET /consent/history`.
  - `GET /doctors/search-patients?phone_number=...`, `GET /doctors/patients/{patient_id}`, `POST /doctors/request-access`.
  - `POST /medical-records`, `GET /medical-records/{patient_id}`, `POST /prescriptions`, `POST /prescriptions/{id}/items`, `DELETE /prescriptions/{id}`.
  - `GET /admin/doctors/pending`, `PATCH /admin/doctors/{doctor_id}/verify`, `GET /admin/audit-logs`.
- Emergency/notifications:
  - `POST /emergency/token`, `GET /emergency/tokens`, `GET /emergency/tokens/history`, `PATCH/DELETE /emergency/tokens/{token_id}`, public `GET /emergency/access/{token}`.
  - `GET /notifications`, `PATCH /notifications/{id}/read`.
  - Poll notifications after login, when the topbar notification UI opens, and every 60 seconds while authenticated and the document is visible.

## Store And Page Conversion

- Replace runtime mock initialization with empty/null live state; keep `mockData` only as fixtures/reference, not fallback after failed API calls.
- Stores expose async actions only; components do not call `fetch` directly.
  - `authStore`: login/register/logout/session restore.
  - `userStore`: profile, privacy, export, access history, doctor search.
  - `medicalStore`: metrics, diaries, records, prescriptions, prescription logs.
  - `consentStore`: pending requests, approve/reject, revoke, history.
  - `notificationStore`: load, mark read, unread count from `is_read`.
- Pages keep their current layout, but submit/load handlers call store actions:
  - Login/register redirect by backend role.
  - Dashboard loads profile + metrics + diaries + records + prescriptions + notifications.
  - Doctor search uses `phone_number` only, matching backend.
  - Public emergency view never requires auth and handles `404`, `410`, and `429` with clear Vietnamese copy.

## Test Plan

- Add Vitest for API client/unit tests.
- Unit scenarios:
  - bearer token header, JSON body, `FormData` without manual `Content-Type`, blob export, `204`, normalized errors, `401` session clear, `429` friendly message.
  - mapper tests for auth, user privacy, consent, notifications, prescriptions, emergency.
- Manual/API smoke scenarios:
  - login wrong password, login role redirect, reload restores `sessionStorage` token.
  - patient profile/privacy save, diary create/delete, metrics create/list, prescription log status update.
  - doctor patient search/request access, consent approve/reject/revoke.
  - emergency token create/list/public scan/expired-invalid handling.
  - admin pending doctor verify and audit filter.
- Final verification:
  - `npm run build`
  - `npm run lint:guardrails`
  - `npm test`
  - responsive sanity check on key patient/doctor/admin/public pages.

## Assumptions

- Backend runs at `http://localhost:8000` locally.
- Token persistence uses `sessionStorage`, as selected.
- Notifications use backend polling, as selected; Supabase Realtime is out of scope until separately confirmed.
- Do not wire the internal endpoint `/prescriptions/internal/send-reminders` into the frontend.
- No API fallback to mock data in production behavior; errors show backend `message` and `request_id` where available.
