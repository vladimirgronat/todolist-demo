import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockClient = {
  rpc: mockRpc,
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticateApiKey", () => {
  it("returns null when no Authorization header", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");
    const request = new Request("http://localhost/api/v1/test");

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null for non-Bearer token", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: "Basic abc123" },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null for key with wrong prefix", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer xxx_${"a".repeat(32)}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null for key with wrong length", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: "Bearer tdl_tooshort" },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null for key with non-hex chars after prefix", async () => {
    const { authenticateApiKey } = await import("@/lib/api-auth");
    // 32 chars but contains non-hex 'g'
    const badKey = `tdl_${"g".repeat(32)}`;
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${badKey}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns { userId } when key is valid", async () => {
    const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockRpc.mockResolvedValue({ data: userId, error: null });

    const { authenticateApiKey } = await import("@/lib/api-auth");
    const validKey = `tdl_${"a".repeat(32)}`;
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${validKey}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toEqual({ userId });
    expect(mockRpc).toHaveBeenCalledWith("verify_api_key", {
      p_key_hash: expect.any(String),
    });
  });

  it("returns null when key is revoked (verify_api_key returns null)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { authenticateApiKey } = await import("@/lib/api-auth");
    const validKey = `tdl_${"b".repeat(32)}`;
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${validKey}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null when rpc returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { authenticateApiKey } = await import("@/lib/api-auth");
    const validKey = `tdl_${"c".repeat(32)}`;
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${validKey}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("returns null when rpc returns non-UUID string", async () => {
    mockRpc.mockResolvedValue({ data: "not-a-uuid", error: null });

    const { authenticateApiKey } = await import("@/lib/api-auth");
    const validKey = `tdl_${"d".repeat(32)}`;
    const request = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${validKey}` },
    });

    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });
});
