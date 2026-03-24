import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ envId: string }> };

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId: id } = await params;
  const supabase = createApiSupabaseClient();

  // Verify membership
  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", id)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: env, error } = await supabase
    .from("environments")
    .select("id, name, owner_id, created_at")
    .eq("id", id)
    .single();

  if (error || !env) return apiNotFound("Environment not found");

  return apiSuccess(env);
};

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId: id } = await params;
  const supabase = createApiSupabaseClient();

  // Verify ownership
  const { data: env } = await supabase
    .from("environments")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (!env) return apiNotFound("Environment not found");
  if (env.owner_id !== auth.userId)
    return apiForbidden("Only the owner can update this environment");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const updates: Record<string, unknown> = {};
  const raw = body as Record<string, unknown> | null;

  if (raw?.name !== undefined) {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return apiBadRequest("name must not be empty");
    if (name.length > 100)
      return apiBadRequest("name must be 100 characters or fewer");
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return apiBadRequest("No valid fields to update");
  }

  const { data: updated, error } = await supabase
    .from("environments")
    .update(updates)
    .eq("id", id)
    .select("id, name, owner_id, created_at")
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
};

export const DELETE = async (
  request: NextRequest,
  { params }: RouteContext
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId: id } = await params;
  const supabase = createApiSupabaseClient();

  // Verify ownership
  const { data: env } = await supabase
    .from("environments")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (!env) return apiNotFound("Environment not found");
  if (env.owner_id !== auth.userId)
    return apiForbidden("Only the owner can delete this environment");

  const { error } = await supabase.from("environments").delete().eq("id", id);
  if (error) return apiBadRequest(error.message);

  return apiSuccess({ deleted: true });
};
