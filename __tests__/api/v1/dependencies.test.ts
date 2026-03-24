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
const taskId = "task-1";
const depId = "dep-task-1";
const baseUrl = `http://localhost/api/v1/environments/${envId}/tasks/${taskId}/dependencies`;

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/tasks/:id/dependencies                   */
/* ------------------------------------------------------------------ */
describe("GET /tasks/:id/dependencies", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const c = chainable();
    c.single.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { GET } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns dependencies for member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const deps = [
      {
        depends_on_task_id: depId,
        tasks: { id: depId, title: "Dep", state: "planned" },
      },
    ];

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
      if (table === "task_dependencies") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: deps, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].depends_on_task_id).toBe(depId);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/dependencies                  */
/* ------------------------------------------------------------------ */
describe("POST /tasks/:id/dependencies", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ depends_on_task_id: depId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for self-dependency", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ depends_on_task_id: taskId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("itself");
  });

  it("returns 409 for circular dependency", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });

    const tasks = [
      { id: taskId, state: "planned" },
      { id: depId, state: "planned" },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        // Both tasks exist
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: tasks }).then(resolve);
        return c;
      }
      if (table === "task_dependencies") {
        // First call: BFS check — depId depends on taskId (circular!)
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [{ depends_on_task_id: taskId }] }).then(resolve);
        return c;
      }
      return c;
    });

    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/route"
    );
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ depends_on_task_id: depId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toContain("Circular");
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:envId/tasks/:id/dependencies/:depId         */
/* ------------------------------------------------------------------ */
describe("DELETE /tasks/:id/dependencies/:depId", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/[depId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${depId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, depId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const c = chainable();
    c.single.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/[depId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${depId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, depId }) }
    );
    expect(res.status).toBe(403);
  });

  it("removes dependency and auto-updates state", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        c.single.mockResolvedValue({ data: { id: taskId, state: "dependent" } });
        return c;
      }
      if (table === "task_dependencies") {
        // delete call
        c.select.mockReturnValue(c);
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [{ task_id: taskId }], error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/dependencies/[depId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${depId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, depId }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.removed).toBe(true);
  });
});
