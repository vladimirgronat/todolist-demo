"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const createTask = async (formData: FormData) => {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const environmentId = formData.get("environment_id") as string;
  const categoryId = (formData.get("category_id") as string) || null;

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or less" };
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

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    environment_id: environmentId,
    title: title.trim(),
    description: description?.trim() || null,
    category_id: categoryId || null,
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

  if (!title || title.trim().length === 0) {
    return { error: "Title is required" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or less" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
    })
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

    if (dependents) {
      for (const dep of dependents) {
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
      }
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
