# Public REST API — Implementation Steps

> Step-by-step implementation plan for the Public REST API feature described in [SPEC.md](SPEC.md#public-rest-api).

## Prerequisites

- Supabase project with existing schema (environments, tasks, categories, tags, photos, dependencies, environment_members)
- Next.js App Router with existing Server Actions
- Existing auth via Supabase Auth (session-based)

---

## Step 1: Database — API Keys Table & RLS

**Layer**: Database (Supabase migration)

**What to do**:
1. Create migration file: `supabase/migrations/XXX_create_api_keys.sql`
2. Create `api_keys` table with columns: `id`, `user_id`, `name`, `key_hash`, `key_prefix`, `last_used_at`, `created_at`, `revoked_at`
3. Add indexes on `key_hash` (unique, for fast lookup) and `user_id`
4. Add RLS policies:
   - Users can SELECT/INSERT/UPDATE only their own API keys
   - No DELETE — revocation uses soft-delete (`revoked_at`)
5. Add CHECK constraint: `name` max 100 chars
6. Add database function `verify_api_key(key_hash text)` that returns `user_id` or null (checks key exists, not revoked)

**Output files**:
- `supabase/migrations/XXX_create_api_keys.sql`

**Acceptance criteria**:
- [ ] Table created with all columns from SPEC
- [ ] RLS policies enforce user-scoped access
- [ ] Unique index on `key_hash`
- [ ] `verify_api_key` function works correctly

---

## Step 2: Types — API Key TypeScript Types

**Layer**: TypeScript types

**What to do**:
1. Create `types/api-key.ts` with `ApiKey` interface
2. Update `types/database.ts` if using generated Supabase types (add `api_keys` table)

**Output files**:
- `types/api-key.ts`
- `types/database.ts` (update)

**Acceptance criteria**:
- [ ] `ApiKey` interface matches the database schema
- [ ] Types are importable from other modules

---

## Step 3: Server Actions — API Key Management

**Layer**: Backend (Server Actions)

**What to do**:
1. Create `app/actions/api-keys.ts` with:
   - `createApiKey(formData)` — generates random key, hashes with SHA-256, stores hash + prefix, returns raw key ONCE
   - `listApiKeys()` — returns user's keys (id, name, key_prefix, last_used_at, created_at, revoked_at)
   - `revokeApiKey(id)` — sets `revoked_at` timestamp
2. Enforce max 5 active keys per user
3. Use `crypto.randomUUID()` or `crypto.getRandomValues()` for key generation
4. Key format: `tdl_` prefix + 32 random hex chars (e.g., `tdl_a1b2c3d4...`)

**Output files**:
- `app/actions/api-keys.ts`

**Acceptance criteria**:
- [ ] Raw key returned only on creation, never retrievable again
- [ ] Keys stored as SHA-256 hashes
- [ ] Max 5 active keys enforced
- [ ] Auth guard on all actions

---

## Step 4: UI — API Key Management Page

**Layer**: Frontend

**What to do**:
1. Create `app/api-keys/page.tsx` — page to manage API keys
2. Create `components/api-key-list.tsx` — list existing keys (shows prefix, name, last used, created, revoke button)
3. Create `components/api-key-create.tsx` — form to create new key (name input), shows raw key once with copy button
4. Add navigation link to API keys page (e.g., in user menu or settings)

**Output files**:
- `app/api-keys/page.tsx`
- `components/api-key-list.tsx`
- `components/api-key-create.tsx`

**Acceptance criteria**:
- [ ] User can create, view, and revoke API keys
- [ ] Raw key shown only once after creation with copy-to-clipboard
- [ ] Key prefix visible in list (e.g., `tdl_a1b2...`)
- [ ] Revoked keys shown as disabled/struck-through

---

## Step 5: API Middleware — Key Authentication

**Layer**: Backend (middleware / utility)

**What to do**:
1. Create `lib/api-auth.ts` with:
   - `authenticateApiKey(request: Request)` — extracts Bearer token, hashes it, looks up in DB, returns user or null
   - Updates `last_used_at` on successful auth
2. Create `lib/api-response.ts` with helper functions:
   - `apiSuccess(data, status?)` — wraps data in standard response
   - `apiError(code, message, status, details?)` — wraps error in standard format
   - `apiPaginatedResponse(data, nextCursor, hasMore)` — wraps paginated list

**Output files**:
- `lib/api-auth.ts`
- `lib/api-response.ts`

**Acceptance criteria**:
- [ ] API key lookup uses hashed comparison (timing-safe)
- [ ] Returns 401 for missing/invalid/revoked keys
- [ ] Response helpers match SPEC error format
- [ ] `last_used_at` updated on each successful request

---

## Step 6: API Routes — Environments

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/route.ts` — GET (list), POST (create)
2. Create `app/api/v1/environments/[id]/route.ts` — GET (detail), PATCH (update), DELETE (delete)
3. All routes use `authenticateApiKey()` from Step 5
4. Environment access checks: user must be owner or member
5. DELETE only for owner

**Output files**:
- `app/api/v1/environments/route.ts`
- `app/api/v1/environments/[id]/route.ts`

**Acceptance criteria**:
- [ ] Full CRUD for environments via API
- [ ] Owner-only operations enforced
- [ ] Pagination on list endpoint
- [ ] Standard error responses

---

## Step 7: API Routes — Team Members & Invitations

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[id]/members/route.ts` — GET (list), POST (invite)
2. Create `app/api/v1/environments/[id]/members/[userId]/route.ts` — DELETE (remove)
3. Create `app/api/v1/environments/[id]/members/leave/route.ts` — POST (leave)
4. Create `app/api/v1/invitations/route.ts` — GET (list pending)
5. Create `app/api/v1/invitations/[id]/accept/route.ts` — POST
6. Create `app/api/v1/invitations/[id]/decline/route.ts` — POST

**Output files**:
- `app/api/v1/environments/[id]/members/route.ts`
- `app/api/v1/environments/[id]/members/[userId]/route.ts`
- `app/api/v1/environments/[id]/members/leave/route.ts`
- `app/api/v1/invitations/route.ts`
- `app/api/v1/invitations/[id]/accept/route.ts`
- `app/api/v1/invitations/[id]/decline/route.ts`

**Acceptance criteria**:
- [ ] Owner can invite/remove members
- [ ] Members can leave
- [ ] Invitation accept/decline flow works
- [ ] Proper access control on all endpoints

---

## Step 8: API Routes — Tasks (CRUD + State + Assignment)

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[envId]/tasks/route.ts` — GET (list with filters/sort/pagination), POST (create)
2. Create `app/api/v1/environments/[envId]/tasks/[id]/route.ts` — GET (detail), PATCH (update), DELETE
3. Create `app/api/v1/environments/[envId]/tasks/[id]/state/route.ts` — POST (change state)
4. Create `app/api/v1/environments/[envId]/tasks/[id]/assign/route.ts` — POST (assign), DELETE (unassign)
5. Create `app/api/v1/environments/[envId]/tasks/[id]/accept/route.ts` — POST
6. Create `app/api/v1/environments/[envId]/tasks/[id]/refuse/route.ts` — POST
7. GET list supports query params: `state`, `category_id`, `tag_id`, `assigned_to`, `assignment_status`, `sort`, `order`, `limit`, `cursor`
8. GET detail includes embedded tags and dependencies

**Output files**:
- `app/api/v1/environments/[envId]/tasks/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/state/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/assign/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/accept/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/refuse/route.ts`

**Acceptance criteria**:
- [ ] Full task CRUD via API
- [ ] Filtering by state, category, tag, assignee works
- [ ] Cursor-based pagination works
- [ ] State transition rules enforced (can't finish with unfinished deps)
- [ ] Assignment flow (assign/unassign/accept/refuse) works
- [ ] Input validation matches Server Action validation

---

## Step 9: API Routes — Task Dependencies

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[envId]/tasks/[id]/dependencies/route.ts` — GET (list), POST (add)
2. Create `app/api/v1/environments/[envId]/tasks/[id]/dependencies/[depId]/route.ts` — DELETE (remove)
3. Circular dependency check on POST
4. Auto-state management (dependent ↔ planned) on add/remove

**Output files**:
- `app/api/v1/environments/[envId]/tasks/[id]/dependencies/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/dependencies/[depId]/route.ts`

**Acceptance criteria**:
- [ ] Can add/remove/list dependencies
- [ ] Circular dependency returns 409 CONFLICT
- [ ] Task state auto-updates correctly

---

## Step 10: API Routes — Task Photos

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[envId]/tasks/[id]/photos/route.ts` — GET (list with URLs), POST (upload multipart)
2. Create `app/api/v1/environments/[envId]/tasks/[id]/photos/[photoId]/route.ts` — DELETE
3. POST accepts `multipart/form-data` with `file` and optional `is_completion_photo` field
4. Enforce limits: max 10 photos, max 5 MB, JPEG/PNG/WebP only

**Output files**:
- `app/api/v1/environments/[envId]/tasks/[id]/photos/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/photos/[photoId]/route.ts`

**Acceptance criteria**:
- [ ] Upload, list, delete photos via API
- [ ] File type and size validation
- [ ] Max 10 photos per task enforced
- [ ] Signed URLs returned for photo access

---

## Step 11: API Routes — Categories

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[envId]/categories/route.ts` — GET (list, supports `?format=tree` or `?format=flat`), POST (create)
2. Create `app/api/v1/environments/[envId]/categories/[id]/route.ts` — GET (detail), PATCH (rename), DELETE
3. Create `app/api/v1/environments/[envId]/categories/[id]/move/route.ts` — PATCH (re-parent)
4. Depth limit check on create and move (max 50 levels)
5. DELETE sets tasks to uncategorized (category_id = null)

**Output files**:
- `app/api/v1/environments/[envId]/categories/route.ts`
- `app/api/v1/environments/[envId]/categories/[id]/route.ts`
- `app/api/v1/environments/[envId]/categories/[id]/move/route.ts`

**Acceptance criteria**:
- [ ] Full CRUD for categories
- [ ] Tree and flat list formats supported
- [ ] Move with circular parent prevention
- [ ] Depth limit enforced
- [ ] Delete orphans tasks to uncategorized

---

## Step 12: API Routes — Tags & Task–Tag Association

**Layer**: Backend (Route Handlers)

**What to do**:
1. Create `app/api/v1/environments/[envId]/tags/route.ts` — GET (list), POST (create)
2. Create `app/api/v1/environments/[envId]/tags/[id]/route.ts` — GET (detail), PATCH (update name/color), DELETE
3. Create `app/api/v1/environments/[envId]/tags/reorder/route.ts` — POST (batch reorder)
4. Create `app/api/v1/environments/[envId]/tasks/[id]/tags/route.ts` — POST (add tag to task)
5. Create `app/api/v1/environments/[envId]/tasks/[id]/tags/[tagId]/route.ts` — DELETE (remove tag from task)
6. Color validation: hex format `#[0-9a-fA-F]{6}`
7. Cross-environment check on task–tag association

**Output files**:
- `app/api/v1/environments/[envId]/tags/route.ts`
- `app/api/v1/environments/[envId]/tags/[id]/route.ts`
- `app/api/v1/environments/[envId]/tags/reorder/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/tags/route.ts`
- `app/api/v1/environments/[envId]/tasks/[id]/tags/[tagId]/route.ts`

**Acceptance criteria**:
- [ ] Full CRUD for tags
- [ ] Reorder with batch sort_order update
- [ ] Add/remove tags from tasks
- [ ] Color validation
- [ ] Cross-environment association prevented

---

## Step 13: Tests — API Key & Auth Middleware

**Layer**: Testing

**What to do**:
1. Create `__tests__/actions/api-keys.test.ts` — test create, list, revoke, max 5 limit
2. Create `__tests__/api/api-auth.test.ts` — test key verification, timing-safe comparison, revoked key rejection
3. Test error responses for missing/invalid/revoked keys

**Acceptance criteria**:
- [ ] API key CRUD actions tested
- [ ] Auth middleware correctly validates keys
- [ ] Edge cases covered (revoked key, max keys, invalid format)

---

## Step 14: Tests — API Route Integration Tests

**Layer**: Testing

**What to do**:
1. Create test files for each resource group:
   - `__tests__/api/v1/environments.test.ts`
   - `__tests__/api/v1/tasks.test.ts`
   - `__tests__/api/v1/categories.test.ts`
   - `__tests__/api/v1/tags.test.ts`
   - `__tests__/api/v1/dependencies.test.ts`
   - `__tests__/api/v1/photos.test.ts`
   - `__tests__/api/v1/members.test.ts`
2. Test CRUD operations, pagination, filtering, error cases
3. Test business rule enforcement (state transitions, circular deps, photo limits)

**Acceptance criteria**:
- [ ] Each resource has integration tests
- [ ] Pagination and filtering tested
- [ ] Access control tested (wrong environment, non-member)
- [ ] Business rules tested through API

---

## Step 15: E2E Tests — API Key UI

**Layer**: Testing (Playwright)

**What to do**:
1. Create `e2e/api-keys.spec.ts` — test the API key management UI
2. Test creating a key, copying it, revoking it
3. Test max 5 keys limit in UI

**Acceptance criteria**:
- [ ] E2E test covers create, view, revoke flow
- [ ] Copy-to-clipboard interaction tested

---

## Execution Order

```
Phase 1 — Foundation
  Step 1: Database migration (api_keys table)
  Step 2: TypeScript types

Phase 2 — API Key Infrastructure
  Step 3: Server Actions (API key management)
  Step 4: UI (API key management page)  [parallel with Step 5]
  Step 5: API middleware (key auth + response helpers)

Phase 3 — Resource Endpoints (can be parallelized)
  Step 6: Environments API
  Step 7: Team Members & Invitations API
  Step 8: Tasks API
  Step 9: Dependencies API
  Step 10: Photos API
  Step 11: Categories API
  Step 12: Tags API

Phase 4 — Testing
  Step 13: API key & auth tests
  Step 14: API route integration tests
  Step 15: E2E tests for API key UI
```

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| API key leakage | Hash before storage; show raw key only once; use `key_prefix` for display |
| Timing attacks on key lookup | Use constant-time comparison for hash matching |
| Breaking existing Server Actions | API routes are additive — no changes to existing actions |
| Performance on large task lists | Cursor-based pagination prevents full-table scans |
| Photo upload size | Enforce 5 MB limit in Route Handler before touching storage |
| Migration on production | Migration is additive (new table only) — safe to apply |
