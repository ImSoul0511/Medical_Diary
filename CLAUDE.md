# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory First Step

**Read `backend/docs/SYSTEM_DESIGN_SSOT.md` before any architectural decision or code change.** It is the Single Source of Truth (SSOT) for the entire project — roles, permissions, data tiers, API specs, and database design.

## Commands

All commands run from `backend/`:

```bash
# Start the API (hot-reload enabled via volume mount)
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Stop
docker-compose down

# Run migrations manually
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "description"
```

API is at `http://localhost:8000`. Swagger UI is at `http://localhost:8000/docs`.

No test or lint tooling exists yet.

## Required Environment Variables

Create `backend/.env` with:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
JWT_SECRET=
ENCRYPTION_KEY=
```

Optional: `ALGORITHM` (default HS256), `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30), `ADMIN_IP_ALLOWLIST` (default 127.0.0.1), `SENTRY_DSN`, `DEBUG`.

## Architecture

**FastAPI + Supabase backend.** No frontend exists yet. Uses SQLAlchemy 2.0 async (asyncpg) for direct DB queries alongside Supabase client.

### Module Structure (DDD)

Every implemented module under `app/modules/<name>/` has four files:

- **`models.py`** — SQLAlchemy ORM models. Imported by Alembic for schema generation.
- **`schemas.py`** — Pydantic models for request/response validation only. No business logic.
- **`service.py`** — All business logic as an OOP class (`XService`). Uses `AsyncSession`. HTTP-agnostic (never imports `Request`).
- **`router.py`** — Thin HTTP layer: declares routes, instantiates service, calls methods, returns responses. No DB queries here.

### Core Components

- **`app/core/config.py`** — `Settings` class: all env vars with defaults.
- **`app/core/database.py`** — `AsyncEngine`, `async_session_factory`, `Base`. `get_db()` dependency injects RLS context (`request.jwt.claims`, `app.encryption_key`) via `SET LOCAL` before each query.
- **`app/core/security.py`** — `create_access_token()` (JWT with `sub`, `sid`, `role`). `get_current_user()` validates token cryptographically + checks session active in DB.
- **`app/core/rate_limiter.py`** — SlowAPI limiter (`get_remote_address`).
- **`app/middlewares/rls.py`** — Decodes Bearer token, injects claims into `request.state` for downstream RLS.
- **`app/middlewares/logging.py`** — Request/response logging.

### Shared Utilities (`app/shared/`)

- **`schemas.py`** — `ErrorResponse`, `MessageResponse`, `PaginatedResponse[T]`.
- **`dependencies.py`** — `get_supabase_client()`, `get_current_user`, `require_role()` factory.
- **`consent.py`** — `check_consent(db, doctor_id, patient_id, scope)` — validates doctor-patient consent + expiration before granting access.

### Data & Security Rules

- **No hard-deletes.** Always use `deleted_at` (soft-delete).
- **Audit logs** are handled by PostgreSQL triggers, not application code. `DataAccessLog` is never written by app code.
- **Sensitive data** (`phone_encrypted`, `cccd_encrypted`) encrypted with `pgcrypto` (`pgp_sym_encrypt`) at DB level using `app.encryption_key` session variable.
- **Error responses** must follow: `{ "error_code": "...", "message": "...", "request_id": "..." }`.
- **Admin routes** are restricted by IP allowlist, not just JWT role.
- **JWT + Session duality** — tokens are stateless but validated against active sessions in DB (enables logout without waiting for cryptographic expiry).
- **Consent-based doctor access** — always call `check_consent()` before returning patient private data to a doctor.
- **Consent expiry** — `consent_permissions.expires_at` is `NULL` (permanent) or a timestamp (auto-revoke when past). Added in migration `0aac322b299d`.

### User Data Tiers

Users have three privacy tiers controlled by `privacy_settings` (JSONB):

1. **Public View** — blood type, allergies, emergency contact (visible via QR scan).
2. **Private Vitals** — heart rate, steps, respiratory rate (default private, opened via consent).
3. **Private Diary** — free-text notes + symptom ratings 1–10.

Doctors access private tiers only after user grants explicit, scope-based consent. Consent can be revoked at any time.

### Modules

| Module | Status | Responsibility |
|--------|--------|---------------|
| `auth` | ✅ Implemented | Login, JWT, sessions, logout, revoke sessions. MFA (TOTP) deferred. |
| `users` | ✅ Implemented | Profiles, privacy settings, data export (JSON/PDF), access history, doctor search |
| `consent` | ✅ Implemented | Grant/revoke doctor access, access requests (approve/reject), consent history, expires_at |
| `health_metrics` | ✅ Implemented | Vitals from wearables (heart rate, steps, respiratory rate) with date range filter |
| `diaries` | ✅ Implemented | Personal diary entries (content + symptoms JSONB), soft-delete |
| `prescriptions` | ✅ Implemented | Prescription list, prescription logs (trigger-created), log status update |
| `medical_records` | ✅ Implemented | User reads own records. Doctor create/read deferred to Phase 4B. |
| `doctors` | 🔲 Stubbed | Doctor-specific routes (deferred). Doctor search lives in `users` module. |
| `emergency` | 🔲 Stubbed | Short-lived QR tokens for emergency access |
| `notifications` | 🔲 Stubbed | Reminders and system alerts |
| `admin` | 🔲 Stubbed | Doctor approval, audit log retrieval |

### Active API Prefixes

Routes registered in `app/main.py`:

| Prefix | Module |
|--------|--------|
| `/auth` | auth |
| `/users` | users |
| `/consent` | consent |
| `/health-metrics` | health_metrics |
| `/diaries` | diaries |
| `/prescriptions`, `/prescription-logs` | prescriptions |
| `/medical-records` | medical_records |

### Database

14 tables created in initial migration (`dee690ba0a46`). Key tables:

- `profiles`, `doctors`, `sessions`
- `consent_requests`, `consent_permissions` (has `expires_at`)
- `diaries`, `health_metrics`, `medical_records`
- `prescriptions`, `prescription_items`, `prescription_logs`
- `emergency_tokens`, `emergency_access_logs`
- `notifications`, `data_access_logs`
