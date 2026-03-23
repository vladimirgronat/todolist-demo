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

describe("reorderTags", () => {
  it("successfully reorders multiple tags in parallel", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();
    formData.set(
      "order",
      JSON.stringify([
        { id: "tag-1", sort_order: 0 },
        { id: "tag-2", sort_order: 1 },
        { id: "tag-3", sort_order: 2 },
      ])
    );

    const result = await reorderTags(formData);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("tags");
    expect(updateMock).toHaveBeenCalledTimes(3);
    expect(eqMock).toHaveBeenCalledWith("id", "tag-1");
    expect(eqMock).toHaveBeenCalledWith("id", "tag-2");
    expect(eqMock).toHaveBeenCalledWith("id", "tag-3");
  });

  it("returns error if any single update fails", async () => {
    let callCount = 0;
    const eqMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({ error: { message: "Update failed for tag-2" } });
      }
      return Promise.resolve({ error: null });
    });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();
    formData.set(
      "order",
      JSON.stringify([
        { id: "tag-1", sort_order: 0 },
        { id: "tag-2", sort_order: 1 },
        { id: "tag-3", sort_order: 2 },
      ])
    );

    const result = await reorderTags(formData);
    expect(result.error).toBe("Update failed for tag-2");
  });

  it("returns error when order data is missing", async () => {
    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();

    const result = await reorderTags(formData);
    expect(result.error).toBe("Order data is required");
  });

  it("returns error for invalid JSON", async () => {
    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();
    formData.set("order", "not-json");

    const result = await reorderTags(formData);
    expect(result.error).toBe("Invalid order data");
  });

  it("returns error for empty array", async () => {
    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();
    formData.set("order", "[]");

    const result = await reorderTags(formData);
    expect(result.error).toBe("Order must be a non-empty array");
  });

  it("returns error for invalid item structure", async () => {
    const { reorderTags } = await import("@/app/actions/tags");
    const formData = new FormData();
    formData.set(
      "order",
      JSON.stringify([{ id: 123, sort_order: "bad" }])
    );

    const result = await reorderTags(formData);
    expect(result.error).toBe(
      "Each order item must have id (string) and sort_order (number)"
    );
  });
});
