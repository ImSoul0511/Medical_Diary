# Frontend API Integration Plan

## Summary

- Convert the current `frontend/` from UI-only local state toward real FastAPI integration.
- Treat `backend/app/modules/**/router.py` and `schemas.py` as the API source of truth; do not rely on outdated API docs when they differ.
- Use backend API for business workflows, CRUD, validation, rate limiting, consent checks, emergency token management, doctor/admin operations, and notification read/update actions.
- Use Axios through one central client only: `frontend/src/api/apiClient.ts`.
- Direct Supabase access remains disallowed in this pass. Realtime notification planning is deferred.
- Access token lives in frontend RAM only. Refresh token is stored by backend in an HttpOnly cookie.
- No API failure may fall back to mock data. Mock fixtures can exist only as design/reference fixtures, not runtime fallback.

## API Client Rules

- `src/api/apiClient.ts` is the only file that may import `axios` or call `axios.create`.
- Endpoint wrappers in `src/api/*Api.ts` must import `apiClient`; pages, components, and stores must not import Axios directly.
- `apiClient` reads `VITE_API_BASE_URL` and defaults to `http://localhost:8000`.
- `apiClient` attaches `Authorization: Bearer <accessToken>` from `authStore` RAM state.
- `apiClient` must support JSON requests, `FormData` without a forced `Content-Type`, file/blob responses, empty `204` responses, and normalized backend errors.
- `apiClient` normalizes backend error payloads into `{ error_code, message, request_id, status }` where possible.
- `withCredentials` must not be enabled globally on the Axios instance.
- Credentialed Axios calls are allowed only for auth endpoints that need the HttpOnly refresh cookie:
  - `POST /auth/login` receives the refresh cookie from `Set-Cookie`.
  - `POST /auth/refresh` sends the refresh cookie and receives a rotated refresh cookie.
  - `POST /auth/logout` sends the refresh cookie so backend can clear it.

## Auth And Refresh Flow

- `LoginResponse` must not expose `refresh_token` to frontend JavaScript.
- Backend login sets the refresh token as an HttpOnly cookie.
- Frontend stores only the access token in RAM via `authStore.accessToken`.
- `authStore.setAccessToken(newToken)` is the central token update action.
- `apiClient` must call `authStore.setAccessToken(newToken)` before releasing queued requests after a successful refresh.
- `apiClient` uses a single-flight refresh lock:
  - The first non-refresh request that receives `401` and has not retried becomes the refresh owner.
  - The owner calls `POST /auth/refresh`.
  - Later `401` requests wait in a queue instead of calling refresh again.
  - After refresh succeeds, the owner updates RAM access token, resolves the queue with the new token, and retries the original request.
  - After refresh fails, the owner rejects every queued request, calls logout, clears RAM auth state, and redirects to login.
- Refresh and logout requests must be marked with `skipAuthRefresh`.
- The refresh endpoint must never retry itself. Otherwise a failed `/auth/refresh` could recursively call `/auth/refresh` again and loop forever.
- Every original request gets one `_retry` attempt only.

## Backend Auth Changes

- `POST /auth/login` returns access token and user brief only; refresh token is set as an HttpOnly cookie.
- `POST /auth/refresh` reads the refresh cookie, rotates the Supabase session, sets the new refresh cookie, and returns a fresh access token.
- `POST /auth/logout` clears the refresh cookie even if the access token has already expired.
- Refresh cookie requirements:
  - `HttpOnly`.
  - Intentional `Max-Age`.
  - Narrow path such as `/auth`.
  - `SameSite=Lax` for current local development.
  - `Secure=True` in production; local HTTP development may use `Secure=False`.
- Auth responses that set cookies should not be cached.

## CORS Rules

- Development CORS allows only `http://localhost:<port>` and `http://127.0.0.1:<port>`.
- Wildcard CORS must not be used with credentialed auth requests.
- `allow_credentials=True` is needed because login/refresh/logout use cookies.
- For local cookie testing, prefer one hostname consistently. Do not mix `localhost` frontend with `127.0.0.1` backend if debugging cookie behavior.
- A Vite proxy to `/api` is acceptable if the team wants same-origin cookie behavior during development.
- Cross-site production deployment requires a separate cookie review, likely `SameSite=None; Secure`.

## Guardrails

- `frontend/scripts/check-guardrails.mjs` enforces runtime wiring boundaries.
- It bans direct use of:
  - browser request APIs such as direct `fetch` calls and `XMLHttpRequest`;
  - direct browser Supabase client imports or `supabaseClient`;
  - `localStorage` and `sessionStorage`;
  - `service_role`, Supabase service-role keys, and secret-key patterns.
- It allows `axios` only in `src/api/apiClient.ts`.
- It allows at most one `axios.create(...)`.
- It allows `VITE_API_BASE_URL` only in `src/api/apiClient.ts` and `src/vite-env.d.ts`.
- It allows `withCredentials` only in `src/api/auth/authApi.ts`.
- It should fail CI/build checks when pages, components, stores, or endpoint wrappers bypass the central client.

## Endpoint Wiring

- Auth/User first:
  - `POST /auth/login`, `POST /auth/refresh`, `POST /auth/register`, `POST /auth/register-doctor`, `POST /auth/logout`.
  - `GET /auth/sessions`, `POST /auth/revoke-all`, `POST /auth/revoke-selected-session`.
  - `GET/PATCH /users/me`, `PATCH /users/privacy`, `GET /users/me/export`, `GET /users/me/access-history`, `GET /users/search-doctors`.
- Patient data:
  - `GET/POST /health-metrics`.
  - `GET/POST/DELETE /diaries`.
  - `GET /medical-records/me`.
  - `GET /prescriptions`, `GET /prescription-logs`, `PATCH /prescription-logs/{log_id}`.
- Consent/doctor/admin:
  - `GET/PATCH /consent/access-requests`, `POST /consent/revoke/{doctor_id}`, `GET /consent/history`.
  - `GET /doctors/search-patients?phone_number=...`, `GET /doctors/patients/{patient_id}`, `POST /doctors/request-access`.
  - `POST /medical-records`, `GET /medical-records/{patient_id}`, `POST /prescriptions`, `POST /prescriptions/{id}/items`, `DELETE /prescriptions/{id}`.
  - `GET /admin/doctors/pending`, `PATCH /admin/doctors/{doctor_id}/verify`, `GET /admin/audit-logs`.
- Emergency/notifications:
  - `POST /emergency/token`, `GET /emergency/tokens`, `GET /emergency/tokens/history`, `PATCH/DELETE /emergency/tokens/{token_id}`.
  - Public `GET /emergency/access/{token}`.
  - Backend notification endpoints stay authoritative for list/read state: `GET /notifications`, `PATCH /notifications/{id}/read`.
  - Do not wire internal cron endpoints into frontend.

## Store And Page Conversion

- Stores expose async actions for API workflows; components should call store actions or API wrappers, not direct Axios.
- Login/register/admin login must use backend auth. They must not create mock users or mock tokens.
- `AppShell` must not auto-login users in development.
- Logout must call backend logout, clear RAM state, and navigate to login.
- Keep DTOs close to backend shape at API boundaries, then map to UI models in dedicated mapper/store code.
- Errors should show backend `message` and `request_id` where available.

## Security Rules

- Do not persist access tokens in `localStorage`, `sessionStorage`, IndexedDB, or cookies controlled by frontend JavaScript.
- Do not expose refresh tokens to frontend JavaScript.
- Do not expose Supabase service-role key, admin key, internal cron token, or secret keys to frontend.
- Do not use direct frontend Supabase CRUD.
- Frontend role state is display/navigation state only. Backend authorization remains authoritative.
- Invalid or expired access tokens must produce `401` for protected endpoints.
- `403`, `422`, and `429` must be surfaced as backend errors, not treated as refresh-token expiry.
- Remove logs of JWTs, Authorization headers, cookies, refresh tokens, and Supabase keys before production.
- Production CORS must use explicit trusted origins.

## Test Plan

- `npm run build`.
- `npm run lint:guardrails`.
- API client unit tests:
  - bearer token header;
  - JSON body;
  - `FormData` content-type handling;
  - normalized errors;
  - `401` single-flight refresh;
  - refresh failure rejects the queue and logs out;
  - refresh/logout do not retry themselves.
- Auth/manual smoke tests:
  - login wrong password;
  - login role redirect;
  - refresh cookie exists after login;
  - reload restores RAM access token through `/auth/refresh`;
  - multiple concurrent protected requests trigger only one `/auth/refresh`;
  - logout clears RAM token and refresh cookie.
- Dev cookie/CORS tests:
  - test with consistent `localhost` or consistent `127.0.0.1`;
  - confirm `Access-Control-Allow-Origin` is explicit, not wildcard;
  - confirm credentialed login/refresh/logout work from Vite.

## Assumptions

- Backend runs at `http://localhost:8000` locally.
- Frontend Vite runs on a localhost or 127.0.0.1 port allowed by backend CORS.
- Backend API remains the source of truth for business logic and mutations.
- Realtime notification planning is intentionally skipped in this pass.
