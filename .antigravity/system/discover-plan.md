---
description: Discover and understand the codebase
---

# Codebase Discovery Workflow

Use this workflow to understand any part of the codebase before making changes.

## When to Use

- Before implementing new features
- When debugging issues
- When refactoring existing code
- When onboarding to a new codebase area
- Before modifying someone else's code

## Quick Discovery (2-5 minutes)

For fast understanding of a component:

1. **Read the main file** mentioned in the task
2. **Check the imports** to understand dependencies
3. **Read related type definitions**
4. **Look at 1-2 usage examples** (where the code is called from)

## Deep Discovery (10-20 minutes)

For complex features or architectural decisions:

1. Follow the Quick Discovery steps
2. **Trace data flow** end-to-end (DB → API → Frontend)
3. **Read related database models**
4. **Review existing tests** for understanding
5. **Check error handling patterns**

---

## Domain-Specific Discovery

### Frontend Components Discovery

**Key directories:**

- `frontend/src/components/features/` - Domain-specific components
- `frontend/src/components/primitives/` - Once UI wrappers
- `frontend/src/components/layout/` - Page shells

**Discovery checklist:**

- [ ] What Once UI primitives are used? (Column, Row, Grid, etc.)
- [ ] What are the props? (interface/type definition)
- [ ] Where is this component used? (find references)
- [ ] Does it use Framer Motion?
- [ ] Does it connect to API? (check for fetch/api calls)
- [ ] Does it use WebSocket? (real-time features)
- [ ] What context does it use? (AuthContext, etc.)

**Command:**

```bash
# Find all usages of a component
grep -r "ComponentName" frontend/src --include="*.tsx" | head -20

# Find component definition
grep -r "export function ComponentName" frontend/src --include="*.tsx"
```

### Backend API Discovery

**Key directories:**

- `backend/app/modules/{domain}/router.py` - API endpoints
- `backend/app/modules/{domain}/service.py` - Business logic
- `backend/app/modules/{domain}/schemas.py` - Pydantic models
- `backend/app/modules/{domain}/models.py` - SQLAlchemy models

**Discovery checklist:**

- [ ] What endpoints exist? (router.py)
- [ ] What are the request/response schemas? (schemas.py)
- [ ] What's the business logic? (service.py)
- [ ] What database tables are used? (models.py)
- [ ] What authentication is required? (Depends get_current_user)
- [ ] What dependencies does it have? (other services)

**Command:**

```bash
# Find all endpoints for a domain
grep -A 3 "@router." backend/app/modules/admin/router.py

# Find schema definitions
grep "class.*Schema" backend/app/modules/admin/schemas.py

# Check service functions
grep "async def" backend/app/modules/admin/service.py
```

**Example - Discovering Group Endpoints:**

```bash
# 1. Check router for endpoints
cat backend/app/modules/admin/router.py | grep -A 5 "@router"

# 2. Read schemas for API contract
cat backend/app/modules/admin/schemas.py

# 3. Check service layer
cat backend/app/modules/admin/service.py | head -100

# 4. Look at models
cat backend/app/modules/admin/models.py
```

---

### Database Model Discovery

**Key locations:**

- `backend/app/modules/{domain}/models.py`
- `backend/app/core/database.py` - SQLAlchemy Base
- `backend/alembic/versions/` - Migration history

**Discovery checklist:**

- [ ] What columns exist? (name, type, constraints)
- [ ] What are the relationships? (foreign keys, back_populates)
- [ ] Are there vector columns? (pgvector)
- [ ] What indexes exist? (**table_args**)
- [ ] When was it last modified? (alembic history)

**Command:**

```bash
# See table structure
grep -A 30 "class.*Base" backend/app/modules/admin/models.py

# Check indexes
grep "Index\|__table_args__" backend/app/modules/admin/models.py

# See migration history
ls -la backend/alembic/versions/ | grep location
```
---

## Discovery Templates

### Component Discovery Template

````markdown
## Component: {ComponentName}

**Location:** `frontend/src/{path}/{ComponentName}.tsx`

**Purpose:** {One sentence description}

**Props Interface:**

```typescript
interface {ComponentName}Props {
  // ... list key props
}
```
````

**Once UI Primitives Used:**

- Column / Row / Grid / etc.

**Dependencies:**

- API calls: {which endpoints}
- Context: {which context}
- Hooks: {custom hooks}

**Used By:**

- {List parent components}

**Key Behaviors:**

- {List important behaviors}

````

### API Endpoint Discovery Template

```markdown
## Endpoint: {METHOD} {path}

**Location:** `backend/src/{domain}/router.py:{line}`

**Purpose:** {One sentence}

**Request Schema:** `{SchemaName}`
```python
class {SchemaName}(BaseModel):
    # ... fields
````

**Response Schema:** `{ResponseSchema}`

**Service Function:** `{service_function_name}`

**Database Models:**

- {List models used}

**Auth Required:** {Yes/No}

**Cache Strategy:** {Redis/None/TTL}

````

### Database Model Discovery Template

```markdown
## Model: {ModelName}

**Location:** `backend/src/{domain}/models.py`

**Table:** `{table_name}`

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| {name} | {type} | {constraints} | {description} |

**Relationships:**
- {Relationship type} → {Target model}

**Indexes:**
- {List indexes}

**Vector Columns:**
- {Yes/No, dimension if yes}

**Last Migration:**
- `{migration_file}`
````

---

## Common Discovery Patterns

### Pattern 1: Tracing a Feature End-to-End

**Goal:** Understand how data flows from UI to database

**Steps:**

1. Start at the UI component (e.g., `RoomCard.tsx`)
2. Find the API call (e.g., `apiPost('/groups/join', ...)`)
3. Trace to backend router (e.g., `groups/router.py`)
4. Follow to service layer (e.g., `groups/service.py`)
5. Check database models (e.g., `groups/models.py`)
6. Return response path

**Example - "How does joining a room work?"**

```bash
# 1. Find UI component
grep -r "Join.*Room\|join.*group" frontend/src --include="*.tsx" | head -5

# 2. Find API call
grep -r "join.*group\|groups.*join" frontend/src --include="*.ts" -A 3

# 3. Find backend endpoint
grep -r "join\|Join" backend/app/modules/admin/router.py -A 10

# 4. Check service implementation
grep -r "join_by_code\|join_group" backend/app/modules/admin/service.py -A 20

# 5. See database changes
grep -r "members\|Member" backend/app/modules/admin/models.py -A 5
```

### Pattern 2: Finding Algorithm Implementation

**Goal:** Locate vector math or AI code

**Steps:**

1. Search for numpy operations
2. Look for "vector" or "embedding" mentions
3. Check service files for calculations
4. Find dimension constants

### Pattern 3: Understanding State Management

**Goal:** Find how state is managed (React Context, WebSocket, etc.)

**Steps:**

1. Check for Context usage
2. Look for custom hooks
3. Find WebSocket connections
4. Check for Redux/Zustand (if any)

**Example - "How is auth state managed?"**

```bash
# 1. Find AuthContext
cat frontend/src/context/AuthContext.tsx

# 2. Check usage
grep -r "useAuth" frontend/src --include="*.tsx" | head -10

# 3. Find login flow
grep -r "login\|signIn" frontend/src --include="*.ts" -A 3 | head -30

# 4. Check backend auth
cat backend/app/modules/auth/router.py
```

### Pattern 4: Debugging an Issue

**Goal:** Understand why something isn't working

**Steps:**

1. Identify the error location
2. Trace backwards through the call stack
3. Check inputs at each step
4. Look for recent changes (git log)
5. Check for known issues

---

## Discovery Commands Reference

### Frontend

```bash
# Find component definition
grep -r "export function ComponentName\|export const ComponentName" frontend/src --include="*.tsx"

# Find component usage
grep -r "<ComponentName" frontend/src --include="*.tsx"

# Find hook usage
grep -r "useHookName" frontend/src --include="*.tsx"

# Find API calls
grep -r "apiGet\|apiPost\|fetch" frontend/src --include="*.ts" -B 1 -A 1

# Find WebSocket usage
grep -r "WebSocket\|useVoiceRoom\|useGroupWebSocket" frontend/src --include="*.ts"
```

### Backend

```bash
# Find endpoint definition
grep -r "@router\.\(get\|post\|patch\|delete\|put\)" backend/app/modules --include="*.py" -A 1

# Find service functions
grep -r "async def" backend/app/modules/{domain}/service.py

# Find schema definitions
grep -r "class.*Schema.*BaseModel" backend/app/modules --include="*.py"

# Find model definitions
grep -r "class.*Base\):" backend/app/modules --include="*.py" -A 20

```

### Database

```bash
# List all tables
grep -r "__tablename__" backend/app/modules --include="*.py" | cut -d'"' -f2

# Find vector columns
grep -r "Vector(" backend/app/modules --include="*.py"

# Check migrations
ls -la backend/alembic/versions/

# See latest migration
cat backend/alembic/versions/$(ls -t backend/alembic/versions/*.py | head -1)
```

---

## Tips for Efficient Discovery

1. **Start broad, then narrow down** - Use grep with broad patterns first
2. **Follow the imports** - Imports show dependencies
3. **Read types/interfaces first** - They document the contract
4. **Check tests for examples** - Tests show expected usage
5. **Use IDE features** - "Go to definition", "Find usages"
6. **Check git history** - Recent commits show evolution
7. **Read docstrings** - They explain purpose
8. **Look for patterns** - TasteMap follows consistent patterns

---

## Anti-Patterns to Avoid

❌ **Don't** assume code works a certain way without checking
❌ **Don't** skip reading related files
❌ **Don't** guess at vector dimensions (always verify)
❌ **Don't** ignore WebSocket code when working on real-time features
❌ **Don't** modify code without understanding the full flow

✅ **Do** trace data end-to-end before implementing
✅ **Do** check both frontend and backend
✅ **Do** verify algorithm implementations against docs
✅ **Do** run tests to confirm understanding
✅ **Do** document discoveries for future reference
