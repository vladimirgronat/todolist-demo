import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Task, TaskFilter } from "@/types/task";

export const getTasks = async (filter: TaskFilter = "all"): Promise<Task[]> => {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter === "active") {
    query = query.eq("completed", false);
  } else if (filter === "completed") {
    query = query.eq("completed", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
