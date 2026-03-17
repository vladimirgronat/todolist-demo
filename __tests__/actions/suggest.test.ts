import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/vectel", () => ({
  getSuggestions: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSuggestions } from "@/lib/vectel";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any);
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
});

describe("suggestTasks", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    const { suggestTasks } = await import("@/app/actions/suggest");
    const result = await suggestTasks();
    expect(result.error).toBe("Not authenticated");
    expect(result.suggestions).toEqual([]);
  });

  it("returns suggestions from Vectel.ai", async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{ title: "Existing task" }],
    });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const mockSuggestions = [
      { title: "Go for a run", description: "Morning jog" },
      { title: "Read a book", description: null },
    ];
    vi.mocked(getSuggestions).mockResolvedValue(mockSuggestions);

    const { suggestTasks } = await import("@/app/actions/suggest");
    const result = await suggestTasks();
    expect(result.error).toBeNull();
    expect(result.suggestions).toEqual(mockSuggestions);
  });

  it("handles Vectel.ai API errors", async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [] });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    vi.mocked(getSuggestions).mockRejectedValue(
      new Error("Vectel API error: 500")
    );

    const { suggestTasks } = await import("@/app/actions/suggest");
    const result = await suggestTasks();
    expect(result.error).toBe("Vectel API error: 500");
    expect(result.suggestions).toEqual([]);
  });
});
