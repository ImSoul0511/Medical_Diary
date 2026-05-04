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
```

Optional: `ALGORITHM` (default HS256), `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30), `ADMIN_IP_ALLOWLIST` (default 127.0.0.1), `SENTRY_DSN`, `DEBUG`.

## Architecture

**FastAPI + Supabase backend.** No frontend exists yet.

### Module Structure (DDD)

Every module under `app/modules/<name>/` must have exactly three files:

- **`schemas.py`** — Pydantic models for request/response validation only. No business logic.
- **`service.py`** — All business logic and Supabase DB calls. HTTP-agnostic (never imports `Request`).
- **`router.py`** — Thin HTTP layer: declares routes, calls service, returns responses. No DB queries here.

### Data & Security Rules

- **No hard-deletes.** Always use `deleted_at` (soft-delete).
- **Audit logs** are handled by PostgreSQL Triggers, not application code.
- **Sensitive data** is encrypted with `pgcrypto` at the DB level.
- **Error responses** must follow: `{ "error_code": "...", "message": "...", "request_id": "..." }`.
- **Admin routes** are restricted by IP allowlist, not just JWT role.

### User Data Tiers

Users have three privacy tiers controlled by `privacy_settings` (JSONB):

1. **Public View** — blood type, allergies, emergency contact (visible via QR scan).
2. **Private Vitals** — heart rate, steps, respiratory rate (default private, opened via consent).
3. **Private Diary** — free-text notes + symptom ratings 1–10.

Doctors access private tiers only after a user grants explicit, scope-based consent. Consent can be revoked at any time.

### Modules

| Module | Responsibility |
|--------|---------------|
| `auth` | Login, JWT, sessions, MFA (TOTP deferred post-MVP) |
| `users` | Profiles, privacy settings, data export (JSON/PDF) |
| `doctors` | Doctor search, access requests |
| `consent` | Grant/revoke doctor access |
| `health_metrics` | Vitals from wearables |
| `diaries` | Personal diary entries |
| `medical_records` | Official records (doctor-created) |
| `prescriptions` | Prescription management |
| `emergency` | Short-lived QR tokens for emergency access |
| `notifications` | Reminders and system alerts |
| `admin` | Doctor approval, audit log retrieval |
