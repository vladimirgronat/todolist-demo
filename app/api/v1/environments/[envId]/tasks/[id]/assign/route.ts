import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const assigneeId = body.user_id;
  if (!assigneeId || !UUID_RE.test(assigneeId)) {
    return apiBadRequest("Valid user_id is required");
  }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !task) return apiNotFound("Task not found");

  if (assigneeId === task.user_id) {
    return apiBadRequest("Cannot assign a task to its creator");
  }

  // Verify assignee is a joined member
  const { data: assigneeMembership } = await supabase
    .from("environment_members")
    .select("id")
    .eq("environment_id", envId)
    .eq("user_id", assigneeId)
    .not("joined_at", "is", null)
    .single();

  if (!assigneeMembership) {
    return apiBadRequest("Assignee must be a joined member of this environment");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      assigned_to: assigneeId,
      assignment_status: "pending",
      assigned_at: new Date().toISOString(),
      refusal_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !task) return apiNotFound("Task not found");

  // Only task creator or environment owner can unassign
  if (task.user_id !== auth.userId) {
    const { data: env } = await supabase
      .from("environments")
      .select("owner_id")
      .eq("id", envId)
      .single();
    if (!env || env.owner_id !== auth.userId) {
      return apiForbidden("Only the task creator or environment owner can unassign");
    }
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      assigned_to: null,
      assignment_status: null,
      assigned_at: null,
      refusal_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
}
