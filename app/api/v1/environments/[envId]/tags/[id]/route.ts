import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

type RouteContext = { params: Promise<{ envId: string; id: string }> };

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: tag, error } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (error || !tag) return apiNotFound("Tag not found");

  return apiSuccess(tag);
};

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  let body: { name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const updates: { name?: string; color?: string | null } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 50) {
      return apiBadRequest("Name must be non-empty and at most 50 characters");
    }
    updates.name = name;
  }

  if (body.color !== undefined) {
    if (body.color === null) {
      updates.color = null;
    } else if (typeof body.color !== "string" || !HEX_COLOR_RE.test(body.color)) {
      return apiBadRequest("Color must be a valid hex color (e.g. #ff00aa)");
    } else {
      updates.color = body.color;
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiBadRequest("No valid fields to update");
  }

  const { data: tag, error } = await supabase
    .from("tags")
    .update(updates)
    .eq("id", id)
    .eq("environment_id", envId)
    .select("*")
    .single();

  if (error || !tag) return apiNotFound("Tag not found");

  return apiSuccess(tag);
};

export const DELETE = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  // Clean up task-tag associations first
  await supabase.from("task_tags").delete().eq("tag_id", id);

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("environment_id", envId);

  if (error) return apiBadRequest(error.message);

  return apiSuccess({ deleted: true });
};
