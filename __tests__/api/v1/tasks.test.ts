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
    "in", "lt", "gt", "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
};

let mockSupabase: { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

const memberOk = () => ({ data: { role: "member" } });

const setupMember = () => {
  vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
};

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
const baseUrl = `http://localhost/api/v1/environments/${envId}/tasks`;

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/tasks                                    */
/* ------------------------------------------------------------------ */
describe("GET /environments/:envId/tasks", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    setupMember();
    const c = chainable();
    c.single.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns paginated tasks for member", async () => {
    setupMember();
    const tasks = [
      { id: "t1", title: "Task 1", state: "planned", created_at: "2025-01-01" },
    ];
    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: tasks, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toBeDefined();
  });

  it("returns 400 for invalid sort field", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await GET(createRequest(`${baseUrl}?sort=invalid`), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid state filter", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await GET(createRequest(`${baseUrl}?state=bogus`), {
      params: Promise.resolve({ envId }),
    });
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks                                   */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ title: "T" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/route");
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

  it("creates task with valid input", async () => {
    setupMember();
    const task = { id: taskId, title: "New task", state: "planned" };

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        c.single.mockResolvedValue({ data: task, error: null });
        return c;
      }
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/route");
    const res = await POST(
      createRequest(baseUrl, {
        method: "POST",
        body: JSON.stringify({ title: "New task" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId }) }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe("New task");
  });
});

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/tasks/:id                                */
/* ------------------------------------------------------------------ */
describe("GET /environments/:envId/tasks/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await GET(createRequest(`${baseUrl}/${taskId}`), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    setupMember();
    const c = chainable();
    c.single.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(c);

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await GET(createRequest(`${baseUrl}/${taskId}`), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns task with tags and dependencies", async () => {
    setupMember();
    const task = { id: taskId, title: "T", state: "planned" };

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        c.single.mockResolvedValue({ data: task, error: null });
        return c;
      }
      if (table === "task_tags") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [{ tag_id: "tag1" }] }).then(resolve);
        return c;
      }
      if (table === "tags") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [{ id: "tag1", name: "Bug", color: "#ff0000" }] }).then(resolve);
        return c;
      }
      if (table === "task_dependencies") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [{ depends_on_task_id: "dep1" }] }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await GET(createRequest(`${baseUrl}/${taskId}`), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tags).toHaveLength(1);
    expect(body.data.dependencies).toEqual(["dep1"]);
  });
});

/* ------------------------------------------------------------------ */
/*  PATCH /environments/:envId/tasks/:id                              */
/* ------------------------------------------------------------------ */
describe("PATCH /environments/:envId/tasks/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Up" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("rejects state field via PATCH", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { PATCH } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await PATCH(
      createRequest(`${baseUrl}/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "finished" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("state");
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:envId/tasks/:id                             */
/* ------------------------------------------------------------------ */
describe("DELETE /environments/:envId/tasks/:id", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/route");
    const res = await DELETE(
      createRequest(`${baseUrl}/${taskId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/state                        */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks/:id/state", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/state/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/state`, {
        method: "POST",
        body: JSON.stringify({ state: "finished" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid state value", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/state/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/state`, {
        method: "POST",
        body: JSON.stringify({ state: "invalid" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
  });

  it("enforces valid state transitions", async () => {
    setupMember();
    const task = { id: taskId, title: "T", state: "dependent" };

    mockSupabase.from.mockImplementation((table: string) => {
      const c = chainable();
      if (table === "environment_members") {
        c.single.mockResolvedValue(memberOk());
        return c;
      }
      if (table === "tasks") {
        c.single.mockResolvedValue({ data: task, error: null });
        return c;
      }
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/state/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/state`, {
        method: "POST",
        body: JSON.stringify({ state: "finished" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("Invalid transition");
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/assign                       */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks/:id/assign", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/assign/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/assign`, {
        method: "POST",
        body: JSON.stringify({ user_id: "u2" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid user_id", async () => {
    setupMember();
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue(memberOk());
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/assign/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/assign`, {
        method: "POST",
        body: JSON.stringify({ user_id: "not-a-uuid" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/accept                       */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks/:id/accept", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/accept/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/accept`, { method: "POST" }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not the assigned user", async () => {
    setupMember();
    const task = { assigned_to: "other-user", assignment_status: "pending" };
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: task, error: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/accept/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/accept`, { method: "POST" }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(403);
  });

  it("rejects non-pending assignment", async () => {
    setupMember();
    const task = { assigned_to: "u1", assignment_status: "accepted" };
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: task, error: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/accept/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/accept`, { method: "POST" }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("pending");
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/refuse                       */
/* ------------------------------------------------------------------ */
describe("POST /environments/:envId/tasks/:id/refuse", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/refuse/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/refuse`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not the assigned user", async () => {
    setupMember();
    const task = { assigned_to: "other-user", assignment_status: "pending" };
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: task, error: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/refuse/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/refuse`, {
        method: "POST",
        body: JSON.stringify({ reason: "Too busy" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(403);
  });

  it("rejects reason over 500 chars", async () => {
    setupMember();
    const task = { assigned_to: "u1", assignment_status: "pending" };
    mockSupabase.from.mockImplementation(() => {
      const c = chainable();
      c.single.mockResolvedValue({ data: task, error: null });
      return c;
    });

    const { POST } = await import("@/app/api/v1/environments/[envId]/tasks/[id]/refuse/route");
    const res = await POST(
      createRequest(`${baseUrl}/${taskId}/refuse`, {
        method: "POST",
        body: JSON.stringify({ reason: "x".repeat(501) }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
  });
});
