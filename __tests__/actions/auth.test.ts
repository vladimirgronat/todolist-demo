import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const mockSupabase = {
  auth: {
    signOut: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  );
  mockSupabase.auth.signOut.mockResolvedValue({ error: null });
});

describe("signOut", () => {
  it("calls supabase.auth.signOut()", async () => {
    const { signOut } = await import("@/app/actions/auth");

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it("calls redirect('/login')", async () => {
    const { signOut } = await import("@/app/actions/auth");

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
