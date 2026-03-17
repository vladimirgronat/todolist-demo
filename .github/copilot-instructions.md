# Project Guidelines

## Overview

TodoList Demo — a task management app. See `doc/SPEC.md` for the full specification.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Backend/Auth**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **Mobile**: Capacitor (Android + iOS native WebView shell)

## Architecture

- Use Next.js App Router (`app/` directory) with Server Components by default; use `"use client"` only when needed.
- Colocate components, hooks, and utilities close to where they are used.
- Keep Supabase client initialization in a shared utility (`lib/supabase.ts`).
- Use Supabase Row Level Security (RLS) for data access control.
- Use Server Actions or Route Handlers for mutations — no direct DB calls from client components.

## Code Style

- Functional components with arrow functions.
- Named exports (no default exports except for pages/layouts).
- Use `interface` for object shapes, `type` for unions/intersections.
- Prefer `const` over `let`; never use `var`.
- Use early returns to reduce nesting.

## Naming Conventions

- Files/folders: `kebab-case` (e.g., `task-list.tsx`).
- Components: `PascalCase` (e.g., `TaskList`).
- Functions/variables: `camelCase`.
- Database tables/columns: `snake_case`.
- Environment variables: `UPPER_SNAKE_CASE`, prefixed with `NEXT_PUBLIC_` for client-exposed values.

## Build and Test

- Package manager: npm
- `npm run dev` — start development server
- `npm run build` — production build
- `npm run lint` — lint with ESLint
- `npm run cap:sync` — sync Capacitor native projects
- `npm run cap:android` — open Android project in Android Studio
- `npm run cap:ios` — open iOS project in Xcode

## Conventions

- Always validate user input at the API boundary (Server Actions / Route Handlers).
- Handle loading and error states in every data-fetching component.
- Use Supabase generated types for type-safe database queries.
- Keep Tailwind classes readable — extract to component when a class list exceeds ~5 utilities.
