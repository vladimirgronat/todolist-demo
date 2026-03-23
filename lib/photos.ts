import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { TaskPhoto } from "@/types/photo";

export const getTaskPhotos = async (taskId: string): Promise<TaskPhoto[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_photos")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getPhotoUrl = async (storagePath: string): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase.storage
    .from("task-photos")
    .getPublicUrl(storagePath);
  return data.publicUrl;
};

// Batch: get photo counts for multiple tasks
export const getTaskPhotoCounts = async (
  taskIds: string[]
): Promise<Record<string, number>> => {
  if (taskIds.length === 0) return {};
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_photos")
    .select("task_id")
    .in("task_id", taskIds);
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.task_id] = (counts[row.task_id] || 0) + 1;
  }
  return counts;
};
