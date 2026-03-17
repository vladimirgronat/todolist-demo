# TodoList Demo — Project Specification

## Overview

A simple todo list application that allows users to manage their daily tasks. Users can create, view, update, and delete tasks through an intuitive interface.

## Features

### Core FunctionalityTest Framework, E2E Tests)

- **Add a task** — Create a new task with a title and optional description.
- **List tasks** — View all tasks, with the ability to filter by status (all, active, completed).
- **Complete a task** — Mark a task as done.
- **Edit a task** — Update the title or description of an existing task.
- **Delete a task** — Remove a task from the list.

### Task Model

| Field       | Type      | Required | Description                        |
|-------------|-----------|----------|------------------------------------|
| id          | string    | yes      | Unique identifier (auto-generated) |
| title       | string    | yes      | Short summary of the task          |
| description | string    | no       | Additional details                 |
| completed   | boolean   | yes      | Whether the task is done           |
| createdAt   | datetime  | yes      | Timestamp of creation              |
| updatedAt   | datetime  | yes      | Timestamp of last modification     |

### Filtering & Sorting

- Filter tasks by status: **All**, **Active**, **Completed**.
- Sort tasks by creation date (newest first by default).

### Persistence

- Tasks are persisted so they survive page reloads / app restarts.

## Non-Functional Requirements

- Responsive UI that works on desktop and mobile screens.
- Accessible controls (keyboard navigation, ARIA labels).
- Fast initial load (< 1 s on a typical connection).

## Tech Stack



## Out of Scope

- User authentication and multi-user support.
- Real-time collaboration.
- Recurring / scheduled tasks.
- Notifications and reminders.
