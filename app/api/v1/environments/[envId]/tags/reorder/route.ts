import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ envId: string }> };

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

  let body: { order?: Array<{ id: string; sort_order: number }> };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  if (!Array.isArray(body.order) || body.order.length === 0) {
    return apiBadRequest("order must be a non-empty array of { id, sort_order }");
  }

  for (const item of body.order) {
    if (typeof item.id !== "string" || typeof item.sort_order !== "number") {
      return apiBadRequest("Each item must have a string id and numeric sort_order");
    }
  }

  // Validate all tag IDs belong to this environment
  const tagIds = body.order.map((item) => item.id);
  const { data: tags } = await supabase
    .from("tags")
    .select("id")
    .eq("environment_id", envId)
    .in("id", tagIds);

  const foundIds = new Set((tags ?? []).map((t) => t.id));
  const invalidIds = tagIds.filter((id) => !foundIds.has(id));
  if (invalidIds.length > 0) {
    return apiBadRequest(`Tags not found in this environment: ${invalidIds.join(", ")}`);
  }

  for (const item of body.order) {
    await supabase
      .from("tags")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("environment_id", envId);
  }

  return apiSuccess({ reordered: true });
};
