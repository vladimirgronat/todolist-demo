import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

const VALID_STATES = ["planned", "in_progress", "finished"];

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

  let body: { state?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const newState = body.state;
  if (!newState || !VALID_STATES.includes(newState)) {
    return apiBadRequest(
      `Invalid state. Must be one of: ${VALID_STATES.join(", ")}. Cannot manually set 'dependent'.`
    );
  }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !task) return apiNotFound("Task not found");

  // Validate state transitions
  const currentState = task.state;

  const validTransitions: Record<string, string[]> = {
    planned: ["in_progress", "finished"],
    in_progress: ["planned", "finished"],
    dependent: [], // cannot manually transition from dependent
    finished: ["planned", "in_progress"],
  };

  const allowed = validTransitions[currentState] ?? [];
  if (!allowed.includes(newState)) {
    return apiBadRequest(
      `Invalid transition from '${currentState}' to '${newState}'`
    );
  }

  // If finishing, check all dependencies are done
  if (newState === "finished") {
    const { data: deps } = await supabase
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("task_id", id);

    if (deps && deps.length > 0) {
      const depIds = deps.map((d) => d.depends_on_task_id);
      const { data: depTasks } = await supabase
        .from("tasks")
        .select("id, state")
        .in("id", depIds);

      const unfinished = depTasks?.filter((t) => t.state !== "finished") ?? [];
      if (unfinished.length > 0) {
        return apiBadRequest(
          "Cannot finish: some dependencies are not yet finished"
        );
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ state: newState })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  // After finishing, check if dependent tasks can leave 'dependent' state
  if (newState === "finished") {
    const { data: dependents } = await supabase
      .from("task_dependencies")
      .select("task_id")
      .eq("depends_on_task_id", id);

    if (dependents && dependents.length > 0) {
      await Promise.all(
        dependents.map(async (dep) => {
          const { data: allDepsOfDependent } = await supabase
            .from("task_dependencies")
            .select("depends_on_task_id")
            .eq("task_id", dep.task_id);

          if (allDepsOfDependent) {
            const depIds = allDepsOfDependent.map((d) => d.depends_on_task_id);
            const { data: depTasks } = await supabase
              .from("tasks")
              .select("id, state")
              .in("id", depIds);

            const allDone =
              depTasks?.every((t) => t.state === "finished") ?? false;
            if (allDone) {
              const { data: depTask } = await supabase
                .from("tasks")
                .select("state")
                .eq("id", dep.task_id)
                .single();

              if (depTask && depTask.state === "dependent") {
                await supabase
                  .from("tasks")
                  .update({ state: "planned" })
                  .eq("id", dep.task_id);
              }
            }
          }
        })
      );
    }
  }

  return apiSuccess(updated);
}
