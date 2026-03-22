---
name: server-action
description: "Create Next.js Server Actions with Supabase auth guard, input validation, and error handling. Use when: creating server action, mutation, form handler, CRUD operation, insert data, update data, delete data, server-side form processing, API endpoint, revalidation"
---

# Server Action

Create a Server Action following the project's established auth-guard → validate → operate → revalidate pattern.

## When to Use

- Creating a new mutation (create, update, delete)
- Adding a form handler that writes to the database
- Any server-side operation triggered by a client component

## Procedure

### 1. Create or Edit the Action File

Server Actions live in `app/actions/`. Group related actions in one file (e.g., `app/actions/tasks.ts`).

### 2. Follow the Standard Pattern

Every Server Action MUST follow this exact structure:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const yourAction = async (formData: FormData) => {
  // 1. VALIDATE INPUT
  const title = formData.get("title")?.toString().trim();

  if (!title || title.length === 0) {
    return { error: "Title is required" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or less" };
  }

  // 2. AUTH GUARD
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // 3. DATABASE OPERATION
  const { error } = await supabase
    .from("your_table")
    .insert({
      user_id: user.id,
      title,
    });

  if (error) {
    return { error: error.message };
  }

  // 4. REVALIDATE & RETURN
  revalidatePath("/");
  return { error: null };
};
```

### 3. Action Variants

#### Create (INSERT)

```typescript
export const createItem = async (formData: FormData) => {
  // validate → auth → insert → revalidate
  const { error } = await supabase.from("table").insert({
    user_id: user.id,
    title: title,
  });
  // ...
};
```

#### Update (UPDATE by ID)

```typescript
export const updateItem = async (id: string, formData: FormData) => {
  // validate id + fields → auth → update → revalidate
  const { error } = await supabase
    .from("table")
    .update({ title: title })
    .eq("id", id);
  // ...
};
```

#### Toggle (UPDATE single field)

```typescript
export const toggleItem = async (id: string, currentValue: boolean) => {
  // auth → update opposite value → revalidate
  const { error } = await supabase
    .from("table")
    .update({ completed: !currentValue })
    .eq("id", id);
  // ...
};
```

#### Delete (DELETE by ID)

```typescript
export const deleteItem = async (id: string) => {
  // auth → delete → revalidate
  const { error } = await supabase.from("table").delete().eq("id", id);
  // ...
};
```

### 4. Rules

| Rule | Detail |
|------|--------|
| Always use `"use server"` | Top of every Server Action file |
| Always auth guard | `supabase.auth.getUser()` — never trust client-provided user ID |
| Always validate input | Trim strings, check length, check required fields |
| Return `{ error: string \| null }` | Never throw from Server Actions |
| Never return raw Supabase data | Unless the client explicitly needs it |
| Never expose internal errors | Return human-readable messages |
| Always `revalidatePath("/")` | After every successful mutation |
| Use `getUser()` not `getSession()` | `getUser()` validates JWT server-side |
| Named exports only | No default exports |
| Arrow functions | `export const myAction = async (...) => { }` |

### 5. Calling from Client Components

```typescript
"use client";

import { createTask } from "@/app/actions/tasks";

const TaskForm = () => {
  const handleSubmit = async (formData: FormData) => {
    const result = await createTask(formData);
    if (result.error) {
      // show error to user
    }
  };

  return (
    <form action={handleSubmit}>
      <input name="title" />
      <button type="submit">Add</button>
    </form>
  );
};
```

### 6. Verification Checklist

- [ ] `"use server"` directive at top of file
- [ ] Input validation before any DB call
- [ ] Auth guard with `getUser()` (not `getSession()`)
- [ ] `user_id` derived from auth, not from client input
- [ ] Error returns are human-readable strings
- [ ] `revalidatePath("/")` after success
- [ ] No `throw` — always return `{ error }` pattern
- [ ] String inputs trimmed

## Reference: Existing Actions

See [app/actions/tasks.ts](../../../app/actions/tasks.ts) for the established pattern with createTask, updateTask, toggleTask, deleteTask.
