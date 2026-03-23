import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Tag } from "@/types/tag";

export const getTags = async (environmentId: string): Promise<Tag[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("environment_id", environmentId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getTaskTags = async (taskId: string): Promise<Tag[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("task_tags")
    .select("tag_id, tags(*)")
    .eq("task_id", taskId);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => row.tags).filter(Boolean);
};
