import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
  apiConflict,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ envId: string; id: string }> };

export const POST = async (request: NextRequest, { params }: RouteContext) => {
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

  let body: { tag_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const tagId = body.tag_id;
  if (!tagId || typeof tagId !== "string") {
    return apiBadRequest("tag_id is required");
  }

  // Verify task exists and belongs to this environment
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();
  if (!task) return apiNotFound("Task not found in this environment");

  // Verify tag exists and belongs to this environment (cross-environment prevention)
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("id", tagId)
    .eq("environment_id", envId)
    .single();
  if (!tag) return apiNotFound("Tag not found in this environment");

  // Check if already associated
  const { data: existing } = await supabase
    .from("task_tags")
    .select("task_id")
    .eq("task_id", id)
    .eq("tag_id", tagId)
    .single();
  if (existing) return apiConflict("Tag is already associated with this task");

  const { error } = await supabase
    .from("task_tags")
    .insert({ task_id: id, tag_id: tagId });

  if (error) return apiBadRequest(error.message);

  return apiSuccess({ added: true }, 201);
};
