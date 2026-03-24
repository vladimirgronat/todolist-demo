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

const memberOk = () => ({ data: { role: "member" } });

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase = {
    from: vi.fn(() => chainable()),
    rpc: vi.fn(),
  };
  vi.mocked(createApiSupabaseClient).mockReturnValue(mockSupabase as never);
});

const envId = "env-1";
const catId = "cat-1";
const baseUrl = `http://localhost/api/v1/environments/${envId}/categories`;

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/categories                               */
/* ------------------------------------------------------------------ */
describe("GET /environments/:envId/categories", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const c = chainable();
    c.single.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { GET } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns flat list by default", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const cats = [
      { id: "c1", name: "Cat 1", parent_id: null, sort_order: 0, created_at: "2025-01-01", environment_id: envId },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "categories") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: cats, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns tree format when requested", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const cats = [
      { id: "c1", name: "Parent", parent_id: null, sort_order: 0, created_at: "2025-01-01", environment_id: envId },
      { id: "c2", name: "Child", parent_id: "c1", sort_order: 1, created_at: "2025-01-01", environment_id: envId },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "categories") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: cats, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await GET(createRequest(`${baseUrl}?format=tree`), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].children).toHaveLength(1);
  });

  it("returns 400 for invalid format", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await GET(createRequest(`${baseUrl}?format=xml`), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/categories                              */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/categories", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 100 chars", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/categories/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "x".repeat(101) }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /environments/:envId/categories/:id  (rename)               */
/* ------------------------------------------------------------------ */
describe("PATCH /environments/:envId/categories/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/v1/environments/[envId]/categories/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${catId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty name", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { PATCH } = await import("@/app/api/v1/environments/[envId]/categories/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${catId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:envId/categories/:id                        */
/* ------------------------------------------------------------------ */
describe("DELETE /environments/:envId/categories/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/v1/environments/[envId]/categories/[id]/route");
    const res = await DELETE(
      createRequest(`${baseUrl}/${catId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(401);
  });

  it("deletes and orphans tasks", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "categories") {
        c.single.mockResolvedValue({ data: { parent_id: null }, error: null });
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve);
        return c;
      }
      if (table === "tasks") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { DELETE } = await import("@/app/api/v1/environments/[envId]/categories/[id]/route");
    const res = await DELETE(
      createRequest(`${baseUrl}/${catId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /environments/:envId/categories/:id/move                    */
/* ------------------------------------------------------------------ */
describe("PATCH /environments/:envId/categories/:id/move", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/v1/environments/[envId]/categories/[id]/move/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${catId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: null }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(401);
  });

  it("rejects self as parent", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "categories") {
        c.single.mockResolvedValue({ data: { id: catId, parent_id: null } });
        return c;
      }
      return c;
    });

    const { PATCH } = await import("@/app/api/v1/environments/[envId]/categories/[id]/move/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${catId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: catId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: catId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("own parent");
  });
});
