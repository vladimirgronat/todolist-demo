"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const createTag = async (formData: FormData) => {
  const name = formData.get("name")?.toString().trim();
  const environmentId = formData.get("environment_id")?.toString();
  const color = formData.get("color")?.toString().trim() || null;

  if (!name || name.length === 0) return { error: "Name is required" };
  if (name.length > 50) return { error: "Name must be 50 characters or less" };
  if (!environmentId) return { error: "Environment is required" };
  if (color && !HEX_COLOR_RE.test(color)) return { error: "Color must be a valid hex color (e.g. #ff0000)" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("tags").insert({
    environment_id: environmentId,
    name,
    color,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const renameTag = async (id: string, formData: FormData) => {
  const name = formData.get("name")?.toString().trim();

  if (!name || name.length === 0) return { error: "Name is required" };
  if (name.length > 50) return { error: "Name must be 50 characters or less" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tags")
    .update({ name })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const updateTagColor = async (id: string, formData: FormData) => {
  const color = formData.get("color")?.toString().trim() || null;

  if (color && !HEX_COLOR_RE.test(color)) return { error: "Color must be a valid hex color (e.g. #ff0000)" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tags")
    .update({ color })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const reorderTags = async (formData: FormData) => {
  const orderJson = formData.get("order")?.toString();

  if (!orderJson) return { error: "Order data is required" };

  let order: { id: string; sort_order: number }[];
  try {
    order = JSON.parse(orderJson);
  } catch {
    return { error: "Invalid order data" };
  }

  if (!Array.isArray(order) || order.length === 0) return { error: "Order must be a non-empty array" };

  for (const item of order) {
    if (typeof item.id !== "string" || typeof item.sort_order !== "number") {
      return { error: "Each order item must have id (string) and sort_order (number)" };
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const results = await Promise.all(
    order.map((item) =>
      supabase.from("tags").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed) return { error: failed.error!.message };

  revalidatePath("/");
  return { error: null };
};

export const deleteTag = async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const addTagToTask = async (taskId: string, tagId: string) => {
  if (!taskId) return { error: "Task ID is required" };
  if (!tagId) return { error: "Tag ID is required" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify task and tag belong to the same environment
  const [taskResult, tagResult] = await Promise.all([
    supabase.from("tasks").select("environment_id").eq("id", taskId).single(),
    supabase.from("tags").select("environment_id").eq("id", tagId).single(),
  ]);

  if (!taskResult.data) return { error: "Task not found" };
  if (!tagResult.data) return { error: "Tag not found" };
  if (taskResult.data.environment_id !== tagResult.data.environment_id) {
    return { error: "Task and tag must belong to the same environment" };
  }

  const { error } = await supabase.from("task_tags").insert({
    task_id: taskId,
    tag_id: tagId,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const removeTagFromTask = async (taskId: string, tagId: string) => {
  if (!taskId) return { error: "Task ID is required" };
  if (!tagId) return { error: "Tag ID is required" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};
