---
name: accessibility-audit
description: "Run accessibility audits on components and pages. WCAG AA compliance, keyboard navigation, screen reader support, ARIA attributes, color contrast, semantic HTML. Use when: accessibility, a11y, WCAG, screen reader, keyboard navigation, focus management, aria-label, contrast ratio, semantic HTML audit"
---

# Accessibility Audit

Verify WCAG AA compliance across components and pages using both static analysis (Vitest + RTL) and dynamic testing (Playwright).

## When to Use

- Reviewing accessibility of new or modified components
- Running an a11y audit before a release
- Fixing reported accessibility issues
- Adding ARIA attributes or keyboard navigation

## Procedure

### 1. Static Audit (Component Level — Vitest + RTL)

For each client component, verify:

#### Semantic HTML

```typescript
// Verify semantic elements are used
expect(screen.getByRole("main")).toBeInTheDocument();
expect(screen.getByRole("navigation")).toBeInTheDocument();
expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
```

Required semantic elements:
- `<main>` for primary content
- `<nav>` for navigation
- `<section>` / `<article>` for content grouping
- `<button>` for clickable actions (not `<div onClick>`)
- `<form>` wrapping form inputs
- `<label>` for every input

#### Form Labels

Every input MUST have an associated label:

```typescript
// Visible label
expect(screen.getByLabelText("Email")).toBeInTheDocument();

// Or sr-only label
expect(screen.getByLabelText("Search tasks")).toBeInTheDocument();
```

#### ARIA Attributes

```typescript
// Interactive elements with state
expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked");

// Tabs
expect(screen.getByRole("tab", { selected: true })).toBeInTheDocument();

// Live regions for dynamic content
expect(screen.getByRole("alert")).toBeInTheDocument();
// or
expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
```

#### Required ARIA Patterns

| Component | Required ARIA |
|-----------|--------------|
| Task checkbox | `role="checkbox"`, `aria-checked` |
| Filter tabs | `role="tab"`, `aria-selected`, `role="tablist"` |
| Task form | `<label>` for input, `aria-describedby` for errors |
| Delete button | `aria-label="Delete task: {title}"` |
| Loading states | `aria-busy="true"` on container |
| Error messages | `role="alert"` |
| Success notifications | `aria-live="polite"` |

### 2. Dynamic Audit (Page Level — Playwright)

#### Keyboard Navigation

```typescript
test("all interactive elements are keyboard-reachable", async ({ page }) => {
  await page.goto("/");

  // Tab through all interactive elements
  await page.keyboard.press("Tab");
  const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
  expect(firstFocused).not.toBe("BODY"); // something received focus

  // Test specific interactions
  await page.getByRole("textbox", { name: "Add a new task" }).focus();
  await page.keyboard.type("Test task");
  await page.keyboard.press("Enter"); // form submits via keyboard
});
```

#### Focus Management

```typescript
test("focus moves correctly after actions", async ({ page }) => {
  // After deleting a task, focus should move to a logical element
  // After closing a dialog, focus returns to trigger element
  // After adding a task, input should be re-focused
});
```

#### Axe-Core Automated Scan (if available)

```typescript
import AxeBuilder from "@axe-core/playwright";

test("page passes axe accessibility checks", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### 3. Visual Contrast Audit

Check these Tailwind color pairings meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Element | Light Mode | Dark Mode | Passes? |
|---------|-----------|-----------|---------|
| Body text | `text-gray-900` on `bg-white` | `dark:text-gray-100` on `dark:bg-gray-950` | Yes (15.4:1, 15.1:1) |
| Secondary text | `text-gray-500` on `bg-white` | `dark:text-gray-400` on `dark:bg-gray-950` | Check (~5.7:1, ~5.2:1) |
| Completed task | `text-gray-400` on `bg-white` | `dark:text-gray-500` on `dark:bg-gray-950` | Borderline — verify |
| Button text | `text-white` on `bg-blue-600` | Same | Yes (4.7:1) |
| Error text | `text-red-600` on `bg-white` | `dark:text-red-400` on `dark:bg-gray-950` | Check |

### 4. Checklist

#### Must Pass (WCAG AA)

- [ ] Every `<input>` has an associated `<label>` (visible or `sr-only`)
- [ ] Every `<button>` has visible text or `aria-label`
- [ ] Every `<img>` / icon has `alt` text or `aria-label`
- [ ] All interactive elements reachable via Tab key
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals/dropdowns
- [ ] Focus is visible on all interactive elements (no `outline: none` without replacement)
- [ ] Color is never the sole indicator (always paired with text/icon)
- [ ] Dynamic content updates use `aria-live` regions
- [ ] Text contrast ratio ≥ 4.5:1 (normal) or ≥ 3:1 (large/bold)
- [ ] Touch targets ≥ 44x44px on mobile

#### Should Pass (Best Practice)

- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] Page has a single `<main>` landmark
- [ ] Skip-to-content link for keyboard users
- [ ] Form errors announced via `role="alert"` or `aria-live`
- [ ] Loading states use `aria-busy`
- [ ] Completed tasks have `aria-label` indicating completed status

## Test File Locations

| Type | Location |
|------|----------|
| Component a11y (Vitest) | `__tests__/components/` — add to existing test files |
| Page a11y (Playwright) | `e2e/accessibility.spec.ts` |
| Axe scan (Playwright) | `e2e/accessibility.spec.ts` |
