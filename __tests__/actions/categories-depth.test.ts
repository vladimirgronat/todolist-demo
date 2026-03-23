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

describe("moveCategory depth and cycle detection", () => {
  it("allows a normal move with no cycle", async () => {
    // parent-1 has no parent_id (root)
    const calls: string[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                calls.push("select");
                // parent-1 is root → parent_id = null
                return Promise.resolve({ data: { parent_id: null } });
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const { moveCategory } = await import("@/app/actions/categories");
    const formData = new FormData();
    formData.set("parent_id", "parent-1");

    const result = await moveCategory("cat-1", formData);
    expect(result.error).toBeNull();
  });

  it("detects circular dependency: moving category under itself", async () => {
    // Moving cat-A under cat-B, but cat-B's parent is cat-A → cycle
    const parentMap: Record<string, string | null> = {
      "cat-B": "cat-A",
    };

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((_col: string, id: string) => ({
          single: vi.fn().mockResolvedValue({
            data: { parent_id: parentMap[id] ?? null },
          }),
        })),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));

    const { moveCategory } = await import("@/app/actions/categories");
    const formData = new FormData();
    formData.set("parent_id", "cat-B");

    const result = await moveCategory("cat-A", formData);
    expect(result.error).toBe(
      "Cannot move a category under itself or its descendants"
    );
  });

  it("handles deep chain gracefully without infinite loop", async () => {
    // Create a chain deeper than MAX_CATEGORY_DEPTH (50) that terminates in null
    // Each node's parent is the next node in the chain
    let counter = 0;
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            counter++;
            // Always return a parent, simulating an extremely deep chain
            // The loop should break at MAX_CATEGORY_DEPTH (50)
            return Promise.resolve({
              data: { parent_id: `deep-node-${counter}` },
            });
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));

    const { moveCategory } = await import("@/app/actions/categories");
    const formData = new FormData();
    formData.set("parent_id", "deep-node-0");

    // Should not hang — the depth limit causes the loop to break
    // and the update proceeds because no cycle was detected with `id`
    const result = await moveCategory("cat-no-match", formData);
    expect(result.error).toBeNull();
    // The loop ran exactly MAX_CATEGORY_DEPTH (50) times
    expect(counter).toBe(50);
  });

  it("allows move to root (no parent_id)", async () => {
    const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    const { moveCategory } = await import("@/app/actions/categories");
    const formData = new FormData();
    // Empty parent_id → move to root

    const result = await moveCategory("cat-1", formData);
    expect(result.error).toBeNull();
    expect(updateMock).toHaveBeenCalledWith({ parent_id: null });
  });
});
