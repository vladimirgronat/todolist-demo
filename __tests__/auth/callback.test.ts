import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  );
});

describe("GET /auth/callback", () => {
  const importHandler = async () => {
    const { GET } = await import("@/app/auth/callback/route");
    return GET;
  };

  it("redirects to / on successful code exchange", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects to custom next path on success", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=/dashboard");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("blocks open redirect: next=//evil.com redirects to /", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=//evil.com");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.hostname).toBe("localhost");
  });

  it("blocks open redirect: next=https://evil.com redirects to /", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=https://evil.com");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.hostname).toBe("localhost");
  });

  it("blocks open redirect: next=//evil.com/path redirects to /", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=//evil.com/path");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.hostname).toBe("localhost");
  });

  it("redirects to /login?error=auth when no code provided", async () => {
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth");
  });

  it("redirects to /login?error=auth when code exchange fails", async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
    });
    const GET = await importHandler();

    const request = new Request("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth");
  });
});
