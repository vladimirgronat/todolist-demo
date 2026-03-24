import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
} from "@/lib/api-response";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

type RouteContext = { params: Promise<{ envId: string }> };

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("environment_id", envId)
    .order("sort_order", { ascending: true });

  if (error) return apiBadRequest(error.message);

  return apiSuccess(data ?? []);
};

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId } = await params;
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    return apiBadRequest("Name is required and must be at most 50 characters");
  }

  if (body.color !== undefined && body.color !== null) {
    if (typeof body.color !== "string" || !HEX_COLOR_RE.test(body.color)) {
      return apiBadRequest("Color must be a valid hex color (e.g. #ff00aa)");
    }
  }

  // Get max sort_order for this environment
  const { data: maxRow } = await supabase
    .from("tags")
    .select("sort_order")
    .eq("environment_id", envId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({
      environment_id: envId,
      name,
      color: body.color ?? null,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(tag, 201);
};
