# TodoList Demo — Project Specification

## Overview

A task management application that allows authenticated users to manage their daily tasks. Users can create, view, update, and delete tasks through an intuitive interface. AI-powered task suggestions help users stay productive.

## Features

### Authentication

- **Sign up** — Create an account with email and password.
- **Log in / Log out** — Authenticate to access personal tasks.
- **Session persistence** — Stay logged in across page reloads.
- Each user sees only their own tasks (enforced via Supabase RLS).

### Core Functionality

- **Add a task** — Create a new task with a title and optional description.
- **List tasks** — View all tasks, with the ability to filter by status (all, active, completed).
- **Complete a task** — Mark a task as done.
- **Edit a task** — Update the title or description of an existing task.
- **Delete a task** — Remove a task from the list.

### AI Task Suggestions

- **Suggest tasks** — Use Vectel.ai to generate 2–3 task suggestions based on existing tasks.
- Users can add suggested tasks with one click.
- Rate-limited to 5 suggestions per minute per user.

### Task Model

| Field       | Type        | Required | Description                        |
|-------------|-------------|----------|------------------------------------|
| id          | uuid        | yes      | Unique identifier (auto-generated) |
| user_id     | uuid        | yes      | Owner (FK → auth.users)            |
| title       | text        | yes      | Short summary of the task          |
| description | text        | no       | Additional details                 |
| completed   | boolean     | yes      | Whether the task is done           |
| created_at  | timestamptz | yes      | Timestamp of creation              |
| updated_at  | timestamptz | yes      | Timestamp of last modification     |

### Filtering & Sorting

- Filter tasks by status: **All**, **Active**, **Completed**.
- Sort tasks by creation date (newest first by default).

### Persistence

- Tasks are persisted in PostgreSQL via Supabase.
- Row Level Security ensures users can only access their own data.

## Non-Functional Requirements

- Responsive UI that works on desktop and mobile screens.
- Accessible controls (keyboard navigation, ARIA labels).
- Fast initial load (< 1 s on a typical connection).

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Backend/Auth**: Supabase (PostgreSQL + Auth)
- **AI**: Vectel.ai (task suggestions)
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E)

## Out of Scope

- Real-time collaboration.
- Recurring / scheduled tasks.
- Notifications and reminders.
- OAuth / social login (email + password only for now).
