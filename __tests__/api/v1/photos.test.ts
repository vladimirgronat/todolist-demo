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

let mockSupabase: {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
};

const memberOk = () => ({ data: { role: "member" } });

const mockCreateSignedUrl = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase = {
    from: vi.fn(() => chainable()),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
        upload: mockUpload,
        remove: mockRemove,
      })),
    },
  };
  vi.mocked(createApiSupabaseClient).mockReturnValue(mockSupabase as never);
});

const envId = "env-1";
const taskId = "task-1";
const photoId = "photo-1";
const baseUrl = `http://localhost/api/v1/environments/${envId}/tasks/${taskId}/photos`;

/* ------------------------------------------------------------------ */
/*  GET /environments/:envId/tasks/:id/photos                         */
/* ------------------------------------------------------------------ */
describe("GET /tasks/:id/photos", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { GET } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
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
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
    );
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns photos with signed URLs", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    const photos = [
      { id: photoId, task_id: taskId, storage_path: "env/task/photo.jpg", created_at: "2025-01-01" },
    ];

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
    });

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
      if (table === "task_photos") {
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: photos, error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { GET } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
    );
    const res = await GET(createRequest(baseUrl), {
      params: Promise.resolve({ envId, id: taskId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].url).toBe("https://example.com/signed");
  });
});

/* ------------------------------------------------------------------ */
/*  POST /environments/:envId/tasks/:id/photos                       */
/* ------------------------------------------------------------------ */
describe("POST /tasks/:id/photos", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
    );
    // Create a minimal FormData request
    const formData = new FormData();
    formData.append("file", new Blob(["img"], { type: "image/jpeg" }), "test.jpg");

    const res = await POST(
      new NextRequest(new URL(baseUrl, "http://localhost"), {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-image file type", async () => {
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
      return c;
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["notimage"], { type: "application/pdf" }),
      "doc.pdf"
    );

    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
    );
    const res = await POST(
      new NextRequest(new URL(baseUrl, "http://localhost"), {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("JPEG");
  });

  it("enforces max 10 photos per task", async () => {
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
      if (table === "task_photos") {
        // count query
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ count: 10 }).then(resolve);
        return c;
      }
      return c;
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["img"], { type: "image/jpeg" }),
      "test.jpg"
    );

    const { POST } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/route"
    );
    const res = await POST(
      new NextRequest(new URL(baseUrl, "http://localhost"), {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ envId, id: taskId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("10");
  });
});

/* ------------------------------------------------------------------ */
/*  DELETE /environments/:envId/tasks/:id/photos/:photoId             */
/* ------------------------------------------------------------------ */
describe("DELETE /tasks/:id/photos/:photoId", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue(null);
    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/[photoId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${photoId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, photoId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent photo", async () => {
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
      if (table === "task_photos") {
        c.single.mockResolvedValue({ data: null });
        return c;
      }
      return c;
    });

    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/[photoId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${photoId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, photoId }) }
    );
    expect(res.status).toBe(404);
  });

  it("deletes photo and cleans up storage", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValue({ userId: "u1" });
    mockRemove.mockResolvedValue({ error: null });

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
      if (table === "task_photos") {
        c.single.mockResolvedValue({
          data: { id: photoId, storage_path: "path/photo.jpg", task_id: taskId },
        });
        (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve);
        return c;
      }
      return c;
    });

    const { DELETE } = await import(
      "@/app/api/v1/environments/[envId]/tasks/[id]/photos/[photoId]/route"
    );
    const res = await DELETE(
      createRequest(`${baseUrl}/${photoId}`, { method: "DELETE" }),
      { params: Promise.resolve({ envId, id: taskId, photoId }) }
    );
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith(["path/photo.jpg"]);
  });
});
