# TodoList Demo — Implementation & Testing Plan

## Overview

Build a Next.js App Router task management app with Supabase (auth + PostgreSQL + Storage), Tailwind CSS, and Vercel deployment. The app supports multiple environments, teams, hierarchical categories, tags, task state workflows, dependencies, and photo attachments. Automated testing via Vitest + React Testing Library (unit/component) and Playwright (E2E). Thirteen phases, each independently verifiable.

---

## Phase 1 — Project Scaffolding & Dev Tooling ✅ Complete

1. Initialize Next.js project with TypeScript strict mode (`npx create-next-app@latest --ts --tailwind --app --src-dir=false`)
2. Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react`, `playwright`, `@playwright/test`
3. Configure Vitest — create `vitest.config.ts` with jsdom environment, path aliases matching `tsconfig.json`, setup file for `@testing-library/jest-dom` matchers
4. Configure Playwright — `playwright.config.ts` with `baseURL: http://localhost:3000`, webServer auto-start, chromium project
5. Add npm scripts: `test` (vitest), `test:ui` (vitest --ui), `test:e2e` (playwright test), `test:coverage` (vitest --coverage)
6. Create project folder structure:
   - `app/` — pages, layouts, route handlers
   - `components/` — shared UI components
   - `lib/` — utilities (`supabase.ts`)
   - `types/` — shared TypeScript interfaces
   - `__tests__/` — Vitest unit/component tests
   - `e2e/` — Playwright E2E tests
7. Add `.env.local.example` with required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VECTEL_API_KEY`

**Verification**: `npm run dev` starts without errors; `npm run test` runs with 0 tests found; `npx playwright install` completes

---

## Phase 2 — Supabase Setup & Database Schema ✅ Complete

1. Initialize Supabase client in `lib/supabase.ts` — browser client using `createBrowserClient` from `@supabase/ssr`, server client using `createServerClient` with cookie handling
2. Create SQL migration for the `tasks` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `user_id` (uuid, FK → `auth.users.id`, not null)
   - `title` (text, not null)
   - `description` (text, nullable)
   - `completed` (boolean, default false)
   - `created_at` (timestamptz, default `now()`)
   - `updated_at` (timestamptz, default `now()`)
   - Index on `(user_id, created_at DESC)`
3. Set up RLS policies: users can only SELECT/INSERT/UPDATE/DELETE their own rows (`auth.uid() = user_id`)
4. Create a trigger to auto-update `updated_at` on row modification
5. Generate Supabase types with `npx supabase gen types typescript` → `types/database.ts`
6. Define `Task` interface in `types/task.ts` derived from generated types

**Verification**: Unit test for Supabase client initialization (mocked). Run migration on Supabase project and verify table/RLS via dashboard.

---

## Phase 3 — Authentication ✅ Complete

1. Create `app/login/page.tsx` — login form with email/password, "Sign Up" toggle
2. Create `app/auth/callback/route.ts` — OAuth callback handler for Supabase auth code exchange
3. Create `components/auth-form.tsx` — reusable `"use client"` form component for login/signup
4. Create `lib/auth.ts` — helper functions: `signIn`, `signUp`, `signOut`, `getSession`
5. Create `app/layout.tsx` middleware-style auth check — redirect unauthenticated users to `/login`
6. Create `middleware.ts` at project root — refresh Supabase session on every request using `@supabase/ssr`

**Tests (Vitest)**:
- `__tests__/components/auth-form.test.tsx` — renders login/signup toggle, validates required fields, calls `signIn`/`signUp` on submit (mock Supabase)
- `__tests__/lib/auth.test.ts` — test helper functions with mocked Supabase client

**Verification**: Manual test: sign up → login → session persists on refresh → sign out

---

## Phase 4 — Core Task CRUD ✅ Complete

1. **Server Actions** in `app/actions/tasks.ts`:
   - `createTask(formData)` — validate title (non-empty, max 200 chars), insert row, revalidate path
   - `updateTask(id, formData)` — validate ownership via RLS, update title/description
   - `toggleTask(id)` — flip `completed` boolean
   - `deleteTask(id)` — remove row
   - All actions: get user from session, return typed errors
2. **Data fetching** in `lib/tasks.ts`:
   - `getTasks(filter: 'all' | 'active' | 'completed')` — server-side query, ordered by `created_at DESC`
3. **UI Components**:
   - `components/task-list.tsx` — Server Component, fetches and renders task list
   - `components/task-item.tsx` — `"use client"`, single task row with complete/edit/delete actions
   - `components/task-form.tsx` — `"use client"`, add-new-task form with validation
   - `components/task-filter.tsx` — `"use client"`, filter tabs (All / Active / Completed)
4. **Pages**:
   - `app/page.tsx` — main page, composes `TaskForm` + `TaskFilter` + `TaskList`
   - Accept `searchParams.filter` for active filter state

**Tests (Vitest)**:
- `__tests__/actions/tasks.test.ts` — test each server action: valid input, empty title rejection, title length validation (mock Supabase)
- `__tests__/components/task-form.test.tsx` — renders form, validates empty submission, calls `createTask`
- `__tests__/components/task-item.test.tsx` — renders task data, toggle calls `toggleTask`, delete calls `deleteTask`
- `__tests__/components/task-filter.test.tsx` — renders three tabs, clicking changes active filter

**Verification**: `npm run test` — all unit tests pass

---

## Phase 5 — E2E Tests & Polish ✅ Complete

1. **Playwright E2E tests** in `e2e/`:
   - `e2e/auth.spec.ts` — sign up with test email, log in, verify redirect to main page, log out
   - `e2e/tasks-crud.spec.ts` — add a task → verify appears in list → edit title → toggle complete → filter to "completed" → verify visible → filter to "active" → verify hidden → delete task → verify removed
2. Create `e2e/helpers/auth.ts` — reusable login helper for E2E tests
3. **UI polish**:
   - Responsive layout (mobile-first Tailwind)
   - Loading skeletons for task list
   - Error toast/banner for failed actions
   - Accessible labels on all interactive elements
   - Empty state when no tasks exist

**Verification**: `npm run test:e2e` — all E2E tests pass headlessly; `npm run build` — zero errors; `npm run lint` — zero warnings

---

## Phase 6 — Environments & Data Migration

### 6.1 Database migration

Create `supabase/migrations/002_environments.sql`:

1. Create `environments` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `name` (text, not null, max 100 chars via CHECK)
   - `owner_id` (uuid, FK → `auth.users(id)` ON DELETE CASCADE, not null)
   - `created_at` (timestamptz, default `now()`)
2. Create `environment_members` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `environment_id` (uuid, FK → `environments(id)` ON DELETE CASCADE, not null)
   - `user_id` (uuid, FK → `auth.users(id)` ON DELETE CASCADE, not null)
   - `role` (text, not null, CHECK `role IN ('owner', 'member')`)
   - `invited_at` (timestamptz, default `now()`)
   - `joined_at` (timestamptz, nullable — null means pending invitation)
   - UNIQUE constraint on (`environment_id`, `user_id`)
3. Add `environment_id` column to `tasks`:
   - `ALTER TABLE tasks ADD COLUMN environment_id uuid REFERENCES environments(id) ON DELETE CASCADE`
   - Initially nullable for migration, then set NOT NULL after data migration step
4. **Data migration** (within same migration, wrapped in transaction):
   - For each existing user: `INSERT INTO environments (name, owner_id) VALUES ('Personal', user_id)`
   - Insert matching `environment_members` row with `role = 'owner'` and `joined_at = now()`
   - `UPDATE tasks SET environment_id = (SELECT id FROM environments WHERE owner_id = tasks.user_id AND name = 'Personal')`
   - `ALTER TABLE tasks ALTER COLUMN environment_id SET NOT NULL`
5. Enable RLS on `environments`:
   - SELECT: `auth.uid() = owner_id` OR user is a joined member via `environment_members`
   - INSERT: `auth.uid() = owner_id`
   - UPDATE: `auth.uid() = owner_id`
   - DELETE: `auth.uid() = owner_id`
6. Enable RLS on `environment_members`:
   - SELECT: user is the `user_id` on the row OR user is the environment owner
   - INSERT: user is the environment owner (only owner can invite)
   - UPDATE: user is the `user_id` on the row (accept own invitation) OR user is the environment owner
   - DELETE: user is the `user_id` on the row (leave) OR user is the environment owner (remove member)
7. **Replace existing `tasks` RLS policies** — change from `auth.uid() = user_id` to environment-membership-based:
   - SELECT/INSERT/UPDATE/DELETE: user is a joined member of `tasks.environment_id` (via `environment_members` where `joined_at IS NOT NULL`)
   - INSERT WITH CHECK: `environment_id` matches a joined membership
8. Create indexes:
   - `CREATE INDEX idx_env_members_env_user ON environment_members (environment_id, user_id)`
   - `CREATE INDEX idx_env_members_user ON environment_members (user_id)`
   - `CREATE INDEX idx_tasks_env_created ON tasks (environment_id, created_at DESC)`
9. Create helper function `is_environment_member(env_id uuid)` returning boolean — checks if `auth.uid()` has a joined membership in the given environment. Use in RLS policies for DRY.

### 6.2 Types

1. Update `types/database.ts` — regenerate Supabase types (`npx supabase gen types typescript`)
2. Create `types/environment.ts`:
   - `Environment` — Row type from `environments` table
   - `EnvironmentInsert` — Insert type
   - `EnvironmentMember` — Row type from `environment_members` table
   - `EnvironmentMemberInsert` — Insert type

### 6.3 Server Actions

Create `app/actions/environments.ts`:

1. `createEnvironment(formData)` — auth guard, validate name (non-empty, max 100 chars, trimmed), insert environment + owner membership row, revalidate, return `{ error: null }` or `{ error: string }`
2. `renameEnvironment(formData)` — auth guard, validate ownership, validate name, update, revalidate
3. `deleteEnvironment(formData)` — auth guard, validate ownership, prevent deleting last environment, delete (CASCADE removes members + tasks + photos), revalidate
4. `getEnvironments()` — return all environments where the user is a joined member
5. `setActiveEnvironment(environmentId)` — store active environment ID in a cookie or URL param

### 6.4 Data Fetching

Modify `lib/tasks.ts`:

1. `getTasks(environmentId, filter)` — add `environment_id` filter to all task queries
2. `getActiveEnvironmentId()` — read from cookie/searchParams, fallback to user's first environment

### 6.5 UI Components

1. Create `components/environment-switcher.tsx` — `"use client"` dropdown in the header showing all user environments, current environment highlighted, click to switch
2. Modify `app/page.tsx` — pass active `environmentId` to `TaskList` and `TaskForm`
3. Modify `components/task-form.tsx` — include `environment_id` in task creation
4. Create `app/environments/page.tsx` — environment management page (create, rename, delete)

### 6.6 Tests

- `__tests__/actions/environments.test.ts` — test createEnvironment (valid, empty name, too-long name), renameEnvironment (owner only), deleteEnvironment (owner only, not last env)
- `__tests__/components/environment-switcher.test.tsx` — renders environments list, switching calls setActiveEnvironment

**Verification**: `npm run test` — all environment tests pass. Manual: create environment → switch → tasks are scoped → rename → delete.

---

## Phase 7 — Task States

### 7.1 Database migration

Create `supabase/migrations/003_task_states.sql`:

1. Add `state` column to `tasks`:
   - `ALTER TABLE tasks ADD COLUMN state text NOT NULL DEFAULT 'planned' CHECK (state IN ('planned', 'in_progress', 'dependent', 'finished'))`
2. **Data migration**:
   - `UPDATE tasks SET state = 'finished' WHERE completed = true`
   - `UPDATE tasks SET state = 'planned' WHERE completed = false`
3. Drop `completed` column:
   - `ALTER TABLE tasks DROP COLUMN completed`
4. Create index:
   - `CREATE INDEX idx_tasks_env_state ON tasks (environment_id, state)`

### 7.2 Types

1. Regenerate `types/database.ts`
2. Update `types/task.ts`:
   - Replace `TaskFilter = "all" | "active" | "completed"` with `TaskFilter = "all" | "planned" | "in_progress" | "dependent" | "finished"`
   - Add `TaskState = "planned" | "in_progress" | "dependent" | "finished"`

### 7.3 Server Actions

Modify `app/actions/tasks.ts`:

1. `createTask(formData)` — set `state: 'planned'` instead of `completed: false`
2. Remove `toggleTask(id)` — replace with `changeTaskState(formData)`:
   - Auth guard
   - Validate `state` is one of `planned`, `in_progress`, `finished` (users cannot manually set `dependent`)
   - If transitioning to `finished`: check no unfinished dependencies exist (query `task_dependencies` — will be empty until Phase 10, safe to add check now)
   - Update `state`, revalidate
3. `updateTask(id, formData)` — remove any `completed` field handling

### 7.4 Data Fetching

Modify `lib/tasks.ts`:

1. `getTasks(environmentId, filter)` — replace `completed` filter logic:
   - `"all"` → no state filter
   - `"planned"` → `.eq("state", "planned")`
   - `"in_progress"` → `.eq("state", "in_progress")`
   - `"dependent"` → `.eq("state", "dependent")`
   - `"finished"` → `.eq("state", "finished")`

### 7.5 UI Components

1. Modify `components/task-filter.tsx` — replace All/Active/Completed tabs with All/Planned/In Progress/Dependent/Finished
2. Modify `components/task-item.tsx`:
   - Replace checkbox toggle with a state badge (colored by state)
   - Add state transition dropdown or buttons (Planned → In Progress → Finished)
   - Show `dependent` state as read-only badge (cannot be manually changed)
3. Modify `app/page.tsx` — update filter param handling for new filter values

### 7.6 Tests

- Update `__tests__/actions/tasks.test.ts` — test `changeTaskState` (valid transitions, reject manual `dependent`, reject finish with unfinished deps placeholder)
- Update `__tests__/components/task-item.test.tsx` — renders state badge, state transition calls `changeTaskState`
- Update `__tests__/components/task-filter.test.tsx` — renders five tabs, clicking changes active filter

**Verification**: `npm run test` — all updated tests pass. Manual: create task (planned) → move to in_progress → finish → filter by each state.

---

## Phase 8 — Categories

### 8.1 Database migration

Create `supabase/migrations/004_categories.sql`:

1. Create `categories` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `environment_id` (uuid, FK → `environments(id)` ON DELETE CASCADE, not null)
   - `parent_id` (uuid, FK → `categories(id)` ON DELETE CASCADE, nullable — null = root)
   - `name` (text, not null, max 100 chars via CHECK)
   - `sort_order` (integer, not null, default 0)
   - `created_at` (timestamptz, default `now()`)
2. Add `category_id` to `tasks`:
   - `ALTER TABLE tasks ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL`
3. Enable RLS on `categories` — same environment-membership pattern:
   - SELECT/INSERT/UPDATE/DELETE: `is_environment_member(environment_id)`
   - INSERT WITH CHECK: `is_environment_member(environment_id)`
4. Create indexes:
   - `CREATE INDEX idx_categories_env ON categories (environment_id, parent_id, sort_order)`
   - `CREATE INDEX idx_tasks_category ON tasks (category_id)`

### 8.2 Types

1. Regenerate `types/database.ts`
2. Create `types/category.ts`:
   - `Category` — Row type
   - `CategoryInsert` — Insert type
   - `CategoryUpdate` — Update type
   - `CategoryTreeNode` — extends `Category` with `children: CategoryTreeNode[]` for UI tree

### 8.3 Server Actions

Create `app/actions/categories.ts`:

1. `createCategory(formData)` — auth guard, validate environment membership, validate name (non-empty, max 100 chars), validate `parent_id` belongs to same environment (if provided), insert, revalidate
2. `renameCategory(formData)` — auth guard, validate membership, validate name, update, revalidate
3. `moveCategory(formData)` — auth guard, validate membership, validate new `parent_id` belongs to same environment, prevent moving a category under its own subtree (circular check), update `parent_id` and `sort_order`, revalidate
4. `deleteCategory(formData)` — auth guard, validate membership, delete category (tasks set to `category_id = NULL` via ON DELETE SET NULL), revalidate

### 8.4 Data Fetching

Create `lib/categories.ts`:

1. `getCategories(environmentId)` — fetch all categories for the environment, ordered by `sort_order`
2. `buildCategoryTree(categories)` — pure function that transforms flat list into nested `CategoryTreeNode[]`

### 8.5 UI Components

1. Create `components/category-tree.tsx` — `"use client"`, collapsible tree sidebar showing environment categories with indent levels, click to select/filter
2. Create `components/category-form.tsx` — `"use client"`, inline form for creating/renaming categories, parent selector dropdown
3. Modify `components/task-form.tsx` — add optional category picker (dropdown of flat category list with indent indicators)
4. Modify `components/task-item.tsx` — show category name badge on task
5. Modify `components/task-list.tsx` — accept optional `categoryId` filter
6. Modify `lib/tasks.ts` — `getTasks(environmentId, filter, categoryId?)` — add `.eq("category_id", categoryId)` when provided; support `"uncategorized"` filter with `.is("category_id", null)`
7. Modify `app/page.tsx` — add sidebar layout with category tree, pass selected category to task list

### 8.6 Tests

- `__tests__/actions/categories.test.ts` — test CRUD (valid create, invalid name, rename, move, delete), circular parent prevention in moveCategory
- `__tests__/lib/categories.test.ts` — test `buildCategoryTree` with flat data (root, nested, multi-level)
- `__tests__/components/category-tree.test.tsx` — renders tree structure, click selects category, collapse/expand works

**Verification**: `npm run test` — all category tests pass. Manual: create root category → create sub-category → assign to task → filter by category → move category → delete category (tasks become uncategorized).

---

## Phase 9 — Tags

### 9.1 Database migration

Create `supabase/migrations/005_tags.sql`:

1. Create `tags` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `environment_id` (uuid, FK → `environments(id)` ON DELETE CASCADE, not null)
   - `name` (text, not null, max 50 chars via CHECK)
   - `color` (text, nullable — hex code, CHECK matches `^#[0-9a-fA-F]{6}$` or null)
   - `sort_order` (integer, not null, default 0)
   - `created_at` (timestamptz, default `now()`)
   - UNIQUE constraint on (`environment_id`, `name`)
2. Create `task_tags` junction table:
   - `task_id` (uuid, FK → `tasks(id)` ON DELETE CASCADE, not null)
   - `tag_id` (uuid, FK → `tags(id)` ON DELETE CASCADE, not null)
   - Composite PK on (`task_id`, `tag_id`)
3. Enable RLS on `tags` — environment-membership pattern:
   - SELECT/INSERT/UPDATE/DELETE: `is_environment_member(environment_id)`
4. Enable RLS on `task_tags` — access via joined task's environment:
   - SELECT/INSERT/DELETE: user is member of the task's environment (subquery through `tasks.environment_id`)
5. Create indexes:
   - `CREATE INDEX idx_tags_env ON tags (environment_id, sort_order)`
   - `CREATE INDEX idx_task_tags_tag ON task_tags (tag_id)`

### 9.2 Types

1. Regenerate `types/database.ts`
2. Create `types/tag.ts`:
   - `Tag` — Row type
   - `TagInsert` — Insert type
   - `TagUpdate` — Update type

### 9.3 Server Actions

Create `app/actions/tags.ts`:

1. `createTag(formData)` — auth guard, validate membership, validate name (non-empty, max 50 chars, unique in env), validate color (hex or empty), insert, revalidate
2. `renameTag(formData)` — auth guard, validate membership, validate unique name, update, revalidate
3. `updateTagColor(formData)` — auth guard, validate membership, validate hex, update, revalidate
4. `reorderTags(formData)` — auth guard, validate membership, update `sort_order` for batch of tag IDs, revalidate
5. `deleteTag(formData)` — auth guard, validate membership, delete (CASCADE removes task_tags rows), revalidate
6. `addTagToTask(formData)` — auth guard, validate task+tag in same environment, insert into `task_tags`, revalidate
7. `removeTagFromTask(formData)` — auth guard, validate membership, delete from `task_tags`, revalidate

### 9.4 Data Fetching

Create `lib/tags.ts`:

1. `getTags(environmentId)` — fetch all tags for environment, ordered by `sort_order`
2. `getTaskTags(taskId)` — fetch tags for a specific task via join

Modify `lib/tasks.ts`:

1. `getTasks(environmentId, filter, categoryId?, tagId?)` — when `tagId` is provided, filter tasks that have a matching `task_tags` row (use inner join or `in` subquery)

### 9.5 UI Components

1. Create `components/tag-chip.tsx` — `"use client"`, renders a single tag as a colored chip (pill) with name and optional remove button
2. Create `components/tag-manager.tsx` — `"use client"`, list of tags with create/rename/reorder/delete inline UI
3. Modify `components/task-form.tsx` — add multi-select tag picker (chips with add/remove)
4. Modify `components/task-item.tsx` — display tag chips alongside task title
5. Create `components/tag-filter.tsx` — `"use client"`, clickable tag chips to filter task list by tag
6. Modify `app/page.tsx` — add tag filter section, pass selected tag to task list

### 9.6 Tests

- `__tests__/actions/tags.test.ts` — test CRUD (create, rename, delete, duplicate name rejection, invalid color), tag-task association
- `__tests__/components/tag-chip.test.tsx` — renders with name and color, remove button callback
- `__tests__/components/tag-manager.test.tsx` — renders list, creates new tag, deletes tag

**Verification**: `npm run test` — all tag tests pass. Manual: create tag with color → assign to task → tag chip appears on task → filter by tag → remove tag from task → delete tag.

---

## Phase 10 — Task Dependencies

### 10.1 Database migration

Create `supabase/migrations/006_task_dependencies.sql`:

1. Create `task_dependencies` table:
   - `task_id` (uuid, FK → `tasks(id)` ON DELETE CASCADE, not null)
   - `depends_on_task_id` (uuid, FK → `tasks(id)` ON DELETE CASCADE, not null)
   - Composite PK on (`task_id`, `depends_on_task_id`)
   - CHECK constraint: `task_id != depends_on_task_id` (cannot depend on self)
2. Enable RLS on `task_dependencies` — access via task's environment:
   - SELECT/INSERT/DELETE: user is member of the task's environment
3. Create index:
   - `CREATE INDEX idx_task_deps_depends_on ON task_dependencies (depends_on_task_id)`
4. Create database function `check_circular_dependency(p_task_id uuid, p_depends_on_task_id uuid)` — recursive CTE that walks the dependency graph from `p_depends_on_task_id` upward to detect if `p_task_id` is already an ancestor (would create a cycle). Returns boolean.
5. Create trigger `prevent_circular_dependency` BEFORE INSERT on `task_dependencies` that calls `check_circular_dependency` and raises an exception if a cycle is detected.

### 10.2 Types

1. Regenerate `types/database.ts`
2. Create `types/dependency.ts`:
   - `TaskDependency` — Row type
   - `TaskWithDependencies` — extends `Task` with `dependencies: Task[]` and `dependents: Task[]`

### 10.3 Server Actions

Create `app/actions/dependencies.ts`:

1. `addDependency(formData)` — auth guard, validate both tasks are in the same environment, validate membership, insert into `task_dependencies` (DB trigger prevents circular), on success: check if the dependent task should transition to `dependent` state (if the prerequisite is not finished), revalidate
2. `removeDependency(formData)` — auth guard, validate membership, delete from `task_dependencies`, on success: check if the task should leave `dependent` state (if all remaining deps are finished), revalidate

Modify `app/actions/tasks.ts`:

1. `changeTaskState(formData)` — when transitioning to `finished`: query `task_dependencies` to verify all prerequisite tasks are finished; if not, return `{ error: "Cannot finish: unfinished dependencies exist" }`
2. `changeTaskState(formData)` — after successfully setting a task to `finished`: query `task_dependencies` for tasks that depend on this one, check if any can auto-transition from `dependent` to their previous state (planned/in_progress). Update those tasks.
3. `deleteTask` — dependency links are already removed by ON DELETE CASCADE

### 10.4 Data Fetching

Create `lib/dependencies.ts`:

1. `getTaskDependencies(taskId)` — fetch prerequisite tasks for a given task
2. `getTaskDependents(taskId)` — fetch tasks that depend on a given task

Modify `lib/tasks.ts`:

1. Optionally join dependency counts or blocked status into task list queries for UI indicators

### 10.5 UI Components

1. Create `components/dependency-picker.tsx` — `"use client"`, searchable list of tasks in the environment (excluding the current task and its dependents to avoid cycles), add/remove dependency buttons
2. Modify `components/task-item.tsx`:
   - Show "Blocked" badge when task state is `dependent`
   - Show dependency count indicator (e.g., "2 deps")
   - Clicking dependency indicator expands to show prerequisite task list
3. Create `components/task-detail.tsx` — `"use client"`, expanded task view with full dependency list, dependency picker, and photo section (prepared for Phase 11)
4. Modify `app/page.tsx` — clicking a task opens detail view (modal or inline expand)

### 10.6 Tests

- `__tests__/actions/dependencies.test.ts` — test addDependency (valid, same environment check, self-reference rejected), removeDependency, auto-state transitions
- `__tests__/lib/dependencies.test.ts` — test circular dependency detection logic (A→B→C→A rejected, A→B + A→C allowed)
- `__tests__/components/dependency-picker.test.tsx` — renders available tasks, excludes current task, add/remove calls actions

**Verification**: `npm run test` — all dependency tests pass. Manual: create tasks A, B, C → add dependency A depends on B → A becomes `dependent` → finish B → A returns to `planned` → try to make circular dep → rejected → finish A.

---

## Phase 11 — Task Photos & Completion Photo

### 11.1 Storage setup

1. Create Supabase Storage bucket `task-photos` (or configure per-environment buckets)
2. Set storage policies: only environment members can upload/read/delete from `{environment_id}/` path prefix
3. Configure MIME type restrictions: `image/jpeg`, `image/png`, `image/webp`
4. Configure max file size: 5 MB

### 11.2 Database migration

Create `supabase/migrations/007_task_photos.sql`:

1. Create `task_photos` table:
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `task_id` (uuid, FK → `tasks(id)` ON DELETE CASCADE, not null)
   - `storage_path` (text, not null)
   - `filename` (text, not null)
   - `size_bytes` (integer, not null)
   - `is_completion_photo` (boolean, not null, default false)
   - `uploaded_by` (uuid, FK → `auth.users(id)`, not null)
   - `created_at` (timestamptz, default `now()`)
2. Enable RLS on `task_photos`:
   - SELECT/INSERT/DELETE: user is member of the task's environment (join through `tasks.environment_id`)
3. Create indexes:
   - `CREATE INDEX idx_task_photos_task ON task_photos (task_id, created_at)`
4. Add constraint: at most one completion photo per task:
   - `CREATE UNIQUE INDEX idx_task_photos_completion ON task_photos (task_id) WHERE is_completion_photo = true`
5. Add constraint: max 10 photos per task (via trigger or application-level check):
   - Create trigger `check_max_photos` BEFORE INSERT on `task_photos` that counts existing photos for the task and raises exception if count >= 10

### 11.3 Types

1. Regenerate `types/database.ts`
2. Create `types/photo.ts`:
   - `TaskPhoto` — Row type
   - `TaskPhotoInsert` — Insert type

### 11.4 Server Actions / Route Handlers

Create `app/actions/photos.ts`:

1. `uploadPhoto(formData)` — auth guard, validate membership, validate file type (JPEG/PNG/WebP), validate file size (≤ 5 MB), validate photo count (< 10 for the task), upload to Supabase Storage at `{environment_id}/{task_id}/{uuid}.{ext}`, insert `task_photos` row, revalidate
2. `deletePhoto(formData)` — auth guard, validate membership, delete from Supabase Storage, delete `task_photos` row, revalidate
3. `uploadCompletionPhoto(formData)` — like `uploadPhoto` but sets `is_completion_photo = true`, validates no existing completion photo

Alternatively, create Route Handler `app/api/photos/route.ts` for streaming upload if Server Actions have size limitations:

1. `POST /api/photos` — multipart upload with same validation
2. `DELETE /api/photos/[id]` — delete by photo ID

### 11.5 Data Fetching

Create `lib/photos.ts`:

1. `getTaskPhotos(taskId)` — fetch all photos for a task, ordered by `created_at`
2. `getPhotoUrl(storagePath)` — generate signed or public URL from Supabase Storage

### 11.6 UI Components

1. Create `components/photo-upload.tsx` — `"use client"`, drag-and-drop or file picker, shows upload progress, validates client-side (type + size), calls `uploadPhoto` action
2. Create `components/photo-grid.tsx` — `"use client"`, thumbnail grid of task photos, click to open lightbox, delete button per photo
3. Create `components/photo-lightbox.tsx` — `"use client"`, full-size image viewer with prev/next navigation
4. Create `components/completion-photo-prompt.tsx` — `"use client"`, modal dialog shown when user clicks "Finish" on a task, with "Add completion photo" and "Skip" options
5. Modify `components/task-item.tsx` — show photo count badge, small thumbnail preview if photos exist
6. Modify `components/task-detail.tsx` — include `PhotoGrid` and `PhotoUpload` components

### 11.7 Tests

- `__tests__/actions/photos.test.ts` — test uploadPhoto (valid, invalid type, too large, max 10 limit), deletePhoto, uploadCompletionPhoto (valid, duplicate rejected)
- `__tests__/components/photo-upload.test.tsx` — renders drop zone, validates file type/size client-side, calls upload action
- `__tests__/components/photo-grid.test.tsx` — renders thumbnails, delete button calls action, click opens lightbox
- `__tests__/components/completion-photo-prompt.test.tsx` — renders prompt on finish, skip works, upload works

**Verification**: `npm run test` — all photo tests pass. Manual: upload photo to task → thumbnail appears → click for lightbox → finish task → completion photo prompt → upload completion photo → delete a photo.

---

## Phase 12 — Teams (Shared Environments)

### 12.1 Database changes

No new tables needed — `environment_members` already supports teams (from Phase 6). May need additional RLS refinements.

Create `supabase/migrations/008_teams.sql` (if needed):

1. Review and refine `environment_members` RLS for invitation workflow:
   - INSERT: owner can invite (insert with `joined_at = NULL`)
   - UPDATE: invited user can accept (set `joined_at = now()` on their own row) OR owner can modify
   - Ensure pending members (joined_at IS NULL) cannot access environment data
2. Add index on `environment_members (user_id, joined_at)` for efficient pending invitation queries
3. Verify that all environment-scoped entity RLS (tasks, categories, tags, task_tags, task_dependencies, task_photos) correctly checks `joined_at IS NOT NULL` in the membership check

### 12.2 Types

1. Update `types/environment.ts`:
   - Add `EnvironmentMemberWithEmail` — extends `EnvironmentMember` with user email (for display)
   - Add `InvitationStatus = "pending" | "accepted"`

### 12.3 Server Actions

Create `app/actions/teams.ts`:

1. `inviteMember(formData)` — auth guard, validate current user is environment owner, validate email format, look up user by email in `auth.users` (or handle non-existent user gracefully), insert `environment_members` row with `joined_at = NULL`, revalidate
2. `acceptInvitation(formData)` — auth guard, validate user is the invited member, set `joined_at = now()`, revalidate
3. `declineInvitation(formData)` — auth guard, validate user is the invited member, delete the membership row, revalidate
4. `removeMember(formData)` — auth guard, validate current user is environment owner, validate target is not the owner, delete membership row, revalidate
5. `leaveEnvironment(formData)` — auth guard, validate user is not the owner (owner must delete or transfer), delete own membership row, revalidate
6. `getPendingInvitations()` — fetch `environment_members` where `user_id = auth.uid()` and `joined_at IS NULL`, join with environment name

Modify `app/actions/environments.ts`:

1. `getEnvironments()` — update to include member count for each environment
2. `deleteEnvironment()` — verify cascade removes all members, tasks, categories, tags, photos

### 12.4 UI Components

1. Create `components/team-members.tsx` — `"use client"`, list of current members with role badge, remove button (owner only), leave button (members only)
2. Create `components/invite-form.tsx` — `"use client"`, email input + invite button, shows pending invitations
3. Create `components/pending-invitations.tsx` — `"use client"`, list of environments user has been invited to, accept/decline buttons
4. Modify `components/environment-switcher.tsx` — show pending invitation badge/count
5. Modify `app/environments/page.tsx` — add team management section (member list, invite form) for each environment
6. Create `app/invitations/page.tsx` — dedicated page for viewing and responding to invitations

### 12.5 Tests

- `__tests__/actions/teams.test.ts` — test inviteMember (valid, non-owner rejected, self-invite rejected), acceptInvitation, declineInvitation, removeMember (owner only), leaveEnvironment (not owner)
- `__tests__/components/team-members.test.tsx` — renders members, owner sees remove button, member sees leave button
- `__tests__/components/invite-form.test.tsx` — validates email, calls inviteMember
- `__tests__/components/pending-invitations.test.tsx` — renders invitations, accept/decline calls actions

**RLS verification tests** (important for security):
- `__tests__/rls/team-access.test.ts` — verify: member can read team tasks, non-member cannot, pending member cannot, removed member cannot, owner can manage members

**Verification**: `npm run test` — all team tests pass. Manual: create shared environment → invite user by email → user sees invitation → accept → both users see same tasks → create task as member → owner sees it → remove member → member can no longer access.

---

## Phase 13 — E2E Tests & Polish

### 13.1 Playwright E2E tests

Create/update E2E tests in `e2e/`:

1. `e2e/environments.spec.ts` — create environment → switch → verify empty task list → rename → create task → switch back → task not in other env → delete environment
2. `e2e/task-states.spec.ts` — create task (planned) → change to in_progress → change to finished → filter by each state → verify correct tasks shown
3. `e2e/categories.spec.ts` — create category → create sub-category → assign task to category → filter → move category → delete category → verify task is uncategorized
4. `e2e/tags.spec.ts` — create tag with color → assign to task → verify chip visible → filter by tag → remove tag → delete tag
5. `e2e/dependencies.spec.ts` — create tasks A and B → add dependency A→B → A shows blocked → finish B → A unblocked → try to create circular dep → rejected
6. `e2e/photos.spec.ts` — upload photo → verify thumbnail → open lightbox → delete photo → finish task → completion photo prompt → upload/skip
7. `e2e/teams.spec.ts` — create shared env → invite second user → accept → both see tasks → remove member → verify access revoked
8. Update `e2e/tasks-crud.spec.ts` — adapt to new state-based workflow instead of toggle
9. Update `e2e/helpers/auth.ts` — support multiple test users for team tests

### 13.2 Responsive design pass

1. Verify all new components work on mobile viewport (375px)
2. Category tree sidebar: collapsible or bottom sheet on mobile
3. Tag filter: horizontal scroll on narrow screens
4. Photo grid: responsive columns (1 on mobile, 2-3 on tablet, 4 on desktop)
5. Dependency picker modal: full-screen on mobile
6. Environment switcher: dropdown on desktop, full-screen picker on mobile

### 13.3 Dark mode verification

1. Verify all new components respect `dark:` Tailwind variants
2. State badges: readable colors in both modes
3. Tag chips: ensure color contrast meets WCAG AA in both modes
4. Photo lightbox: dark overlay in both modes

### 13.4 Accessibility audit

1. Keyboard navigation for category tree (arrow keys, Enter, Escape)
2. ARIA roles for tree view (`role="tree"`, `role="treeitem"`)
3. Screen reader labels for state badges, tag chips, photo actions
4. Focus management in modals (dependency picker, lightbox, completion prompt)
5. Alt text for photo thumbnails (filename or user-provided)

### 13.5 Performance check

1. Verify task list query performance with indexes (environment + state + category)
2. Photo thumbnail loading: use Supabase image transforms or lazy loading
3. Category tree: no N+1 queries (fetch all categories in one query, build tree client-side)
4. Bundle size check for new components

**Verification**: `npm run test:e2e` — all E2E tests pass. `npm run build` — zero errors. `npm run lint` — zero warnings. Lighthouse score ≥ 90 on all categories.

---

## File Map

| File | Purpose | Phase |
|------|---------|-------|
| `app/page.tsx` | Main task list page | 4, 6, 7, 8, 9, 10 |
| `app/login/page.tsx` | Auth page | 3 |
| `app/environments/page.tsx` | Environment management | 6, 12 |
| `app/invitations/page.tsx` | Pending invitations | 12 |
| `app/actions/tasks.ts` | Task CRUD + state transitions | 4, 7, 10 |
| `app/actions/environments.ts` | Environment CRUD | 6 |
| `app/actions/categories.ts` | Category CRUD | 8 |
| `app/actions/tags.ts` | Tag CRUD + task-tag assignment | 9 |
| `app/actions/dependencies.ts` | Dependency add/remove + auto-state | 10 |
| `app/actions/photos.ts` | Photo upload/delete | 11 |
| `app/actions/teams.ts` | Invite/accept/remove/leave | 12 |
| `app/auth/callback/route.ts` | OAuth callback | 3 |
| `app/api/photos/route.ts` | Photo upload Route Handler (optional) | 11 |
| `middleware.ts` | Session refresh | 3 |
| `components/task-list.tsx` | Task list (Server Component) | 4, 7, 8, 9 |
| `components/task-item.tsx` | Single task row + state badge + tags | 4, 7, 9, 10, 11 |
| `components/task-detail.tsx` | Expanded task view (deps + photos) | 10, 11 |
| `components/task-form.tsx` | New task form + category + tags | 4, 6, 8, 9 |
| `components/task-filter.tsx` | State filter tabs | 4, 7 |
| `components/auth-form.tsx` | Login/signup form | 3 |
| `components/environment-switcher.tsx` | Environment dropdown | 6, 12 |
| `components/category-tree.tsx` | Collapsible category sidebar | 8 |
| `components/category-form.tsx` | Category create/rename form | 8 |
| `components/tag-chip.tsx` | Colored tag pill | 9 |
| `components/tag-manager.tsx` | Tag list CRUD UI | 9 |
| `components/tag-filter.tsx` | Tag filter chips | 9 |
| `components/dependency-picker.tsx` | Searchable dependency selector | 10 |
| `components/photo-upload.tsx` | Drag-and-drop photo upload | 11 |
| `components/photo-grid.tsx` | Photo thumbnail grid | 11 |
| `components/photo-lightbox.tsx` | Full-size image viewer | 11 |
| `components/completion-photo-prompt.tsx` | Finish-task photo modal | 11 |
| `components/team-members.tsx` | Member list with remove/leave | 12 |
| `components/invite-form.tsx` | Email invitation form | 12 |
| `components/pending-invitations.tsx` | Accept/decline invitations | 12 |
| `lib/supabase.ts` | Browser Supabase client | 2 |
| `lib/supabase-server.ts` | Server Supabase client | 2 |
| `lib/tasks.ts` | Task data fetching | 4, 6, 7, 8, 9 |
| `lib/categories.ts` | Category fetching + tree builder | 8 |
| `lib/tags.ts` | Tag fetching | 9 |
| `lib/dependencies.ts` | Dependency fetching | 10 |
| `lib/photos.ts` | Photo fetching + URL generation | 11 |
| `lib/auth.ts` | Auth helpers | 3 |
| `lib/capacitor-auth.ts` | Native deep-link auth | 3 |
| `types/database.ts` | Supabase generated types | 2+ |
| `types/task.ts` | Task type + TaskFilter + TaskState | 2, 7 |
| `types/environment.ts` | Environment + member types | 6, 12 |
| `types/category.ts` | Category + tree node types | 8 |
| `types/tag.ts` | Tag types | 9 |
| `types/dependency.ts` | Dependency types | 10 |
| `types/photo.ts` | Photo types | 11 |
| `supabase/migrations/001_create_tasks.sql` | Tasks table + RLS | 2 |
| `supabase/migrations/002_environments.sql` | Environments + members + data migration | 6 |
| `supabase/migrations/003_task_states.sql` | State column + completed migration | 7 |
| `supabase/migrations/004_categories.sql` | Categories table + task FK | 8 |
| `supabase/migrations/005_tags.sql` | Tags + task_tags junction | 9 |
| `supabase/migrations/006_task_dependencies.sql` | Dependencies + circular check | 10 |
| `supabase/migrations/007_task_photos.sql` | Photos table + constraints | 11 |
| `supabase/migrations/008_teams.sql` | Team RLS refinements | 12 |

## Verification Summary

| Phase | Status | Automated Check | Command |
|-------|--------|----------------|---------|
| 1 | ✅ Complete | Dev server starts | `npm run dev` |
| 2 | ✅ Complete | DB types generate | `npx supabase gen types typescript` |
| 3 | ✅ Complete | Auth unit tests | `npm run test -- auth` |
| 4 | ✅ Complete | CRUD unit tests | `npm run test -- tasks` |
| 5 | ✅ Complete | Full E2E suite | `npm run test:e2e` |
| 6 | Pending | Environment tests | `npm run test -- environments` |
| 7 | Pending | State transition tests | `npm run test -- tasks` |
| 8 | Pending | Category tests | `npm run test -- categories` |
| 9 | Pending | Tag tests | `npm run test -- tags` |
| 10 | Pending | Dependency tests | `npm run test -- dependencies` |
| 11 | Pending | Photo tests | `npm run test -- photos` |
| 12 | Pending | Team tests | `npm run test -- teams` |
| 13 | Pending | Full E2E + build | `npm run test:e2e && npm run build && npm run lint` |
| All | — | Build + lint | `npm run build && npm run lint` |

## Key Decisions

- **Auth included** — Despite original SPEC saying "out of scope", Supabase Auth is included per user request. Each user sees only their tasks via RLS.
- **Two-layer testing** — Vitest (fast, mocked) for unit/component tests + Playwright (browser, real) for E2E.
- **No test DB for unit tests** — All Supabase calls mocked in Vitest; E2E tests run against a real (or local) Supabase instance.
- **Vercel hosting** — Zero-config deployment via `vercel` CLI or GitHub integration.
- **Environment-scoped RLS** — All entities are accessed through environment membership, replacing the original `user_id`-based RLS. A shared `is_environment_member()` helper function keeps policies DRY.
- **State machine over boolean** — Task states (`planned`/`in_progress`/`dependent`/`finished`) replace the `completed` boolean. The `dependent` state is auto-managed and cannot be set manually.
- **Circular dependency prevention at DB level** — A trigger with recursive CTE check prevents circular dependencies, providing a safety net regardless of application-level validation.
- **Single storage bucket** — Photos use a single `task-photos` bucket with `{environment_id}/{task_id}/` path prefix, scoped by storage policies.
- **Migration ordering** — Each phase builds on prior migrations. The `002_environments.sql` migration handles backward-compatible data migration of existing tasks and users.
- **Team equality** — All joined members have equal CRUD rights within an environment. Only the owner can manage membership and delete the environment.
