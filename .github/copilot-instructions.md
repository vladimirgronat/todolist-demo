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
- `npm run test` — run Vitest unit/component tests
- `npm run test:coverage` — Vitest with coverage
- `npm run test:e2e` — run Playwright E2E tests
- `npm run cap:sync` — sync Capacitor native projects
- `npm run cap:android` — open Android project in Android Studio
- `npm run cap:ios` — open iOS project in Xcode

## Conventions

- Always validate user input at the API boundary (Server Actions / Route Handlers).
- Handle loading and error states in every data-fetching component.
- Use Supabase generated types for type-safe database queries.
- Keep Tailwind classes readable — extract to component when a class list exceeds ~5 utilities.

## Agents

Specialized agents are in `.github/agents/`. Use them for domain-specific work:

| Agent | Domain |
|-------|--------|
| **planner** | Feature planning, task breakdown, cross-cutting coordination — delegates to other agents |
| **manager** | Execution orchestration from approved plans/specs, dependency-aware delegation, implementation status tracking |
| **frontend** | UI components, Tailwind, pages, responsive design, dark mode, accessibility |
| **backend** | Server Actions, Supabase, RLS, migrations, auth, database schema |
| **testing** | Vitest, Playwright, test strategy, accessibility & visual regression tests |
| **web-to-android** | Capacitor Android, `cap sync`, native WebView config, debug/release APK |
| **android-build** | Bubblewrap TWA, APK signing, emulator, `android-twa/` project |
| **ios-build** | Capacitor iOS, Xcode, SPM, iOS simulator, Info.plist |
| **devops** | GitHub Actions CI/CD, Vercel config, build/test pipelines |
| **reviewer** | Architecture review, Next.js patterns, Supabase usage, security audit, code quality |

For multi-step or cross-cutting work, start with the **planner** agent.
For implementation execution from an approved plan/spec, use the **manager** agent.

## Skills

On-demand skills in `.github/skills/`. Loaded automatically when relevant, or invoke via `/skill-name`:

| Skill | Purpose |
|-------|---------|
| **supabase-migration** | Create migrations with RLS, indexes, triggers, and type updates |
| **server-action** | Scaffold Server Actions with auth guard, validation, error handling |
| **new-feature** | Plan & implement full-stack features across all layers |
| **apk-build-sign** | Build, sign, and install APKs for Capacitor and TWA projects |
| **accessibility-audit** | WCAG AA audit — keyboard nav, ARIA, contrast, semantic HTML |
| **component-scaffold** | Scaffold Tailwind components with dark mode, responsive, all UI states |
