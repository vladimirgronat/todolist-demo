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
    return apiForbidden("Only the assigned user can accept this task");
  }

  if (task.assignment_status !== "pending") {
    return apiBadRequest("Only pending assignments can be accepted");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "accepted",
      refusal_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
}
