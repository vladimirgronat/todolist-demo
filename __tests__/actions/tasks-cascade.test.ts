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

describe("changeTaskState cascade with Promise.all", () => {
  it("moves dependent task from 'dependent' to 'planned' when all deps are finished", async () => {
    // Setup: finishing task-1, which has one dependent task-2.
    // task-2 depends only on task-1, so after task-1 finishes, task-2 should move to "planned".
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "task_dependencies") {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === "depends_on_task_id") {
              return {
                eq: vi.fn().mockImplementation((_col: string, id: string) => {
                  if (id === "task-1") {
                    // task-1 has no deps of its own
                    return Promise.resolve({ data: [] });
                  }
                  if (id === "task-2") {
                    // task-2 depends on task-1
                    return Promise.resolve({
                      data: [{ depends_on_task_id: "task-1" }],
                    });
                  }
                  return Promise.resolve({ data: [] });
                }),
              };
            }
            if (cols === "task_id") {
              return {
                eq: vi.fn().mockImplementation(() =>
                  // dependents of task-1: task-2
                  Promise.resolve({ data: [{ task_id: "task-2" }] })
                ),
              };
            }
            return { eq: vi.fn().mockResolvedValue({ data: [] }) };
          }),
        };
      }

      if (table === "tasks") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === "id, state") {
              return {
                in: vi.fn().mockImplementation(() =>
                  // All deps of task-2 (just task-1) are finished
                  Promise.resolve({
                    data: [{ id: "task-1", state: "finished" }],
                  })
                ),
              };
            }
            if (cols === "state") {
              return {
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { state: "dependent" },
                  }),
                }),
              };
            }
            return { eq: vi.fn().mockResolvedValue({ data: null }) };
          }),
        };
      }

      return {};
    });

    const { changeTaskState } = await import("@/app/actions/tasks");
    const result = await changeTaskState("task-1", "finished");
    expect(result.error).toBeNull();

    // Verify the cascade update was attempted by checking `from` calls
    const fromCalls = mockSupabase.from.mock.calls.map((c) => c[0]);
    expect(fromCalls).toContain("task_dependencies");
    expect(fromCalls).toContain("tasks");
  });

  it("does not move dependent task when some deps are still unfinished", async () => {
    const taskUpdates: Array<{ state: string; id: string }> = [];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "task_dependencies") {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === "depends_on_task_id") {
              return {
                eq: vi.fn().mockImplementation((_col: string, id: string) => {
                  if (id === "task-1") {
                    return Promise.resolve({ data: [] });
                  }
                  if (id === "task-3") {
                    // task-3 depends on task-1 AND task-2
                    return Promise.resolve({
                      data: [
                        { depends_on_task_id: "task-1" },
                        { depends_on_task_id: "task-2" },
                      ],
                    });
                  }
                  return Promise.resolve({ data: [] });
                }),
              };
            }
            if (cols === "task_id") {
              return {
                eq: vi.fn().mockImplementation(() =>
                  // dependents of task-1: task-3
                  Promise.resolve({ data: [{ task_id: "task-3" }] })
                ),
              };
            }
            return { eq: vi.fn().mockResolvedValue({ data: [] }) };
          }),
        };
      }

      if (table === "tasks") {
        return {
          update: vi.fn().mockImplementation((updateData: { state: string }) => ({
            eq: vi.fn().mockImplementation((_col: string, id: string) => {
              taskUpdates.push({ state: updateData.state, id });
              return Promise.resolve({ error: null });
            }),
          })),
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === "id, state") {
              return {
                in: vi.fn().mockImplementation(() =>
                  // task-1 is finished, task-2 is still in_progress
                  Promise.resolve({
                    data: [
                      { id: "task-1", state: "finished" },
                      { id: "task-2", state: "in_progress" },
                    ],
                  })
                ),
              };
            }
            if (cols === "state") {
              return {
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { state: "dependent" },
                  }),
                }),
              };
            }
            return { eq: vi.fn().mockResolvedValue({ data: null }) };
          }),
        };
      }

      return {};
    });

    const { changeTaskState } = await import("@/app/actions/tasks");
    const result = await changeTaskState("task-1", "finished");
    expect(result.error).toBeNull();

    // task-3 should NOT have been moved to "planned" because task-2 is still in_progress
    const cascadePlanned = taskUpdates.filter(
      (u) => u.state === "planned" && u.id === "task-3"
    );
    expect(cascadePlanned).toHaveLength(0);
  });
});
