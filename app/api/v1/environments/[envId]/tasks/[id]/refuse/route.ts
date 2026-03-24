import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("assigned_to, assignment_status")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !task) return apiNotFound("Task not found");

  if (task.assigned_to !== auth.userId) {
    return apiForbidden("Only the assigned user can refuse this task");
  }

  if (task.assignment_status !== "pending" && task.assignment_status !== "accepted") {
    return apiBadRequest("Only pending or accepted assignments can be refused");
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // reason is optional, empty body is fine
  }

  const reason = body.reason?.trim() ?? null;
  if (reason && reason.length > 500) {
    return apiBadRequest("Refusal reason must be 500 characters or less");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "refused",
      refusal_reason: reason,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
}
