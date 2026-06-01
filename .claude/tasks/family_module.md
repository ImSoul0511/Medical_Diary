---
trigger: on_request 
---
# Implement Family Module 
## Context: 
- Users can add their children to their account
- Provide child information and upload their vaccination record
- Users can view all their child's information
- People of the same family can be added to each other's account
## Requirements:
### BACKEND: 
1. **Database Schema (requires user confirmation before migration):**
   - Create `children` table (dependents without credentials):
     - `id`: `UUID` (Primary Key, server default: `gen_random_uuid()`)
     - `parent_id`: `UUID` (Not Null, Foreign Key to `profiles.id` on delete CASCADE)
     - `full_name`: `varchar(100)` (Not Null)
     - `gender`: `varchar(10)` (Not Null, Check: `male`, `female`)
     - `date_of_birth`: `date` (Not Null)
     - `blood_type`: `varchar(5)` (Nullable)
     - `allergies`: `text` (Nullable)
     - `vaccination_record_url`: `text` (Nullable — URL to storage file)
     - `created_at`: `timestamptz` (Default: `now()`)
     - `updated_at`: `timestamptz` (Default: `now()`)
     - `deleted_at`: `timestamptz` (Nullable — Soft delete)
   - Create `family_connections` table (adult account links):
     - `id`: `UUID` (Primary Key, server default: `gen_random_uuid()`)
     - `requester_id`: `UUID` (Not Null, Foreign Key to `profiles.id` on delete CASCADE)
     - `receiver_id`: `UUID` (Not Null, Foreign Key to `profiles.id` on delete CASCADE)
     - `relationship_type`: `varchar(50)` (Not Null, Check: `'spouse'`, `'sibling'`, `'parent'`, `'child'`, `'other'`)
     - `status`: `varchar(20)` (Not Null, Check: `pending`, `accepted`, `rejected`, default: `pending`)
     - `created_at`: `timestamptz` (Default: `now()`)
     - `responded_at`: `timestamptz` (Nullable)
     - `deleted_at`: `timestamptz` (Nullable — Soft delete)
     - Index: `Index("uq_family_connections_active", "requester_id", "receiver_id", unique=True, postgresql_where=text("deleted_at IS NULL"))`
2. **Supabase Storage Bucket:**
   - Define `vaccination_records` bucket for child certificate storage.
3. **Pydantic Schemas (`app/modules/family/schemas.py`):**
   - `ChildCreateRequest`, `ChildUpdateRequest`, `ChildResponse`
   - `FamilyConnectionRequest`, `FamilyConnectionResponse`, `FamilyConnectionActionRequest`
4. **Service Layer (`app/modules/family/service.py`):**
   - Class `FamilyService` with CRUD operations for children, request connections, accept/reject, list family members.
5. **Router Layer (`app/modules/family/router.py`):**
   - Prefix `/family`, tag `Family`.
   - Endpoints: `POST /family/children`, `GET /family/children`, `PATCH /family/children/{id}`, `DELETE /family/children/{id}`.
   - Endpoints: `POST /family/connections/request`, `GET /family/connections/incoming`, `GET /family/connections/outgoing`, `PATCH /family/connections/{id}`, `DELETE /family/connections/{id}`, `GET /family/members`.
6. **Integration:** Include router in `app/main.py`.

### FRONTEND: 
1. **Pages & Routing:**
   - Dashboard page at `/family` showing children and family members.
   - Child profile page at `/family/children/{id}` showing details and vaccination file.
2. **UI Components:**
   - **FamilyDashboard**: Lists children and linked members, handles connection request list.
   - **AddChildModal / EditChildModal**: Form for inputting child details. Includes file upload input for the vaccination record.
   - **LinkMemberModal**: Modal to send family requests via target email or phone.
   - **VaccinationRecordViewer**: Renders certificate previews (image/PDF viewer).
3. **API Integration & State:**
   - Integrate endpoints with Axios service.
   - Implement file upload to Supabase storage prior to calling create/update API.
   - Handle 429 rate limiting gracefully with toasts/alerts.

### RULE: 
- Follow module_implementation.md 
- Follow context in SYSTEM_DESIGN_SSOT.md 
- Every task about creating new tables, using admin supabase key, adding new policy, etc. has to be confirmed by user first
- Follow discover-plan.md if the user's unclear about what they want
- Follow migration-safe.md for every task about migration
- Stop following api related docs since they're outdated. If you want to know the endpoint, search in backend/modules/module's name/router.py