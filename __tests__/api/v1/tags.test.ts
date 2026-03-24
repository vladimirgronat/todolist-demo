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
const tagId = "tag-1";
const taskId = "task-1";
const baseUrl = `http://localhost/api/v1/environments/${envId}/tags`;

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/tags                                     */
/* ------------------------------------------------------------------ */
describe("GET /environments/:envId/tags", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns tags list for member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const tags = [{ id: "t1", name: "Bug", color: "#ff0000", sort_order: 1 }];

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tags") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: tags, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tags                                    */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tags", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "Bug" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
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

    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid color", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "Bug", color: "red" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("hex color");
  });

  it("creates tag with valid input", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const tag = { id: tagId, name: "Bug", color: "#ff0000", sort_order: 1 };

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tags") {
        c.single.mockResolvedValue({ data: tag, error: null });
        return c;
      }
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ name: "Bug", color: "#ff0000" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(201);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /environments/:envId/tags/:id                               */
/* ------------------------------------------------------------------ */
describe("PATCH /environments/:envId/tags/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/v1/environments/[envId]/tags/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Feature" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: tagId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid color", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { PATCH } = await import("@/app/api/v1/environments/[envId]/tags/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify({ color: "not-hex" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: tagId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:envId/tags/:id                              */
/* ------------------------------------------------------------------ */
describe("DELETE /environments/:envId/tags/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/v1/environments/[envId]/tags/[id]/route");
    const res = await DELETE(
      createRequest(`${baseUrl}/${tagId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: tagId }) }
    );
    expect(res.status).toBe(401);
  });

  it("deletes tag for member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "task_tags") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve);
        return c;
      }
      if (table === "tags") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { DELETE } = await import("@/app/api/v1/environments/[envId]/tags/[id]/route");
    const res = await DELETE(
      createRequest(`${baseUrl}/${tagId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: tagId }) }
    );
    expect(res.status).toBe(200);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tags/reorder                            */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tags/reorder", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/reorder/route");
    const res = await POST(
      createRequest(`${baseUrl}/reorder`, {
        method: "POST",
        body: JSON.stringify({ order: [] }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty order array", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/reorder/route");
    const res = await POST(
      createRequest(`${baseUrl}/reorder`, {
        method: "POST",
        body: JSON.stringify({ order: [] }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid order items", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tags/reorder/route");
    const res = await POST(
      createRequest(`${baseUrl}/reorder`, {
        method: "POST",
        body: JSON.stringify({ order: [{ id: 123, sort_order: "abc" }] }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/tags  (add tag to task)       */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks/:id/tags", () => {
  const taskTagUrl = `http://localhost/api/v1/environments/${envId}/tasks/${taskId}/tags`;

  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/tags/route");
    const res = await POST(
      createRequest(taskTagUrl, {
        method: "POST",
        body: JSON.stringify({ tag_id: tagId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-environment tag", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        c.single.mockResolvedValue({ data: { id: taskId } });
        return c;
      }
      if (table === "tags") {
        // Tag not found in this environment
        c.single.mockResolvedValue({ data: null });
        return c;
      }
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/tags/route");
    const res = await POST(
      createRequest(taskTagUrl, {
        method: "POST",
        body: JSON.stringify({ tag_id: "other-env-tag" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toContain("Tag not found");
  });
});
