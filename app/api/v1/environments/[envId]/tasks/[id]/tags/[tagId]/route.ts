import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ envId: string; id: string; tagId: string }> };

export const DELETE = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id, tagId } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: deleted } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", id)
    .eq("tag_id", tagId)
    .select("task_id");

  if (!deleted || deleted.length === 0) return apiNotFound();

  return apiSuccess({ removed: true });
};
