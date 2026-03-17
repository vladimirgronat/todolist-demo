# TodoList Demo — Implementation & Testing Plan

## Overview

Build a Next.js App Router todo app with Supabase (auth + PostgreSQL), Tailwind CSS, and Vercel deployment. Automated testing via Vitest + React Testing Library (unit/component) and Playwright (E2E). Five phases, each independently verifiable.

---

## Phase 1 — Project Scaffolding & Dev Tooling

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

## Phase 2 — Supabase Setup & Database Schema

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

## Phase 3 — Authentication

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

## Phase 4 — Core Task CRUD

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

## Phase 5 — E2E Tests & Polish

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

## File Map

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main task list page |
| `app/login/page.tsx` | Auth page |
| `app/actions/tasks.ts` | CRUD server actions |
| `app/auth/callback/route.ts` | OAuth callback |
| `middleware.ts` | Session refresh |
| `components/task-list.tsx` | Task list (Server Component) |
| `components/task-item.tsx` | Single task row |
| `components/task-form.tsx` | New task form |
| `components/task-filter.tsx` | Filter tabs |
| `components/auth-form.tsx` | Login/signup form |
| `lib/supabase.ts` | Supabase client init |
| `lib/tasks.ts` | Data fetching queries |
| `lib/auth.ts` | Auth helpers |
| `types/database.ts` | Generated Supabase types |
| `types/task.ts` | Task interface |
| `vitest.config.ts` | Vitest config |
| `playwright.config.ts` | Playwright config |
| `__tests__/` | All Vitest tests |
| `e2e/` | All Playwright E2E tests |

## Verification Summary

| Phase | Automated Check | Command |
|-------|----------------|---------|
| 1 | Dev server starts | `npm run dev` |
| 2 | DB types generate | `npx supabase gen types typescript` |
| 3 | Auth unit tests | `npm run test -- auth` |
| 4 | CRUD unit tests | `npm run test -- tasks` |
| 5 | Full E2E suite | `npm run test:e2e` |
| All | Build + lint | `npm run build && npm run lint` |

## Key Decisions

- **Auth included** — Despite original SPEC saying "out of scope", Supabase Auth is included per user request. Each user sees only their tasks via RLS.
- **Two-layer testing** — Vitest (fast, mocked) for unit/component tests + Playwright (browser, real) for E2E.
- **No test DB for unit tests** — All Supabase calls mocked in Vitest; E2E tests run against a real (or local) Supabase instance.
- **Vercel hosting** — Zero-config deployment via `vercel` CLI or GitHub integration.
