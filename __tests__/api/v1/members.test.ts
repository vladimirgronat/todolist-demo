import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authenticateApiKey: vi.fn(),
  createApiSupabaseClient: vi.fn(),
}));

import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";

const createRequest = (url: string, options?: RequestInit) =>
  new NextRequest(new URL(url, "http://localhost"), options as never);

const chainable = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "not", "is",
    "in", "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
};

let mockSupabase: { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase = {
    from: vi.fn(() => chainable()),
    rpc: vi.fn(),
  };
  vi.mocked(createApiSupabaseClient).mockReturnValue(mockSupabase as never);
});

const envId = "env-1";
const userId = "user-1";
const targetUserId = "user-2";
const invitationId = "inv-1";

/* ------------------------------------------------------------------ */
/*  GET /environments/:id/members                                     */
/* ------------------------------------------------------------------ */
describe("GET /environments/:id/members", () => {
  const url = `http://localhost/api/v1/environments/${envId}/members`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await GET(createRequest(url), {
      params: Promise.resolve({ id: envId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    const c = chainable();
    c.maybeSingle.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { GET } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await GET(createRequest(url), {
      params: Promise.resolve({ id: envId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns members list", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    const members = [
      { id: "m1", user_id: userId, role: "owner", invited_at: "2025-01-01", joined_at: "2025-01-01" },
      { id: "m2", user_id: targetUserId, role: "member", invited_at: "2025-01-02", joined_at: "2025-01-02" },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        // First call: membership check (maybeSingle)
        c.maybeSingle.mockResolvedValue({ data: { id: "m1" } });
        // Second call: list members
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: members, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await GET(createRequest(url), {
      params: Promise.resolve({ id: envId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:id/members (invite)                           */
/* ------------------------------------------------------------------ */
describe("POST /environments/:id/members", () => {
  const url = `http://localhost/api/v1/environments/${envId}/members`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await POST(
      createRequest(url, {
        method: "POST",
        body: JSON.stringify({ email: "test@test.com" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: envId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: { owner_id: "other" } });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await POST(
      createRequest(url, {
        method: "POST",
        body: JSON.stringify({ email: "test@test.com" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: envId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing email", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: { owner_id: userId } });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[id]/members/route");
    const res = await POST(
      createRequest(url, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: envId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:id/members/:userId (remove)                 */
/* ------------------------------------------------------------------ */
describe("DELETE /environments/:id/members/:userId", () => {
  const url = `http://localhost/api/v1/environments/${envId}/members/${targetUserId}`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import(
      "@/app/api/v1/environments/[id]/members/[userId]/route"
    );
    const res = await DELETE(createRequest(url, { method: "DELETE" }), {
      params: Promise.resolve({ id: envId, userId: targetUserId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: { owner_id: "other" } });
      return c;
    });

    const { DELETE } = await import(
      "@/app/api/v1/environments/[id]/members/[userId]/route"
    );
    const res = await DELETE(createRequest(url, { method: "DELETE" }), {
      params: Promise.resolve({ id: envId, userId: targetUserId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when owner tries to remove self", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: { owner_id: userId } });
      return c;
    });

    const selfUrl = `http://localhost/api/v1/environments/${envId}/members/${userId}`;
    const { DELETE } = await import(
      "@/app/api/v1/environments/[id]/members/[userId]/route"
    );
    const res = await DELETE(createRequest(selfUrl, { method: "DELETE" }), {
      params: Promise.resolve({ id: envId, userId }),
    });
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:id/members/leave                              */
/* ------------------------------------------------------------------ */
describe("POST /environments/:id/members/leave", () => {
  const url = `http://localhost/api/v1/environments/${envId}/members/leave`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[id]/members/leave/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: envId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when owner tries to leave", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: { owner_id: userId } });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[id]/members/leave/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: envId }),
    });
    expect(res.status).toBe(403);
  });
});

/* ------------------------------------------------------------------ */
/*  GET /api/v1/invitations                                           */
/* ------------------------------------------------------------------ */
describe("GET /invitations", () => {
  const url = "http://localhost/api/v1/invitations";

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/invitations/route");
    const res = await GET(createRequest(url));
    expect(res.status).toBe(401);
  });

  it("returns empty array when no invitations", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return c;
    });

    const { GET } = await import("@/app/api/v1/invitations/route");
    const res = await GET(createRequest(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/v1/invitations/:id/accept                               */
/* ------------------------------------------------------------------ */
describe("POST /invitations/:id/accept", () => {
  const url = `http://localhost/api/v1/invitations/${invitationId}/accept`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/invitations/[id]/accept/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: invitationId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent invitation", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.maybeSingle.mockResolvedValue({ data: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/invitations/[id]/accept/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: invitationId }),
    });
    expect(res.status).toBe(404);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/v1/invitations/:id/decline                              */
/* ------------------------------------------------------------------ */
describe("POST /invitations/:id/decline", () => {
  const url = `http://localhost/api/v1/invitations/${invitationId}/decline`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/invitations/[id]/decline/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: invitationId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent invitation", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.maybeSingle.mockResolvedValue({ data: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/invitations/[id]/decline/route");
    const res = await POST(createRequest(url, { method: "POST" }), {
      params: Promise.resolve({ id: invitationId }),
    });
    expect(res.status).toBe(404);
  });
});
