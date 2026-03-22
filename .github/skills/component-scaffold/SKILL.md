---
name: component-scaffold
description: "Scaffold a new UI component with Tailwind CSS, dark mode, responsive design, loading/error/empty states. Use when: new component, create component, UI scaffold, design component, Tailwind component, task component, form component, list component, card component"
---

# Component Scaffold

Create a new client component following the project's design system: Tailwind CSS, dark mode, responsive, accessible, with all UI states.

## When to Use

- Creating a new UI component from scratch
- Need a consistent starting point with proper states and styling

## Procedure

### 1. Choose Component Type

| Type | Use For | Example |
|------|---------|---------|
| Form | User input, creating/editing data | `task-form.tsx` |
| List | Displaying collections | `task-list.tsx` |
| Item | Single entity in a list | `task-item.tsx` |
| Filter | Filtering/sorting controls | `task-filter.tsx` |
| Card | Standalone content block | `status-card.tsx` |
| Banner | Notifications, alerts | `pwa-install-banner.tsx` |

### 2. Create the File

Location: `components/kebab-case.tsx`

### 3. Component Template

```typescript
"use client";

import { useState } from "react";

interface YourComponentProps {
  // define props
}

export const YourComponent = ({ ...props }: YourComponentProps) => {
  // state and handlers

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* component content */}
    </div>
  );
};
```

### 4. Design Tokens (Tailwind Reference)

#### Containers / Cards

```
rounded-xl border border-gray-200 bg-white p-6 shadow-sm
dark:border-gray-800 dark:bg-gray-900
```

#### Primary Button

```
rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
disabled:opacity-50 disabled:cursor-not-allowed
transition-colors duration-150
```

#### Secondary / Ghost Button

```
rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium
hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800
transition-colors duration-150
```

#### Destructive Button

```
text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950
transition-colors duration-150
```

#### Text Input

```
w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
placeholder:text-gray-400 dark:placeholder:text-gray-500
```

#### Typography

| Element | Classes |
|---------|---------|
| Heading h1 | `text-3xl font-bold text-gray-900 dark:text-gray-100` |
| Heading h2 | `text-xl font-semibold text-gray-900 dark:text-gray-100` |
| Body | `text-base text-gray-900 dark:text-gray-100` |
| Secondary / Caption | `text-sm text-gray-500 dark:text-gray-400` |
| Completed / Muted | `text-gray-400 line-through dark:text-gray-500` |

#### Colors Reference

| Purpose | Light | Dark |
|---------|-------|------|
| Primary | `blue-600` | `blue-400` |
| Success | `green-600` | `green-400` |
| Destructive | `red-600` | `red-400` |
| Background | `white` | `gray-950` |
| Card bg | `white` | `gray-900` |
| Border | `gray-200` | `gray-800` |
| Text primary | `gray-900` | `gray-100` |
| Text secondary | `gray-500` | `gray-400` |

### 5. Required UI States

Every data-driven component needs these states:

#### Loading State

```tsx
if (isLoading) {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}
```

#### Error State

```tsx
if (error) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
      <p>{error}</p>
      <button onClick={retry} className="mt-2 text-sm font-medium underline">
        Try again
      </button>
    </div>
  );
}
```

#### Empty State

```tsx
if (items.length === 0) {
  return (
    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg">No tasks yet</p>
      <p className="mt-1 text-sm">Add one above to get started!</p>
    </div>
  );
}
```

### 6. Responsive Rules

- **Mobile-first**: Start with base classes, add `sm:` / `md:` for larger screens
- **Touch targets**: All buttons and interactive elements minimum 44px (`min-h-[44px] min-w-[44px]`)
- **Stack on mobile**: Use `flex flex-col sm:flex-row` for side-by-side layouts
- **Max width**: Content areas use `max-w-2xl mx-auto`
- **No horizontal scroll**: Everything fits viewport width

### 7. Accessibility Requirements

- Use semantic HTML (`<button>`, `<form>`, `<label>`, `<main>`, `<section>`)
- Every input has `<label>` (visible or `className="sr-only"`)
- Buttons have visible text or `aria-label`
- Focus ring on all interactive elements (never remove `outline` without replacement)
- Use `role="alert"` for error messages
- Use `aria-live="polite"` for dynamic content updates
- Add `transition-colors duration-150` to interactive elements

### 8. Code Rules

- `"use client"` only if using hooks, event handlers, or browser APIs
- Named export: `export const MyComponent = () => {}`
- Arrow function, not function declaration
- Props via `interface`, not `type` (for object shapes)
- No default exports (except pages/layouts)
- No CSS modules, no styled-components — Tailwind only
- No large UI libraries (Material UI, Chakra, etc.)

## Checklist

- [ ] `"use client"` directive (only if needed)
- [ ] Named export with PascalCase name
- [ ] Props interface defined
- [ ] Dark mode support (`dark:` variants)
- [ ] Responsive design (mobile-first)
- [ ] Loading state
- [ ] Error state with retry
- [ ] Empty state
- [ ] Touch targets ≥ 44px
- [ ] All inputs have labels
- [ ] Focus rings visible
- [ ] Transitions on interactive elements
