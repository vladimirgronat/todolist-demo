"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const addDependency = async (formData: FormData) => {
  const taskId = formData.get("task_id")?.toString().trim();
  const dependsOnTaskId = formData.get("depends_on_task_id")?.toString().trim();

  if (!taskId || !dependsOnTaskId) return { error: "Both task IDs are required" };
  if (taskId === dependsOnTaskId) return { error: "A task cannot depend on itself" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify both tasks are in the same environment
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, environment_id, state")
    .in("id", [taskId, dependsOnTaskId]);

  if (!tasks || tasks.length !== 2)
    return { error: "One or both tasks not found" };
  if (tasks[0].environment_id !== tasks[1].environment_id)
    return { error: "Tasks must be in the same environment" };

  // Insert dependency (DB trigger prevents circular deps)
  const { error } = await supabase
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });

  if (error) {
    if (error.message.includes("Circular dependency"))
      return { error: "This would create a circular dependency" };
    return { error: error.message };
  }

  // Auto-manage state: if the dependency is not finished, set task to 'dependent'
  const depTask = tasks.find((t) => t.id === dependsOnTaskId);
  if (depTask && depTask.state !== "finished") {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (currentTask && currentTask.state !== "dependent") {
      await supabase
        .from("tasks")
        .update({ state: "dependent" })
        .eq("id", taskId);
    }
  }

  revalidatePath("/");
  return { error: null };
};

export const removeDependency = async (formData: FormData) => {
  const taskId = formData.get("task_id")?.toString().trim();
  const dependsOnTaskId = formData.get("depends_on_task_id")?.toString().trim();

  if (!taskId || !dependsOnTaskId) return { error: "Both task IDs are required" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("task_id", taskId)
    .eq("depends_on_task_id", dependsOnTaskId);

  if (error) return { error: error.message };

  // Check if task should leave 'dependent' state
  const { data: remainingDeps } = await supabase
    .from("task_dependencies")
    .select("depends_on_task_id")
    .eq("task_id", taskId);

  if (!remainingDeps || remainingDeps.length === 0) {
    // No more dependencies, remove dependent state
    const { data: task } = await supabase
      .from("tasks")
      .select("state")
      .eq("id", taskId)
      .single();

    if (task && task.state === "dependent") {
      await supabase
        .from("tasks")
        .update({ state: "planned" })
        .eq("id", taskId);
    }
  } else {
    // Check if all remaining deps are finished
    const depTaskIds = remainingDeps.map((d) => d.depends_on_task_id);
    const { data: depTasks } = await supabase
      .from("tasks")
      .select("id, state")
      .in("id", depTaskIds);

    const allFinished = depTasks?.every((t) => t.state === "finished") ?? false;
    if (allFinished) {
      const { data: task } = await supabase
        .from("tasks")
        .select("state")
        .eq("id", taskId)
        .single();

      if (task && task.state === "dependent") {
        await supabase
          .from("tasks")
          .update({ state: "planned" })
          .eq("id", taskId);
      }
    }
  }

  revalidatePath("/");
  return { error: null };
};
