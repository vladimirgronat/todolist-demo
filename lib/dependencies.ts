import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Task } from "@/types/task";

interface DependencyRow {
  tasks: Task | null;
}

export const getTaskDependencies = async (taskId: string): Promise<Task[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select(
      "depends_on_task_id, tasks!task_dependencies_depends_on_task_id_fkey(*)"
    )
    .eq("task_id", taskId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: unknown) => (row as DependencyRow).tasks)
    .filter((t): t is Task => t !== null);
};

export const getTaskDependents = async (taskId: string): Promise<Task[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("task_id, tasks!task_dependencies_task_id_fkey(*)")
    .eq("depends_on_task_id", taskId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: unknown) => (row as DependencyRow).tasks)
    .filter((t): t is Task => t !== null);
};

export const getTaskDependencyMap = async (
  taskIds: string[]
): Promise<Record<string, string[]>> => {
  if (taskIds.length === 0) return {};

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("task_id, depends_on_task_id")
    .in("task_id", taskIds);

  if (error) throw new Error(error.message);

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!map[row.task_id]) map[row.task_id] = [];
    map[row.task_id].push(row.depends_on_task_id);
  }
  return map;
};
