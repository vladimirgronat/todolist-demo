import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiBadRequest,
  apiPaginatedResponse,
} from "@/lib/api-response";

export const GET = async (request: NextRequest) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();

  const { searchParams } = request.nextUrl;
  const limitParam = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const cursor = searchParams.get("cursor");

  // Find environment IDs where user is a joined member
  const membershipsQuery = supabase
    .from("environment_members")
    .select("environment_id")
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null);

  const { data: memberships, error: memErr } = await membershipsQuery;
  if (memErr) return apiBadRequest(memErr.message);

  const envIds = (memberships ?? []).map((m) => m.environment_id);
  if (envIds.length === 0) {
    return apiPaginatedResponse([], null, false);
  }

  // Fetch environments with cursor-based pagination
  let query = supabase
    .from("environments")
    .select("id, name, owner_id, created_at")
    .in("id", envIds)
    .order("created_at", { ascending: false })
    .limit(limitParam + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) return apiBadRequest(error.message);

  const items = data ?? [];
  const hasMore = items.length > limitParam;
  const page = hasMore ? items.slice(0, limitParam) : items;
  const nextCursor = hasMore ? page[page.length - 1].created_at : null;

  return apiPaginatedResponse(page, nextCursor, hasMore);
};

export const POST = async (request: NextRequest) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const name =
    typeof (body as Record<string, unknown>)?.name === "string"
      ? ((body as Record<string, unknown>).name as string).trim()
      : "";

  if (!name) return apiBadRequest("name is required");
  if (name.length > 100)
    return apiBadRequest("name must be 100 characters or fewer");

  const { data: env, error: envErr } = await supabase
    .from("environments")
    .insert({ name, owner_id: auth.userId })
    .select("id, name, owner_id, created_at")
    .single();

  if (envErr) return apiBadRequest(envErr.message);

  const { error: memberErr } = await supabase
    .from("environment_members")
    .insert({
      environment_id: env.id,
      user_id: auth.userId,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

  if (memberErr) return apiBadRequest(memberErr.message);

  return apiSuccess(env, 201);
};
