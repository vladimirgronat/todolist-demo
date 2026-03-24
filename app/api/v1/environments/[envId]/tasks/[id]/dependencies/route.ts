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

  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();
  if (!task) return apiNotFound("Task not found");

  const { data, error } = await supabase
    .from("task_dependencies")
    .select(
      "depends_on_task_id, tasks!task_dependencies_depends_on_task_id_fkey(id, title, state)"
    )
    .eq("task_id", id);

  if (error) return apiBadRequest(error.message);

  const dependencies = (data ?? []).map((row) => ({
    depends_on_task_id: row.depends_on_task_id,
    task: row.tasks,
  }));

  return apiSuccess(dependencies);
};

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id: taskId } = await params;
  const supabase = createApiSupabaseClient();

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();
  if (!membership) return apiForbidden("Not a member of this environment");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const raw = body as Record<string, unknown> | null;
  const dependsOnTaskId =
    typeof raw?.depends_on_task_id === "string"
      ? raw.depends_on_task_id.trim()
      : "";

  if (!dependsOnTaskId) return apiBadRequest("depends_on_task_id is required");

  // Self-referential check
  if (taskId === dependsOnTaskId) {
    return apiBadRequest("A task cannot depend on itself");
  }

  // Verify both tasks exist in the same environment
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, state")
    .eq("environment_id", envId)
    .in("id", [taskId, dependsOnTaskId]);

  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
  if (!taskMap.has(taskId)) return apiNotFound("Task not found");
  if (!taskMap.has(dependsOnTaskId))
    return apiNotFound("Dependency task not found in this environment");

  // Circular dependency check (BFS)
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return apiConflict("Circular dependency detected");
    if (visited.has(current)) continue;
    visited.add(current);
    const { data: deps } = await supabase
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("task_id", current);
    if (deps) queue.push(...deps.map((d) => d.depends_on_task_id));
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("task_dependencies")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("depends_on_task_id", dependsOnTaskId)
    .single();
  if (existing) return apiConflict("Dependency already exists");

  // Insert dependency
  const { error: insertError } = await supabase
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });

  if (insertError) return apiBadRequest(insertError.message);

  // Auto-update task state: if task was "planned" and now has unfinished deps, set to "dependent"
  const currentTask = taskMap.get(taskId)!;
  const depTask = taskMap.get(dependsOnTaskId)!;
  if (currentTask.state === "planned" && depTask.state !== "finished") {
    await supabase
      .from("tasks")
      .update({ state: "dependent" })
      .eq("id", taskId);
  }

  return apiSuccess(
    { task_id: taskId, depends_on_task_id: dependsOnTaskId },
    201
  );
};
