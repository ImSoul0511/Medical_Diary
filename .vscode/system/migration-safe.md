---
description: Safe database migration workflow
---

# Safe Database Migration Workflow

Workflow for creating, testing, and applying Alembic database migrations without breaking production.

## When to Use

Use this workflow when:
- Adding new tables
- Adding/modifying columns
- Adding indexes (especially pgvector)
- Changing relationships
- Any schema modification

## Prerequisites

Before starting:
1. Ensure models are correctly defined
2. Have backup strategy for production
3. Test migrations locally first

## Steps

### 1. Review Model Changes

Verify SQLAlchemy models are correct.

**Actions:**
- [ ] Check all model changes are complete
- [ ] Verify column types match intended database types
- [ ] Add pgvector.Vector columns if needed
- [ ] Define indexes in `__table_args__`
- [ ] Check foreign key constraints

**Model Verification Checklist:**
```python
# backend/app/core/health_tracking/models.py

class Feature(Base):
    __tablename__ = "features"
    
    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Required fields
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Optional fields
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Vector field (if using pgvector)
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(15),
        nullable=True,
        comment="15-dim vector for similarity search"
    )
    
    # Foreign key with index
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="features")
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    # Indexes
    __table_args__ = (
        Index('ix_features_embedding_ivfflat', 
              'embedding', 
              postgresql_using='ivfflat',
              postgresql_with={'lists': 100}),
        Index('ix_features_name_trgm', 
              'name', 
              postgresql_ops={'name': 'gin_trgm_ops'},
              postgresql_using='gin'),
    )
```

**Output:** Verified model files

---

### 2. Generate Migration

Create Alembic migration from model changes.

**Actions:**
- [ ] Stop development servers
- [ ] Ensure database is at latest migration
- [ ] Generate migration with descriptive name
- [ ] Review auto-generated migration

**Commands:**
```bash
# Navigate to backend
cd backend

# Ensure at latest migration
alembic current

# If behind, upgrade first
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "add_feature_embeddings_and_indexes"
```

**Migration Naming Convention:**
- `add_{table}_table` - New table
- `add_{table}_{column}` - New column
- `add_{table}_indexes` - Multiple indexes
- `drop_{table}_{column}` - Remove column
- `update_{table}_constraints` - Constraint changes

**Output:** Migration file in `alembic/versions/`

---

### 3. Review Migration SQL

Check the generated migration is correct.

**Actions:**
- [ ] Open generated migration file
- [ ] Review `upgrade()` function
- [ ] Review `downgrade()` function
- [ ] Check SQL is efficient
- [ ] Verify vector indexes are correct

**Example Migration:**
```python
# alembic/versions/2024_01_15_add_feature_embeddings.py
"""Add feature embeddings and indexes

Revision ID: 2024_01_15_add_feature_embeddings
Revises: 2024_01_10_previous_migration
Create Date: 2024-01-15 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers
revision: str = '2024_01_15_add_feature_embeddings'
down_revision: Union[str, None] = '2024_01_10_previous_migration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding column and indexes."""
    
    # Add embedding column
    op.add_column(
        'features',
        sa.Column(
            'embedding',
            Vector(15),
            nullable=True,
            comment='15-dim vector: [price, noise, nature, ...]'
        )
    )
    
    # Create IVFFlat index for vector similarity search
    op.create_index(
        'ix_features_embedding_ivfflat',
        'features',
        ['embedding'],
        unique=False,
        postgresql_using='ivfflat',
        postgresql_with={'lists': 100}
    )
    
    # Add trigram index for text search
    op.create_index(
        'ix_features_name_trgm',
        'features',
        ['name'],
        unique=False,
        postgresql_using='gin',
        postgresql_ops={'name': 'gin_trgm_ops'}
    )
    
    # Add column comment
    op.execute("""
        COMMENT ON COLUMN features.embedding IS 
        '15-dimensional embedding vector for similarity search. '
        'Dimensions: [price_norm, noise_norm, nature, cuisine_type...]';
    """)


def downgrade() -> None:
    """Remove embedding column and indexes."""
    
    # Drop indexes first (order matters!)
    op.drop_index('ix_features_name_trgm', table_name='features')
    op.drop_index('ix_features_embedding_ivfflat', table_name='features')
    
    # Drop column
    op.drop_column('features', 'embedding')
```

**Review Checklist:**
- [ ] Column types match models
- [ ] Indexes are created correctly
- [ ] Vector dimensions match (15 for TasteMap)
- [ ] Downgrade reverses all changes
- [ ] No destructive operations without confirmation
- [ ] Comments explain purpose

**Preview SQL (optional):**
```bash
# Preview SQL without executing
alembic upgrade head --sql > migration_preview.sql
```

---

### 4. Test Migration Locally

Apply and verify migration in development.

**Actions:**
- [ ] Apply migration to local database
- [ ] Verify schema changes in database
- [ ] Test application with new schema
- [ ] Test downgrade (critical!)
- [ ] Fix any issues

**Commands:**
```bash
# Apply migration
alembic upgrade +1

# Check current version
alembic current

# Verify in database
psql $DATABASE_URL -c "\d features"

# Test application
# Start backend and run tests
pytest tests/ -v

# Test downgrade (IMPORTANT!)
alembic downgrade -1

# Verify downgrade worked
psql $DATABASE_URL -c "\d features"

# Re-apply for continued development
alembic upgrade +1
```

**Verification Queries:**
```sql
-- Check table structure
\d features

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'features';

-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector similarity query
SELECT id, name, embedding <=> '[0.5, 0.3, ...]'::vector AS distance
FROM features
ORDER BY distance
LIMIT 5;
```

**Output:** Verified working migration

---

### 5. Test Downgrade

Verify downgrade works (production safety).

**Actions:**
- [ ] Apply migration to fresh database
- [ ] Insert test data
- [ ] Run downgrade
- [ ] Verify data integrity
- [ ] Re-apply migration

**Critical Test:**
```bash
# 1. Start with clean database
alembic downgrade base

# 2. Apply all migrations including new one
alembic upgrade head

# 3. Add test data
psql $DATABASE_URL -c "INSERT INTO features (name) VALUES ('Test Feature');"

# 4. Downgrade
alembic downgrade -1

# 5. Check no errors
# If error, migration is broken!

# 6. Re-apply
alembic upgrade +1

# 7. Verify data survived (if nullable column)
psql $DATABASE_URL -c "SELECT * FROM features;"
```

**Output:** Confirmed downgrade safety

---

### 6. Apply to Production

Deploy migration to production (with caution).

**Actions:**
- [ ] Backup production database
- [ ] Schedule maintenance window (if needed)
- [ ] Run migration during low traffic
- [ ] Verify application works
- [ ] Monitor for errors

**Production Commands:**
```bash
# 1. Backup (CRITICAL!)
pg_dump $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
alembic -c production.ini upgrade +1

# Or with explicit database URL:
DATABASE_URL=$PRODUCTION_DATABASE_URL alembic upgrade +1

# 3. Verify
alembic -c production.ini current
```

**Rollback Plan:**
If migration fails in production:
```bash
# Immediate rollback
alembic downgrade -1

# Restore from backup if needed
psql $PRODUCTION_DATABASE_URL < backup_file.sql
```

**Output:** Successfully applied migration

---

### 7. Document Migration

Add documentation for team.

**Actions:**
- [ ] Add to CHANGELOG
- [ ] Document any breaking changes
- [ ] Update API docs if schema changed
- [ ] Notify team of new fields

**Documentation Template:**
```markdown
## Database Migration: {revision_id}

**Date:** {date}
**Migration:** `{revision_id}_add_feature_embeddings.py`

### Changes
- Added `embedding` column (Vector(15)) to `features` table
- Added IVFFlat index for vector similarity search
- Added trigram index for text search on `name`

### Impact
- New API endpoints can use vector similarity
- Existing features have NULL embeddings (backfill needed)

### Backfill Required
```python
# Run after deployment
python scripts/backfill_embeddings.py
```

### Rollback
```bash
alembic downgrade 2024_01_10_previous_migration
```
```

---

## Common Migration Patterns

### Adding Vector Column

```python
def upgrade():
    # Enable pgvector if not exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # Add vector column
    op.add_column(
        'locations',
        sa.Column('embedding', Vector(15), nullable=True)
    )
    
    # Create index
    op.create_index(
        'ix_locations_embedding',
        'locations',
        ['embedding'],
        postgresql_using='ivfflat',
        postgresql_with={'lists': 100}
    )


def downgrade():
    op.drop_index('ix_locations_embedding', table_name='locations')
    op.drop_column('locations', 'embedding')
```

### Adding Column with Default

```python
def upgrade():
    # Add column with server default
    op.add_column(
        'users',
        sa.Column('is_verified', sa.Boolean(), 
                   server_default='false', 
                   nullable=False)
    )
    
    # Remove server default after data exists
    op.alter_column('users', 'is_verified', server_default=None)


def downgrade():
    op.drop_column('users', 'is_verified')
```

### Creating New Table

```python
def upgrade():
    op.create_table(
        'tours',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), 
                 server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tours_owner_id', 'tours', ['owner_id'])


def downgrade():
    op.drop_index('ix_tours_owner_id', table_name='tours')
    op.drop_table('tours')
```

### Adding Index to Existing Column

```python
def upgrade():
    # For large tables, create index concurrently
    op.execute("CREATE INDEX CONCURRENTLY ix_users_email ON users(email);")


def downgrade():
    op.drop_index('ix_users_email', table_name='users')
```

### Data Migration

```python
def upgrade():
    # Add new column
    op.add_column('users', sa.Column('full_name', sa.String(200)))
    
    # Migrate data from old columns
    op.execute("""
        UPDATE users 
        SET full_name = first_name || ' ' || last_name
        WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
    """)


def downgrade():
    op.drop_column('users', 'full_name')
```

---

## Troubleshooting

**Migration fails to generate:**
```bash
# Check models are imported in __init__.py
# Ensure metadata is correct:
# target_metadata = Base.metadata
```

**pgvector not found:**
```bash
# Install pgvector extension in PostgreSQL
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Migration applies but application fails:**
- Check models match migration
- Verify SQLAlchemy is reading correct metadata
- Restart application after migration

**Downgrade fails:**
- Common issue: forgot to drop index before column
- Check order in downgrade(): drop dependent objects first

**Concurrent index issues:**
```python
# Use CONCURRENTLY for large tables
op.execute("CREATE INDEX CONCURRENTLY ...")

# Note: Cannot run in transaction block
# Use: op.execute(sa.text("COMMIT")) first if needed
```

---

## Commands Reference

```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade +1          # Apply next
alembic upgrade head        # Apply all
alembic upgrade revision_id # Apply specific

# Rollback
alembic downgrade -1           # Rollback one
alembic downgrade revision_id  # Rollback to specific
alembic downgrade base         # Rollback all

# Status
alembic current      # Current revision
alembic history      # All revisions
alembic heads        # Latest revisions

# SQL preview
alembic upgrade head --sql
alembic downgrade -1 --sql

# With custom config
alembic -c production.ini upgrade head
```
