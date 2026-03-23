import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";
import type { Task, TaskFilter } from "@/types/task";

export const getTasks = async (
  environmentId: string,
  filter: TaskFilter = "all",
  categoryId?: string | null,
  tagId?: string | null
): Promise<Task[]> => {
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser();

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("environment_id", environmentId)
    .order("created_at", { ascending: false });

  if (["planned", "in_progress", "dependent", "finished"].includes(filter)) {
    query = query.eq("state", filter);
  }

  if (filter === "assigned_to_me") {
    if (!user) {
      return [];
    }
    query = query.eq("assigned_to", user.id);
  }

  if (filter === "i_assigned") {
    if (!user) {
      return [];
    }
    query = query.eq("user_id", user.id).not("assigned_to", "is", null);
  }

  if (filter === "refused") {
    if (!user) {
      return [];
    }
    query = query
      .eq("user_id", user.id)
      .eq("assignment_status", "refused")
      .order("updated_at", { ascending: false });
  }

  if (categoryId === "uncategorized") {
    query = query.is("category_id", null);
  } else if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (tagId) {
    const { data: taggedTaskIds } = await supabase
      .from("task_tags")
      .select("task_id")
      .eq("tag_id", tagId);

    if (taggedTaskIds && taggedTaskIds.length > 0) {
      query = query.in("id", taggedTaskIds.map(r => r.task_id));
    } else {
      return [];
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
