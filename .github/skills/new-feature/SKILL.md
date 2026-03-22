---
name: new-feature
description: "Plan and implement a full-stack feature across all layers: database migration, types, Server Actions, UI components, and tests. Use when: adding new feature, new entity, new CRUD, end-to-end feature, full-stack change, cross-layer change, feature implementation, add field, add functionality"
---

# New Feature Implementation

Plan and execute a full-stack feature that crosses all layers of the TodoList Demo app.

## When to Use

- Adding a new entity (e.g., tags, categories, subtasks)
- Adding a new field to an existing entity (e.g., priority, due date)
- Any feature that requires changes across database, backend, frontend, and tests

## Layer Map

Every feature touches some or all of these layers, in this order:

| Layer | Files | Agent |
|-------|-------|-------|
| 1. Database | `supabase/migrations/NNN_description.sql` | backend |
| 2. Types | `types/database.ts`, `types/entity.ts` | backend |
| 3. Server Actions | `app/actions/entity.ts` | backend |
| 4. Data Fetching | `lib/entity.ts` (server-side queries) | backend |
| 5. UI Components | `components/entity-*.tsx` | frontend |
| 6. Pages | `app/page.tsx` or new routes | frontend |
| 7. Unit Tests | `__tests__/components/`, `__tests__/actions/` | testing |
| 8. E2E Tests | `e2e/` | testing |

## Procedure

### Phase 1 — Scope the Feature

Answer these questions:

1. **What data changes?** New table? New column? New relationship?
2. **What mutations?** Create / Read / Update / Delete?
3. **What UI?** New component? Modify existing component? New page?
4. **What tests?** Which layers need coverage?

### Phase 2 — Define the Task Breakdown

Use this template for each task:

```
Task T1: [Title]
  Agent: [backend | frontend | testing]
  Depends on: [none | T1, T2]
  Files: [list of files to create or modify]
  Acceptance: [how to verify it's done]
```

#### Standard Task Sequence

**For adding a new column to `tasks`:**

```
T1 (backend): Create migration
  Files: supabase/migrations/NNN_add_column.sql
  Acceptance: SQL is valid, RLS unchanged, index added if filterable

T2 (backend): Update types
  Depends on: T1
  Files: types/database.ts, types/task.ts
  Acceptance: Row/Insert/Update all include new field, compiles clean

T3 (backend): Update Server Actions
  Depends on: T2
  Files: app/actions/tasks.ts
  Acceptance: createTask/updateTask handle new field, validation added

T4 (frontend): Update UI components
  Depends on: T2, T3
  Files: components/task-form.tsx, components/task-item.tsx
  Acceptance: New field visible, editable, responsive, dark mode

T5 (testing): Update tests
  Depends on: T3, T4
  Files: __tests__/components/*, __tests__/actions/*, e2e/*
  Acceptance: Tests pass, new field covered
```

**For adding a new entity:**

```
T1 (backend): Create migration — new table + RLS + indexes + trigger
T2 (backend): Create types — database.ts + entity type file
T3 (backend): Create Server Actions — CRUD operations
T4 (backend): Create data fetching — lib/entity.ts
T5 (frontend): Create UI components — list, item, form
T6 (frontend): Add to page/layout
T7 (testing): Unit tests for components + actions
T8 (testing): E2E tests for full flow
```

### Phase 3 — Define Interface Contracts

When tasks depend on each other, spell out the exact contract:

```
T2 produces → types/task.ts exports `Task` type with new field:
  priority: number | null

T3 consumes → Task type, accepts `priority` in FormData:
  formData.get("priority") → parsed as integer, default 0

T4 consumes → `updateTask` server action accepts priority field
  displays → Task.priority in the UI
```

### Phase 4 — Execute in Waves

Group tasks by dependencies. Tasks within a wave can run in parallel:

```
Wave 1: T1 (migration)
Wave 2: T2 (types) — depends on T1
Wave 3: T3 (actions) + T4 (UI) — parallel, both depend on T2
Wave 4: T5 (tests) — depends on T3 + T4
```

### Phase 5 — Verify

After all tasks complete:

1. Run `npm run lint` — no lint errors
2. Run `npm run test` — all unit tests pass
3. Run `npm run build` — production build succeeds
4. If E2E tests added, run `npm run test:e2e` with dev server

## Checklist

- [ ] Migration created with sequential number
- [ ] Types updated (Row, Insert, Update variants)
- [ ] Server Actions handle new fields with validation
- [ ] UI shows new fields with proper states (loading, error, empty)
- [ ] Dark mode works for new UI
- [ ] Responsive design verified (mobile-first)
- [ ] Accessibility: labels, keyboard nav, ARIA attributes
- [ ] Unit tests cover new components and actions
- [ ] E2E test covers the full user flow
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Reference Files

| Pattern | Example |
|---------|---------|
| Migration | `supabase/migrations/001_create_tasks.sql` |
| Database types | `types/database.ts` |
| Entity types | `types/task.ts` |
| Server Actions | `app/actions/tasks.ts` |
| Data fetching | `lib/tasks.ts` |
| Components | `components/task-form.tsx`, `components/task-item.tsx`, `components/task-list.tsx` |
| Unit tests | `__tests__/components/task-form.test.tsx`, `__tests__/actions/tasks.test.ts` |
| E2E tests | `e2e/tasks-crud.spec.ts` |
