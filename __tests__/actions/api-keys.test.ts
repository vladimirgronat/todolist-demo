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
    mockSupabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >
  );
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
});

describe("createApiKey", () => {
  it("creates key with valid name and returns rawKey starting with tdl_", async () => {
    // Mock count check: 0 active keys
    const selectChain = {
      _insertCalled: false,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "api_keys") {
        // First call is for count check, second for insert
        if (!selectChain._insertCalled) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
            insert: (...args: unknown[]) => {
              selectChain._insertCalled = true;
              return insertMock(...args);
            },
          };
        }
      }
      return selectChain;
    });

    // Simplify: mock from() to return an object that handles both flows
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // count query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      // insert query
      return { insert: insertMock };
    });

    const { createApiKey } = await import("@/app/actions/api-keys");
    const formData = new FormData();
    formData.set("name", "My Test Key");

    const result = await createApiKey(formData);
    expect(result.error).toBeUndefined();
    expect(result.rawKey).toBeDefined();
    expect(result.rawKey!.startsWith("tdl_")).toBe(true);
    expect(result.rawKey!.length).toBe(36); // tdl_ (4) + 32 hex chars
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        name: "My Test Key",
      })
    );
  });

  it("rejects empty name", async () => {
    const { createApiKey } = await import("@/app/actions/api-keys");
    const formData = new FormData();
    formData.set("name", "");

    const result = await createApiKey(formData);
    expect(result.error).toBe("Name is required");
  });

  it("rejects name exceeding 100 chars", async () => {
    const { createApiKey } = await import("@/app/actions/api-keys");
    const formData = new FormData();
    formData.set("name", "a".repeat(101));

    const result = await createApiKey(formData);
    expect(result.error).toBe("Name must be 100 characters or less");
  });

  it("returns error when user has 5 active keys (max limit)", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      }),
    }));

    const { createApiKey } = await import("@/app/actions/api-keys");
    const formData = new FormData();
    formData.set("name", "Another Key");

    const result = await createApiKey(formData);
    expect(result.error).toBe("You can have at most 5 active API keys");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const { createApiKey } = await import("@/app/actions/api-keys");
    const formData = new FormData();
    formData.set("name", "Some Key");

    const result = await createApiKey(formData);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("listApiKeys", () => {
  it("returns user's keys without key_hash field", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Key One",
        key_prefix: "tdl_a1b2c3d4",
        last_used_at: null,
        created_at: "2026-01-01T00:00:00Z",
        revoked_at: null,
      },
    ];

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockKeys, error: null }),
        }),
      }),
    }));

    const { listApiKeys } = await import("@/app/actions/api-keys");
    const result = await listApiKeys();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(mockKeys);
    // Verify select was called with specific fields (no key_hash)
    const selectCall = mockSupabase.from.mock.results[0].value.select;
    expect(selectCall).toHaveBeenCalledWith(
      "id, name, key_prefix, last_used_at, created_at, revoked_at"
    );
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const { listApiKeys } = await import("@/app/actions/api-keys");
    const result = await listApiKeys();
    expect(result.error).toBe("Not authenticated");
  });
});

describe("revokeApiKey", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("sets revoked_at on the key", async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi
                .fn()
                .mockResolvedValue({ data: [{ id: validUuid }], error: null }),
            }),
          }),
        }),
      }),
    }));

    const { revokeApiKey } = await import("@/app/actions/api-keys");
    const result = await revokeApiKey(validUuid);

    expect(result.error).toBeUndefined();
    expect(result).toHaveProperty("success", true);
  });

  it("returns error for invalid UUID", async () => {
    const { revokeApiKey } = await import("@/app/actions/api-keys");
    const result = await revokeApiKey("not-a-uuid");
    expect(result.error).toBe("Invalid key ID");
  });

  it("returns error for empty string", async () => {
    const { revokeApiKey } = await import("@/app/actions/api-keys");
    const result = await revokeApiKey("");
    expect(result.error).toBe("Invalid key ID");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const { revokeApiKey } = await import("@/app/actions/api-keys");
    const result = await revokeApiKey(validUuid);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when key not found or already revoked", async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi
                .fn()
                .mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }));

    const { revokeApiKey } = await import("@/app/actions/api-keys");
    const result = await revokeApiKey(validUuid);
    expect(result.error).toBe("Key not found or already revoked");
  });
});
