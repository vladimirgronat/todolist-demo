import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ envId: string; id: string; depId: string }>;
};

export const DELETE = async (
  request: NextRequest,
  { params }: RouteContext
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id: taskId, depId } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  // Verify task belongs to environment
  const { data: task } = await supabase
    .from("tasks")
    .select("id, state")
    .eq("id", taskId)
    .eq("environment_id", envId)
    .single();
  if (!task) return apiNotFound("Task not found");

  // Delete the dependency
  const { data: deleted, error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("task_id", taskId)
    .eq("depends_on_task_id", depId)
    .select("task_id");

  if (error) return apiNotFound("Failed to remove dependency");
  if (!deleted || deleted.length === 0) return apiNotFound("Dependency not found");

  // Auto-update task state: if no remaining unfinished deps and state is "dependent", revert to "planned"
  if (task.state === "dependent") {
    const { data: remainingDeps } = await supabase
      .from("task_dependencies")
      .select(
        "depends_on_task_id, tasks!task_dependencies_depends_on_task_id_fkey(state)"
      )
      .eq("task_id", taskId);

    const hasUnfinishedDeps = (remainingDeps ?? []).some((dep) => {
      const t = dep.tasks as unknown as { state: string } | null;
      return t && t.state !== "finished";
    });

    if (!hasUnfinishedDeps) {
      await supabase
        .from("tasks")
        .update({ state: "planned" })
        .eq("id", taskId);
    }
  }

  return apiSuccess({ removed: true });
};
