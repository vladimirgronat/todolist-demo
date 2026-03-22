---
name: supabase-migration
description: "Create Supabase PostgreSQL migrations with RLS policies, indexes, triggers, and type updates. Use when: adding database table, adding column, creating migration, database schema change, new entity, alter table, RLS policy, Row Level Security, index, trigger, supabase migration"
---

# Supabase Migration

Create a complete, production-ready Supabase migration following the project's established patterns.

## When to Use

- Adding a new database table
- Adding or modifying columns on an existing table
- Creating new RLS policies
- Adding indexes for query performance
- Any schema change that needs a migration file

## Procedure

### 1. Determine the Next Migration Number

Check existing migrations in `supabase/migrations/` and use the next sequential number:

```
supabase/migrations/001_create_tasks.sql   ← existing
supabase/migrations/002_your_change.sql    ← new
```

### 2. Write the Migration SQL

Every migration MUST include all of these sections (where applicable):

#### Table / Column Changes

```sql
-- Use IF NOT EXISTS for idempotency
create table if not exists public.your_table (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- your columns here
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

For adding a column to an existing table:

```sql
alter table public.tasks add column if not exists priority integer default 0;
```

#### Indexes

Always add indexes for user-scoped queries:

```sql
create index if not exists idx_tablename_user_created
  on public.your_table (user_id, created_at desc);
```

Add composite indexes for common filter patterns:

```sql
create index if not exists idx_tablename_user_status
  on public.your_table (user_id, status);
```

#### Row Level Security (MANDATORY)

Every table MUST have RLS enabled with all four operation policies:

```sql
alter table public.your_table enable row level security;

create policy "Users can view own rows"
  on public.your_table for select
  using (auth.uid() = user_id);

create policy "Users can create own rows"
  on public.your_table for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rows"
  on public.your_table for update
  using (auth.uid() = user_id);

create policy "Users can delete own rows"
  on public.your_table for delete
  using (auth.uid() = user_id);
```

#### Auto-Update Trigger

Reuse the existing `handle_updated_at()` function (created in migration 001):

```sql
create trigger on_your_table_updated
  before update on public.your_table
  for each row
  execute function public.handle_updated_at();
```

### 3. Update TypeScript Types

After writing the migration, update these files:

#### `types/database.ts`

Add the new table to the `Database` interface following the Row / Insert / Update pattern:

```typescript
your_table: {
  Row: {
    id: string;
    user_id: string;
    // all columns required
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    // required columns required, optional columns optional
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    // all columns optional
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};
```

For adding a column to an existing table, add the field to all three variants (Row, Insert, Update).

#### `types/your-entity.ts` (if new table)

```typescript
import type { Database } from "./database";

export type YourEntity = Database["public"]["Tables"]["your_table"]["Row"];
export type YourEntityInsert = Database["public"]["Tables"]["your_table"]["Insert"];
export type YourEntityUpdate = Database["public"]["Tables"]["your_table"]["Update"];
```

### 4. Verification Checklist

Before finishing, verify:

- [ ] Migration file has sequential number prefix
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS` for idempotency where possible
- [ ] `user_id` column references `auth.users(id) on delete cascade`
- [ ] RLS is enabled on the table
- [ ] All four RLS policies exist (SELECT, INSERT, UPDATE, DELETE)
- [ ] Index exists for `(user_id, ...)` queries
- [ ] `updated_at` trigger is attached
- [ ] `types/database.ts` is updated with Row, Insert, Update variants
- [ ] Type alias file exists for the entity
- [ ] No raw SQL string concatenation — all parameterized

## Reference: Existing Migration

See [001_create_tasks.sql](../../../supabase/migrations/001_create_tasks.sql) for the established pattern.
