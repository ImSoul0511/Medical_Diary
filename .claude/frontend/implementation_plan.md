# Frontend API Integration Plan

## Summary

- Convert the current `frontend/` from UI-only mock/local state to real FastAPI integration.
- Treat `backend/app/modules/**/router.py` and `schemas.py` as the API source of truth; do not rely on outdated API docs when they differ.
- Use backend API for all business workflows, CRUD, validation, rate limiting, consent checks, emergency token management, doctor/admin operations, and notification read/update actions.
- Direct Supabase access is allowed only for Realtime notification push. No direct frontend Supabase CRUD.
- Notifications use Supabase Realtime push plus backend polling/list fallback.
- Access token lives in frontend memory/RAM only. Refresh token is planned as an HTTP-only cookie managed by backend.
- Current baseline: `npm run build` passes, `npm run lint:guardrails` passes, and no runtime API wiring exists yet.

## Key Changes

- Add `src/services/` and `src/constants/endpoints.ts`.
  - Use `fetch`, not Axios, for backend API calls.
  - Read `VITE_API_BASE_URL` from env; add `.env.example` with `http://localhost:8000`.
  - Central `apiClient.ts` handles JSON, `FormData`, blob export, `204`, bearer auth, normalized `{ error_code, message, request_id }`, `401`, `403`, `422`, and `429`.
  - `apiClient.ts` sends `Authorization: Bearer <accessToken>` when an authenticated endpoint is called.
  - Future refresh flow calls backend `/auth/refresh` with `credentials: "include"` so backend can read the HTTP-only refresh cookie and return a fresh access token.
- Store access token in memory only.
  - `authStore` becomes real auth state: `accessToken`, `user`, `isAuthenticated`, `isLoading`, `error`.
  - Do not persist access tokens in `localStorage` or `sessionStorage`.
  - Backend should later set/rotate refresh token in an HTTP-only cookie during login/refresh/logout.
  - `apiClient` must not update refreshed tokens silently. Every successful refresh must call one central auth-store action such as `authStore.setAccessToken(newAccessToken)`.
  - Add a token-change bridge from `authStore` to Realtime: whenever `accessToken` changes, immediately call `supabase.realtime.setAuth(newAccessToken)`; when it becomes `null`, unsubscribe Realtime channels.
  - Add single-flight refresh inside `apiClient` so concurrent API calls in one tab share the same refresh promise instead of racing `/auth/refresh`.
  - Add transient multi-tab coordination with `BroadcastChannel` for `TOKEN_REFRESHING`, `TOKEN_REFRESHED`, `LOGOUT`, and optional notification sync events. Do not persist tokens in storage.
  - Remove `AppShell` auto-login mock behavior.
  - Add role guards in router; `/cap-cuu/:token`, login, register, admin login stay public.
- Add Supabase Realtime as a narrow exception.
  - Install `@supabase/supabase-js` only for notification Realtime.
  - Add `src/services/realtimeClient.ts` and `src/services/notificationsRealtime.ts`.
  - Read Supabase URL and anon/publishable key from frontend env. Never expose `service_role`, secret keys, refresh tokens, or internal tokens.
  - Configure Supabase client with `persistSession: false` and `autoRefreshToken: false`.
  - Before subscribing, call `supabase.realtime.setAuth(accessToken)`.
  - After every backend token refresh, call `supabase.realtime.setAuth(newAccessToken)`.
  - On logout, unsubscribe channels and clear frontend auth state.
  - If one tab refreshes successfully, broadcast the new access token and expiry to same-origin tabs so they can update RAM auth and Realtime auth without also rotating the refresh cookie.
- Keep API DTOs snake_case and map them to existing UI camelCase models.
  - Add mapper utilities so backend payloads are not ad hoc transformed inside pages.
  - Update UI types where backend differs: no live `systolic/diastolic`, notification uses `is_read`, consent request uses `request_id`, medical records show backend fields available.
- Update `scripts/check-guardrails.mjs`.
  - Allow `fetch(` only in `src/services/apiClient.ts`.
  - Allow `VITE_API_BASE_URL` only in API config/client.
  - Allow `@supabase/supabase-js` only in Realtime service/client files.
  - Allow Supabase frontend env vars only in Realtime config/client files.
  - Continue banning direct browser Supabase CRUD, direct fetch calls from pages/stores, `supabaseClient` outside the allowed Realtime boundary, `service_role`, secret keys, and token persistence in `localStorage` or `sessionStorage`.

## Endpoint Wiring

- Auth/User first:
  - `POST /auth/login`, `/auth/register`, `/auth/register-doctor`, `/auth/logout`, `/auth/sessions`, `/auth/revoke-all`, `/auth/revoke-selected-session`.
  - Future backend auth addition: `POST /auth/refresh` reads refresh cookie, rotates it with Supabase, and returns a new access token.
  - Future backend refresh must account for Supabase refresh-token rotation and reuse detection. Supabase refresh tokens are single-use, with a documented default reuse interval of 10 seconds for concurrency/offline cases; keep or verify this default before multi-tab production testing.
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
  - Backend notification endpoints stay authoritative for list/read state: `GET /notifications`, `PATCH /notifications/{id}/read`.
  - Supabase Realtime listens only for notification inserts on the `notifications` table.
  - Use backend polling/list fallback after login, when the topbar notification UI opens, after reconnect/refresh, and periodically while authenticated if needed.
  - Do not wire the internal endpoint `/prescriptions/internal/send-reminders` into the frontend.

## Realtime Notifications

- Realtime flow:
  - Backend inserts a row into `notifications`.
  - Supabase Realtime emits the insert over WebSocket.
  - Frontend receives the payload, maps it to UI notification shape, shows a toast, and increments unread count.
  - Frontend still reloads from `GET /notifications` to recover missed/offline notifications and to keep server truth.
  - Token refresh must flow through `authStore` so `apiClient` and Realtime stay synchronized. The sequence is: refresh succeeds, `authStore.setAccessToken(newToken)` runs, Realtime bridge calls `supabase.realtime.setAuth(newToken)`, then queued API calls retry.
- Supabase client rules:
  - Use anon/publishable key only.
  - Use `persistSession: false` and `autoRefreshToken: false`.
  - Do not call Supabase Auth sign-in/sign-out from frontend unless separately approved.
  - Do not use Supabase JS for `select`, `insert`, `update`, `delete`, RPC, or Storage in frontend.
- Subscription scope:
  - Subscribe only to `INSERT` on `public.notifications`.
  - The client-side `filter: user_id=eq.<currentUserId>` is convenience only. RLS is the security boundary.
  - Unsubscribe on logout and when the authenticated user changes.
- Notification read-state synchronization:
  - `PATCH /notifications/{id}/read` stays backend-only.
  - After a successful mark-read, the current tab updates local notification state immediately.
  - If `BroadcastChannel` is available, broadcast `NOTIFICATION_READ` so sibling tabs can update local state without waiting for polling.
  - Because Realtime listens only to `INSERT`, other tabs must still reconcile read state through `GET /notifications` when the dropdown opens, the tab regains focus/visibility, reconnect happens, token refresh succeeds, or periodic fallback runs.

## Store And Page Conversion

- Replace runtime mock initialization with empty/null live state; keep `mockData` only as fixtures/reference, not fallback after failed API calls.
- Stores expose async actions only; components do not call `fetch` directly.
  - `authStore`: login/register/logout/session restore/refresh, central `setAccessToken`, single active user state, BroadcastChannel auth events.
  - `userStore`: profile, privacy, export, access history, doctor search.
  - `medicalStore`: metrics, diaries, records, prescriptions, prescription logs.
  - `consentStore`: pending requests, approve/reject, revoke, history.
  - `notificationStore`: load, mark read, unread count from `is_read`, receive Realtime inserts.
- Pages keep their current layout, but submit/load handlers call store actions:
  - Login/register redirect by backend role.
  - Dashboard loads profile + metrics + diaries + records + prescriptions + notifications.
  - Doctor search uses `phone_number` only, matching backend.
  - Public emergency view never requires auth and handles `404`, `410`, and `429` with clear Vietnamese copy.

## Security Rules

- RLS must be verified before enabling Supabase Realtime in production.
  - `notifications` must have RLS enabled.
  - Authenticated users must only be able to `SELECT` their own notification rows.
  - Preferred policy shape: `auth.uid() IS NOT NULL AND user_id = auth.uid()`.
  - Frontend roles must not receive `INSERT`, `UPDATE`, or `DELETE` grants on `notifications`.
  - Anonymous clients must not receive private notifications.
- Realtime publication must stay narrow.
  - Only `notifications` may be added to `supabase_realtime`.
  - Do not add medical, consent, prescription, profile, emergency, or audit tables without a separate security review and user confirmation.
- Backend RLS and auth context must be audited.
  - Confirm the database role used by `DATABASE_URL` does not bypass RLS if backend relies on DB RLS.
  - If the DB role bypasses RLS, treat backend service checks as the real security boundary and document that decision.
  - Verify `request.jwt.claims` is set before protected DB queries.
  - Invalid/expired tokens must produce `401` for protected endpoints, not anonymous protected access.
  - Remove debug prints/logs of JWTs, Authorization headers, cookies, refresh tokens, and Supabase keys before production.
- SQL security rules:
  - Every `SECURITY DEFINER` function must set a safe `search_path`.
  - Internal cron endpoints must not use fallback secrets in production.
  - Do not expose admin Supabase key, service role key, or internal cron token to frontend.
- HTTP/cookie rules:
  - Refresh cookie must be `HttpOnly`, `Secure`, `SameSite=Lax` or stricter, and have an intentional `Max-Age`.
  - Refresh responses and authenticated responses that set cookies must not be cached.
  - Production CORS must use explicit trusted origins, not wildcard origins.
  - Credentialed requests must use `credentials: "include"` only for refresh/logout endpoints that need the HTTP-only cookie.
  - Dev cookie tests must not mix `127.0.0.1` frontend with `localhost` backend if relying on same-site cookie behavior. Use the same hostname for both sides or proxy backend through Vite.
  - Recommended dev setup: run Vite on `localhost` and call `http://localhost:8000`, or configure Vite proxy `/api -> http://localhost:8000` and set `VITE_API_BASE_URL=/api`.
  - If backend and frontend are deployed cross-site, cookie policy must be revisited; cross-site cookies require `SameSite=None; Secure`.
- RLS policy quality:
  - No broad `USING (true)` on sensitive tables.
  - Do not base authorization on user-editable metadata.
  - Consent-related access must be checked against database consent state, not frontend state.
  - Add/verify indexes for columns used in RLS predicates, especially `user_id`, `patient_id`, `doctor_id`, and notification `user_id`.

## Test Plan

- Add Vitest for API client/unit tests.
- Unit scenarios:
  - bearer token header, JSON body, `FormData` without manual `Content-Type`, blob export, `204`, normalized errors, `401` session clear/refresh, `403`, `422`, and `429` friendly message.
  - mapper tests for auth, user privacy, consent, notifications, prescriptions, emergency.
  - guardrail tests/checks for no persisted token storage and no direct Supabase CRUD.
- Auth/manual API smoke scenarios:
  - login wrong password.
  - login role redirect.
  - reload restores RAM access token through backend refresh cookie flow.
  - logout clears RAM access token, refresh cookie, and Realtime subscription.
  - multiple concurrent API calls in one tab trigger only one `/auth/refresh`.
  - a token refresh updates `authStore` and immediately updates Realtime auth through `supabase.realtime.setAuth(newAccessToken)`.
  - a new tab with empty RAM access token restores session through the refresh cookie.
  - two tabs refreshing near-simultaneously do not log each other out; verify Supabase refresh-token reuse interval behavior.
  - patient profile/privacy save, diary create/delete, metrics create/list, prescription log status update.
  - doctor patient search/request access, consent approve/reject/revoke.
  - emergency token create/list/public scan/expired-invalid handling.
  - admin pending doctor verify and audit filter.
- Realtime/RLS scenarios:
  - User A receives only User A notification inserts.
  - User A cannot select or receive User B notifications through Supabase Realtime.
  - Anonymous client receives no private notifications.
  - Expired access token disconnects/fails, backend refresh returns new access token, and `supabase.realtime.setAuth(newAccessToken)` restores subscription.
  - Missed/offline notifications appear after `GET /notifications`.
  - Tab A marks a notification as read; Tab B reflects the state through `BroadcastChannel` or by reloading `GET /notifications` when the dropdown opens.
  - Notification dropdown reload shows correct `is_read` state after backend `PATCH /notifications/{id}/read`.
- Dev cookie/CORS scenarios:
  - Test with unified `localhost` hostname or Vite `/api` proxy.
  - Confirm refresh cookie is sent on refresh with `credentials: "include"`.
  - Confirm wildcard CORS is not used for credentialed production requests.
- Security verification:
  - Confirm `notifications` RLS and grants in Supabase SQL editor.
  - Confirm only `notifications` is in the Realtime publication.
  - Inspect frontend bundle/env for no service-role key, no secret key, and no persisted access/refresh tokens.
  - Remove current debug token prints from `RLSMiddleware` before production.
- Final verification:
  - `npm run build`
  - `npm run lint:guardrails`
  - `npm test`
  - responsive sanity check on key patient/doctor/admin/public pages.

## Assumptions

- Backend runs at `http://localhost:8000` locally.
- Frontend dev server should use the same hostname as backend for cookie testing, preferably `http://localhost:5174`, or use a Vite `/api` proxy to avoid `127.0.0.1` vs `localhost` cookie/CORS confusion.
- Backend API remains the source of truth for business logic and mutations.
- Direct Supabase frontend access is limited to Realtime notifications only.
- Token persistence uses memory/RAM for access token and future HTTP-only cookie for refresh token. Same-origin tabs may exchange access tokens transiently through `BroadcastChannel`, but never through persistent storage.
- Backend will add refresh-token support before production auth is finalized.
- Supabase refresh-token rotation and default reuse interval must be verified in backend auth implementation before multi-tab production rollout.
- Supabase Realtime requires `backend/supabase/policies/008_enable_realtime_notifications.sql` or an equivalent reviewed SQL setup to be applied.
- No API fallback to mock data in production behavior; errors show backend `message` and `request_id` where available.
- Supabase session/refresh-token behavior reference: https://supabase.com/docs/guides/auth/sessions.
