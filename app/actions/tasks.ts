"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const validateAssignee = async (
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  environmentId: string,
  creatorId: string,
  assigneeId: string
) => {
  if (assigneeId === creatorId) {
    return "You cannot assign a task to yourself";
  }

  const { data: membership, error: membershipError } = await supabase
    .from("environment_members")
    .select("id")
    .eq("environment_id", environmentId)
    .eq("user_id", assigneeId)
    .not("joined_at", "is", null)
    .single();

  if (membershipError || !membership) {
    return "Assignee must be a joined member of this environment";
  }

  return null;
};

export const createTask = async (formData: FormData) => {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const environmentId = formData.get("environment_id") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const assignedToRaw = (formData.get("assigned_to") as string) || null;

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or less" };
  }

  if (description && description.length > 2000) {
    return { error: "Description must be 2000 characters or less" };
  }

  if (!environmentId) {
    return { error: "Environment is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const assignedTo = assignedToRaw?.trim() || null;
  if (assignedTo) {
    const assignmentValidationError = await validateAssignee(
      supabase,
      environmentId,
      user.id,
      assignedTo
    );
    if (assignmentValidationError) {
      return { error: assignmentValidationError };
    }
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    environment_id: environmentId,
    title: title.trim(),
    description: description?.trim() || null,
    category_id: categoryId || null,
    assigned_to: assignedTo,
    assignment_status: assignedTo ? "pending" : null,
    refusal_reason: null,
    assigned_at: assignedTo ? new Date().toISOString() : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const updateTask = async (id: string, formData: FormData) => {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const hasAssigneeField = formData.has("assigned_to");
  const assignedToRaw = (formData.get("assigned_to") as string) || null;

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or less" };
  }

  if (description && description.length > 2000) {
    return { error: "Description must be 2000 characters or less" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existingTask, error: taskError } = await supabase
    .from("tasks")
    .select("user_id, environment_id")
    .eq("id", id)
    .single();

  if (taskError || !existingTask) {
    return { error: "Task not found" };
  }

  const updatePayload: {
    title: string;
    description: string | null;
    category_id: string | null;
    assigned_to?: string | null;
    assignment_status?: "pending" | null;
    refusal_reason?: string | null;
    assigned_at?: string | null;
  } = {
    title: title.trim(),
    description: description?.trim() || null,
    category_id: categoryId || null,
  };

  if (hasAssigneeField) {
    if (existingTask.user_id !== user.id) {
      return { error: "Only the task creator can change assignee" };
    }

    const assignedTo = assignedToRaw?.trim() || null;
    if (assignedTo) {
      const assignmentValidationError = await validateAssignee(
        supabase,
        existingTask.environment_id,
        existingTask.user_id,
        assignedTo
      );
      if (assignmentValidationError) {
        return { error: assignmentValidationError };
      }

      updatePayload.assigned_to = assignedTo;
      updatePayload.assignment_status = "pending";
      updatePayload.refusal_reason = null;
      updatePayload.assigned_at = new Date().toISOString();
    } else {
      updatePayload.assigned_to = null;
      updatePayload.assignment_status = null;
      updatePayload.refusal_reason = null;
      updatePayload.assigned_at = null;
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const changeTaskState = async (id: string, newState: string) => {
  const validStates = ["planned", "in_progress", "finished"];
  if (!validStates.includes(newState)) {
    return { error: "Invalid state. Cannot manually set dependent state." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

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
        return { error: "Cannot finish: some dependencies are not yet finished" };
      }
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({ state: newState })
    .eq("id", id);

  if (error) return { error: error.message };

  // After finishing, check if any tasks that depend on this one can leave 'dependent'
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

  revalidatePath("/");
  return { error: null };
};

export const deleteTask = async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const acceptTaskAssignment = async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("assigned_to, assignment_status")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return { error: "Task not found" };
  }

  if (task.assigned_to !== user.id) {
    return { error: "Only the assigned user can accept this task" };
  }

  if (task.assignment_status !== "pending") {
    return { error: "Only pending assignments can be accepted" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "accepted",
      refusal_reason: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const refuseTaskAssignment = async (id: string, reason: string) => {
  const trimmedReason = reason.trim();

  if (trimmedReason.length === 0) {
    return { error: "Please provide a reason for refusal" };
  }

  if (trimmedReason.length > 500) {
    return { error: "Refusal reason must be 500 characters or less" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("assigned_to, assignment_status")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return { error: "Task not found" };
  }

  if (task.assigned_to !== user.id) {
    return { error: "Only the assigned user can refuse this task" };
  }

  if (task.assignment_status !== "pending") {
    return { error: "Only pending assignments can be refused" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "refused",
      refusal_reason: trimmedReason,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const clearTaskAssignment = async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("user_id")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return { error: "Task not found" };
  }

  if (task.user_id !== user.id) {
    return { error: "Only the task creator can clear assignment" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      assigned_to: null,
      assignment_status: null,
      refusal_reason: null,
      assigned_at: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};
