# TodoList Demo — Project Specification

## Overview

A task management application that allows authenticated users to manage their daily tasks across multiple environments. Users can create, view, update, and delete tasks through an intuitive interface — solo or collaboratively within shared team environments. Tasks are organized with hierarchical categories, cross-cutting tags, stateful workflows, dependency tracking, and photo attachments.

## Features

### Authentication

- **Sign up** — Create an account with email and password.
- **Log in / Log out** — Authenticate to access personal tasks.
- **Session persistence** — Stay logged in across page reloads.
- Data access is enforced via Supabase RLS — users can only access environments they own or belong to.

### Environments

- A user can have **multiple environments** (e.g., "Personal", "Family", "Company").
- Each environment is an isolated workspace containing its own tasks, categories, and tags.
- A user always works within one **active environment** at a time (environment switcher in the UI).
- Every user gets a default **"Personal"** environment on signup.
- A user can create, rename, and delete environments they own.
- Deleting an environment removes all its tasks, categories, tags, and photos for all members.

### Teams

- An environment can be **shared** with other users, forming a team.
- The environment owner can **invite members by email** and **remove members**.
- All members have **equal rights** to create, edit, and delete tasks, categories, and tags within the shared environment.
- The owner can **delete** the environment (removes it for all members).
- Members can **leave** a shared environment voluntarily.
- Invitations are pending until the invited user accepts.

### Core Functionality

- **Add a task** — Create a new task with a title, optional description, optional category, and optional tags.
- **List tasks** — View all tasks in the active environment, with filtering and sorting.
- **Change task state** — Transition a task through its workflow states (planned → in_progress → finished).
- **Edit a task** — Update the title, description, category, tags, or state of an existing task.
- **Delete a task** — Remove a task and its dependency links and photos from the environment.
- **Assign dependencies** — Link tasks so one blocks another until finished.
- **Attach photos** — Upload up to 10 photos per task; optionally attach a completion photo when finishing.

### Categories (hierarchical)

- Categories organize tasks within an environment.
- Categories can **nest** to unlimited depth (a category can contain sub-categories).
- A task can belong to **at most one category** (or none — uncategorized is allowed).
- CRUD: create, rename, move (re-parent), delete a category.
- Deleting a category moves its tasks to **uncategorized** (does NOT delete tasks).
- Categories are **per-environment**.

### Tags

- Tags provide cross-cutting labels for tasks within an environment.
- A task can have **multiple tags** (many-to-many).
- CRUD: create, rename, delete a tag.
- Each tag has an optional **color** (hex code) for visual distinction.
- Tags support **user-defined sort order**.
- Tags are **per-environment**.
- Deleting a tag removes it from all tasks (does NOT delete tasks).

### Task States

Tasks follow a state-based workflow instead of a simple completed boolean.

- **planned** — Task is created but not started (default).
- **in_progress** — Task is actively being worked on.
- **dependent** — Auto-set when a task has unfinished dependencies. Cannot be set manually.
- **finished** — Task is complete.

Rules:

- A task **cannot** be moved to `finished` if it has unfinished dependencies.
- The `dependent` state is **automatically applied** when a dependency is added whose prerequisite is not yet finished.
- When all dependencies are finished, the task auto-transitions from `dependent` back to its previous state (`planned` or `in_progress`).

### Task Dependencies

- A task can depend on **one or more** other tasks (many-to-many, within the same environment).
- All dependency tasks must be `finished` before the dependent task can be finished.
- **Circular dependencies are prevented** (validated on creation).
- Deleting a task **removes its dependency links** (does not block deletion).

### Task Photos

- A task can have **up to 10 photos** attached.
- Max file size: **5 MB** per photo.
- Accepted formats: JPEG, PNG, WebP.
- Photos are stored in **Supabase Storage** (bucket per environment).
- CRUD: upload, view (lightbox), delete a photo.
- Photos are displayed as thumbnails on the task detail view.

### Completion Photo

- When a user marks a task as `finished`, the UI **prompts** (but does not require) them to attach a "completion photo" as proof of completion.
- The completion photo is stored alongside other task photos, flagged with `is_completion_photo = true`.
- A task can have at most one completion photo.

### Filtering & Sorting

- Filter tasks by state: **All**, **Planned**, **In Progress**, **Dependent**, **Finished**.
- Filter by **category** (including an "Uncategorized" option).
- Filter by **tag** (any matching tag).
- Sort by creation date, state, or category.
- Default sort: newest first.

### Persistence

- All data is persisted in PostgreSQL via Supabase.
- Row Level Security ensures users can only access data within environments they own or are members of.
- File storage (photos) uses Supabase Storage with per-environment buckets.

---

## Data Model

### Environment

| Field      | Type        | Required | Description                        |
|------------|-------------|----------|------------------------------------|
| id         | uuid        | yes      | Unique identifier (auto-generated) |
| name       | text        | yes      | Environment name (max 100 chars)   |
| owner_id   | uuid        | yes      | Creator (FK → auth.users)          |
| created_at | timestamptz | yes      | Timestamp of creation              |

### Environment Member

| Field          | Type        | Required | Description                              |
|----------------|-------------|----------|------------------------------------------|
| id             | uuid        | yes      | Unique identifier (auto-generated)       |
| environment_id | uuid        | yes      | FK → environments                        |
| user_id        | uuid        | yes      | FK → auth.users                          |
| role           | text        | yes      | `owner` or `member`                      |
| invited_at     | timestamptz | yes      | When the invitation was sent             |
| joined_at      | timestamptz | no       | When the user accepted (null = pending)  |

### Category

| Field          | Type        | Required | Description                               |
|----------------|-------------|----------|-------------------------------------------|
| id             | uuid        | yes      | Unique identifier (auto-generated)        |
| environment_id | uuid        | yes      | FK → environments                         |
| parent_id      | uuid        | no       | FK → categories (null = root category)    |
| name           | text        | yes      | Category name (max 100 chars)             |
| sort_order     | integer     | yes      | Position among siblings                   |
| created_at     | timestamptz | yes      | Timestamp of creation                     |

### Tag

| Field          | Type        | Required | Description                        |
|----------------|-------------|----------|------------------------------------|
| id             | uuid        | yes      | Unique identifier (auto-generated) |
| environment_id | uuid        | yes      | FK → environments                  |
| name           | text        | yes      | Tag name (max 50 chars)            |
| color          | text        | no       | Hex color code for display         |
| sort_order     | integer     | yes      | User-defined position              |
| created_at     | timestamptz | yes      | Timestamp of creation              |

### Task

| Field          | Type        | Required | Description                                                          |
|----------------|-------------|----------|----------------------------------------------------------------------|
| id             | uuid        | yes      | Unique identifier (auto-generated)                                   |
| environment_id | uuid        | yes      | FK → environments                                                    |
| user_id        | uuid        | yes      | Creator (FK → auth.users)                                            |
| category_id    | uuid        | no       | FK → categories (null = uncategorized)                               |
| title          | text        | yes      | Short summary (max 200 chars)                                        |
| description    | text        | no       | Additional details                                                   |
| state          | text        | yes      | `planned` / `in_progress` / `dependent` / `finished` (default: `planned`) |
| created_at     | timestamptz | yes      | Timestamp of creation                                                |
| updated_at     | timestamptz | yes      | Timestamp of last modification                                       |

### Task–Tag (junction)

| Field   | Type | Required | Description  |
|---------|------|----------|--------------|
| task_id | uuid | yes      | FK → tasks   |
| tag_id  | uuid | yes      | FK → tags    |

Composite primary key on (`task_id`, `tag_id`).

### Task Dependency (junction)

| Field              | Type | Required | Description                      |
|--------------------|------|----------|----------------------------------|
| task_id            | uuid | yes      | The dependent task (FK → tasks)  |
| depends_on_task_id | uuid | yes      | The prerequisite task (FK → tasks) |

Composite primary key on (`task_id`, `depends_on_task_id`).

### Task Photo

| Field              | Type        | Required | Description                           |
|--------------------|-------------|----------|---------------------------------------|
| id                 | uuid        | yes      | Unique identifier (auto-generated)    |
| task_id            | uuid        | yes      | FK → tasks                            |
| storage_path       | text        | yes      | Path in Supabase Storage              |
| filename           | text        | yes      | Original filename                     |
| size_bytes         | integer     | yes      | File size in bytes                    |
| is_completion_photo| boolean     | yes      | Whether this is a completion proof photo (default: `false`) |
| uploaded_by        | uuid        | yes      | FK → auth.users                       |
| created_at         | timestamptz | yes      | Timestamp of upload                   |

---

## Data Migration (from v1)

Existing data must be migrated to the new schema:

- All existing users receive a default **"Personal"** environment.
- All existing tasks are assigned to the user's "Personal" environment (`environment_id` populated).
- Tasks with `completed = true` → `state = 'finished'`.
- Tasks with `completed = false` → `state = 'planned'`.
- The `completed` column is dropped after migration.

---

## Row Level Security

- **Environment-scoped RLS**: every table with an `environment_id` column restricts access to users who are members of that environment (via `environment_members`).
- Environment members have **equal CRUD rights** on all entities within their environments.
- The `environments` table allows SELECT/UPDATE/DELETE only for the owner; members access environments via membership.
- The `environment_members` table allows the owner to manage membership; members can read their own membership and leave.
- Photo storage policies mirror database RLS — only environment members can upload/read/delete photos in an environment's bucket.

---

## Mobile Platforms

- **Approach**: Capacitor wraps the deployed Vercel web app in a native WebView (remote URL strategy).
- **Platforms**: Android and iOS.
- **App ID**: `com.vladimirgronat.todolist`
- **Deep links**: Custom URL scheme (`com.vladimirgronat.todolist://`) handles Google OAuth callback on native devices.
- **Requires internet** — no offline mode (cloud-synced app).
- **Google OAuth on native**: Detects native platform via `Capacitor.isNativePlatform()` and uses the custom URL scheme for the OAuth redirect.

## UI Principles

- **Super simple and intuitive** — minimal clicks, clean layout.
- **Environment switcher** in the header or sidebar to change the active workspace.
- **Collapsible category tree** in the sidebar for navigation and filtering.
- **Tags** shown as colored chips on task items.
- **State badge** — each task displays its current state as a colored badge or icon.
- **Dependency indicators** — badges or arrows showing which tasks are blocked.
- **Photo thumbnails** displayed inline on task items; full-size lightbox on click.
- **Completion photo prompt** — a non-blocking prompt when finishing a task.

## Non-Functional Requirements

- Responsive UI that works on desktop and mobile screens.
- Accessible controls (keyboard navigation, ARIA labels).
- Fast initial load (< 1 s on a typical connection).

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Backend/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS
- **Mobile**: Capacitor (Android + iOS native shell)
- **Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E)

## Out of Scope

- Real-time sync / live presence (shared environments use standard request-response, not live collaboration).
- Recurring / scheduled tasks.
- Notifications and reminders.
- Offline mode.
- App store publishing automation.
