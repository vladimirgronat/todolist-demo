import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase-server module
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";

// We need to dynamically import the actions after mocks are set up
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
});

describe("createTask", () => {
  it("rejects empty title", async () => {
    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "");
    const result = await createTask(formData);
    expect(result.error).toBe("Title is required");
  });

  it("rejects title longer than 200 characters", async () => {
    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "a".repeat(201));
    const result = await createTask(formData);
    expect(result.error).toBe("Title must be 200 characters or less");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Test task");
    formData.set("environment_id", "env-123");
    const result = await createTask(formData);
    expect(result.error).toBe("Not authenticated");
  });

  it("inserts task on valid input", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Buy groceries");
    formData.set("description", "Milk, eggs, bread");
    formData.set("environment_id", "env-456");

    const result = await createTask(formData);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        environment_id: "env-456",
        title: "Buy groceries",
        description: "Milk, eggs, bread",
        category_id: null,
      })
    );
  });
});

describe("changeTaskState", () => {
  it("updates task state", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    const { changeTaskState } = await import("@/app/actions/tasks");
    const result = await changeTaskState("task-1", "in_progress");
    expect(result.error).toBeNull();
    expect(updateMock).toHaveBeenCalledWith({ state: "in_progress" });
    expect(eqMock).toHaveBeenCalledWith("id", "task-1");
  });

  it("rejects invalid state", async () => {
    const { changeTaskState } = await import("@/app/actions/tasks");
    const result = await changeTaskState("task-1", "dependent");
    expect(result.error).toBe("Invalid state. Cannot manually set dependent state.");
  });
});

describe("deleteTask", () => {
  it("deletes the task", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ delete: deleteMock });

    const { deleteTask } = await import("@/app/actions/tasks");
    const result = await deleteTask("task-1");
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
    expect(eqMock).toHaveBeenCalledWith("id", "task-1");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    const { deleteTask } = await import("@/app/actions/tasks");
    const result = await deleteTask("task-1");
    expect(result.error).toBe("Not authenticated");
  });
});
