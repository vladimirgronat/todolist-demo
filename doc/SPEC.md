# TodoList Demo — Project Specification

## Overview

A task management application that allows authenticated users to manage their daily tasks across multiple environments. Users can create, view, update, and delete tasks through an intuitive interface — solo or collaboratively within shared team environments. Tasks are organized with hierarchical categories, cross-cutting tags, stateful workflows, dependency tracking, and photo attachments. In shared environments, users can assign tasks to other members and those assignees can accept or refuse with an explanation.

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

### Task Assignment (team environments)

- In an environment with multiple joined members, a task creator can assign a task to another joined member.
- Assignment statuses:
	- **pending** — waiting for assignee decision.
	- **accepted** — assignee accepted responsibility for the task.
	- **refused** — assignee refused and provided a required explanation.
- Refusal explanation is required and limited to 500 characters.
- Creator can unassign a task at any time.
- Re-assigning a task sets status back to **pending** and clears previous refusal reason.

Assignee actions:

- **Accept** assignment.
- **Refuse** assignment with explanation.

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
- Additional team filters:
	- **Assigned to Me** — tasks where current user is assignee.
	- **I Assigned** — tasks assigned by current user.
	- **Refused** — tasks assigned by current user that were refused.
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
| assigned_to    | uuid        | no       | Assignee (FK → auth.users, nullable for unassigned tasks)           |
| assignment_status | text     | no       | `pending` / `accepted` / `refused` (nullable for unassigned tasks)  |
| refusal_reason | text        | no       | Required when `assignment_status = refused` (max 500 chars)         |
| assigned_at    | timestamptz | no       | Timestamp when task was assigned/re-assigned                         |
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

## Public REST API

### Overview

All application data is accessible through a versioned public REST API. The API serves both internal clients (web app, mobile apps) and external third-party integrations.

- **Base URL**: `/api/v1`
- **Format**: JSON request and response bodies
- **Authentication**: API key via `Authorization: Bearer <api_key>` header
- **Versioning**: URL-path versioning (`/api/v1/`, future `/api/v2/`, etc.)

### Authentication & API Keys

- Users generate API keys from their account settings.
- Each API key is scoped to the user — it inherits the same environment access as the user.
- API keys are stored as hashed values in the database (never stored in plain text).
- Keys can be revoked (soft-deleted) by the user at any time.
- Each request must include the `Authorization: Bearer <api_key>` header.
- Invalid or missing key → HTTP 401 Unauthorized.
- Max 5 active API keys per user.

#### API Key Data Model

| Field        | Type        | Required | Description                              |
|--------------|-------------|----------|------------------------------------------|
| id           | uuid        | yes      | Unique identifier (auto-generated)       |
| user_id      | uuid        | yes      | FK → auth.users                          |
| name         | text        | yes      | User-friendly label (max 100 chars)      |
| key_hash     | text        | yes      | SHA-256 hash of the API key              |
| key_prefix   | text        | yes      | First 8 chars of the key (for display)   |
| last_used_at | timestamptz | no       | Timestamp of last successful request     |
| created_at   | timestamptz | yes      | Timestamp of creation                    |
| revoked_at   | timestamptz | no       | Timestamp of revocation (null = active)  |

### Common Conventions

#### Pagination

All list endpoints support cursor-based pagination:

| Parameter | Type   | Default | Description                              |
|-----------|--------|---------|------------------------------------------|
| limit     | integer| 50      | Items per page (max 100)                 |
| cursor    | string | null    | Opaque cursor from previous response     |

Response envelope for list endpoints:

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6...",
    "has_more": true
  }
}
```

#### Filtering

List endpoints support filtering via query parameters:

- `state` — filter by task state (e.g., `?state=planned`)
- `category_id` — filter by category UUID
- `tag_id` — filter by tag UUID
- `assigned_to` — filter by assignee UUID
- `assignment_status` — filter by assignment status

Multiple filters can be combined (AND logic).

#### Sorting

- `sort` — field name (e.g., `created_at`, `updated_at`, `title`)
- `order` — `asc` or `desc` (default: `desc`)

#### Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": { "field": "title" }
  }
}
```

Standard error codes:

| HTTP Status | Code                | Description                          |
|-------------|---------------------|--------------------------------------|
| 400         | VALIDATION_ERROR    | Invalid input                        |
| 401         | UNAUTHORIZED        | Missing or invalid API key           |
| 403         | FORBIDDEN           | No access to requested resource      |
| 404         | NOT_FOUND           | Resource does not exist              |
| 409         | CONFLICT            | Conflict (e.g., circular dependency) |
| 422         | UNPROCESSABLE       | Semantic error (e.g., task has unfinished deps) |
| 500         | INTERNAL_ERROR      | Unexpected server error              |

### Resource Endpoints

#### Environments

| Method | Endpoint                                   | Description                        |
|--------|--------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments`                     | List user's environments           |
| POST   | `/api/v1/environments`                     | Create a new environment           |
| GET    | `/api/v1/environments/:id`                 | Get environment details            |
| PATCH  | `/api/v1/environments/:id`                 | Update environment (rename)        |
| DELETE | `/api/v1/environments/:id`                 | Delete environment (owner only)    |

#### Team Members

| Method | Endpoint                                               | Description                        |
|--------|---------------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:id/members`                     | List environment members           |
| POST   | `/api/v1/environments/:id/members`                     | Invite a member by email           |
| DELETE | `/api/v1/environments/:id/members/:user_id`            | Remove a member (owner only)       |
| POST   | `/api/v1/environments/:id/members/leave`               | Leave environment (non-owner)      |

#### Invitations

| Method | Endpoint                                   | Description                        |
|--------|--------------------------------------------|------------------------------------|
| GET    | `/api/v1/invitations`                      | List pending invitations for user  |
| POST   | `/api/v1/invitations/:id/accept`           | Accept an invitation               |
| POST   | `/api/v1/invitations/:id/decline`          | Decline an invitation              |

#### Tasks

| Method | Endpoint                                           | Description                        |
|--------|----------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:env_id/tasks`               | List tasks (with filtering/sorting/pagination) |
| POST   | `/api/v1/environments/:env_id/tasks`               | Create a new task                  |
| GET    | `/api/v1/environments/:env_id/tasks/:id`           | Get task details (includes tags, dependencies) |
| PATCH  | `/api/v1/environments/:env_id/tasks/:id`           | Update task fields                 |
| DELETE | `/api/v1/environments/:env_id/tasks/:id`           | Delete a task                      |
| POST   | `/api/v1/environments/:env_id/tasks/:id/state`     | Change task state                  |
| POST   | `/api/v1/environments/:env_id/tasks/:id/assign`    | Assign task to a member            |
| DELETE | `/api/v1/environments/:env_id/tasks/:id/assign`    | Unassign task                      |
| POST   | `/api/v1/environments/:env_id/tasks/:id/accept`    | Accept assignment                  |
| POST   | `/api/v1/environments/:env_id/tasks/:id/refuse`    | Refuse assignment (with reason)    |

#### Task Dependencies

| Method | Endpoint                                                           | Description                        |
|--------|--------------------------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:env_id/tasks/:id/dependencies`             | List task's dependencies           |
| POST   | `/api/v1/environments/:env_id/tasks/:id/dependencies`             | Add a dependency                   |
| DELETE | `/api/v1/environments/:env_id/tasks/:id/dependencies/:dep_id`    | Remove a dependency                |

#### Task Photos

| Method | Endpoint                                                       | Description                        |
|--------|----------------------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:env_id/tasks/:id/photos`               | List task photos (with URLs)       |
| POST   | `/api/v1/environments/:env_id/tasks/:id/photos`               | Upload a photo (multipart/form-data) |
| DELETE | `/api/v1/environments/:env_id/tasks/:id/photos/:photo_id`     | Delete a photo                     |

#### Categories

| Method | Endpoint                                               | Description                        |
|--------|---------------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:env_id/categories`              | List categories (flat or tree)     |
| POST   | `/api/v1/environments/:env_id/categories`              | Create a category                  |
| GET    | `/api/v1/environments/:env_id/categories/:id`          | Get category details               |
| PATCH  | `/api/v1/environments/:env_id/categories/:id`          | Update category (rename)           |
| PATCH  | `/api/v1/environments/:env_id/categories/:id/move`     | Move category (re-parent)          |
| DELETE | `/api/v1/environments/:env_id/categories/:id`          | Delete category                    |

#### Tags

| Method | Endpoint                                           | Description                        |
|--------|----------------------------------------------------|------------------------------------|
| GET    | `/api/v1/environments/:env_id/tags`                | List tags                          |
| POST   | `/api/v1/environments/:env_id/tags`                | Create a tag                       |
| GET    | `/api/v1/environments/:env_id/tags/:id`            | Get tag details                    |
| PATCH  | `/api/v1/environments/:env_id/tags/:id`            | Update tag (rename, color)         |
| DELETE | `/api/v1/environments/:env_id/tags/:id`            | Delete a tag                       |
| POST   | `/api/v1/environments/:env_id/tags/reorder`        | Batch reorder tags                 |

#### Task–Tag Association

| Method | Endpoint                                                       | Description                        |
|--------|----------------------------------------------------------------|------------------------------------|
| POST   | `/api/v1/environments/:env_id/tasks/:id/tags`                 | Add tag to task                    |
| DELETE | `/api/v1/environments/:env_id/tasks/:id/tags/:tag_id`         | Remove tag from task               |

### Business Rules (enforced by API)

All existing business rules from the web application are enforced identically in the API:

- Task state transitions follow the same workflow (planned → in_progress → finished; dependent state is automatic).
- Circular dependency prevention applies to dependency creation.
- Photo limits (max 10 per task, max 5 MB, JPEG/PNG/WebP only) apply to uploads.
- Category depth limit (max 50 levels) applies to creation and moves.
- Assignment rules (only environment members, pending/accepted/refused flow) apply.
- Environment access is scoped — API key owner must be a member of the environment.

### Security

- API keys are hashed (SHA-256) before storage — raw keys are only shown once at creation time.
- All endpoints enforce environment membership checks (equivalent to RLS).
- Input validation matches Server Action validation (max lengths, required fields, enum values).
- File uploads are validated for type and size before storage.
- API key abuse (invalid key attempts) should be logged for monitoring.

## Out of Scope

- Real-time sync / live presence (shared environments use standard request-response, not live collaboration).
- Recurring / scheduled tasks.
- Notifications and reminders.
- Offline mode.
- App store publishing automation.
