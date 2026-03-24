import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  );
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
});

describe("createTask description validation", () => {
  it("rejects description longer than 2000 characters", async () => {
    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Valid title");
    formData.set("description", "a".repeat(2001));
    formData.set("environment_id", "env-123");

    const result = await createTask(formData);
    expect(result.error).toBe("Description must be 2000 characters or less");
  });

  it("accepts description exactly 2000 characters", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Valid title");
    formData.set("description", "a".repeat(2000));
    formData.set("environment_id", "env-123");

    const result = await createTask(formData);
    expect(result.error).toBeNull();
  });

  it("accepts null description", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    const { createTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Valid title");
    formData.set("environment_id", "env-123");

    const result = await createTask(formData);
    expect(result.error).toBeNull();
  });
});

describe("updateTask description validation", () => {
  it("rejects description longer than 2000 characters", async () => {
    const { updateTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Valid title");
    formData.set("description", "a".repeat(2001));

    const result = await updateTask("task-1", formData);
    expect(result.error).toBe("Description must be 2000 characters or less");
  });

  it("accepts description exactly 2000 characters", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const selectEqSingleMock = vi.fn().mockResolvedValue({
      data: { user_id: "user-123", environment_id: "env-1" },
      error: null,
    });
    const selectEqMock = vi.fn().mockReturnValue({ single: selectEqSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "tasks") {
        return { select: selectMock, update: updateMock };
      }
      return { select: selectMock, update: updateMock };
    });

    const { updateTask } = await import("@/app/actions/tasks");
    const formData = new FormData();
    formData.set("title", "Valid title");
    formData.set("description", "a".repeat(2000));

    const result = await updateTask("task-1", formData);
    expect(result.error).toBeNull();
  });
});
