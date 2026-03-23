"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const fetchParentId = async (supabase: SupabaseClient, categoryId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", categoryId)
    .single();
  return data?.parent_id ?? null;
};

export const createCategory = async (formData: FormData) => {
  const name = formData.get("name")?.toString().trim();
  const environmentId = formData.get("environment_id") as string;
  const parentId = (formData.get("parent_id") as string) || null;

  if (!name || name.length === 0) return { error: "Name is required" };
  if (name.length > 100) return { error: "Name must be 100 characters or less" };
  if (!environmentId) return { error: "Environment is required" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // If parent_id is provided, verify it belongs to the same environment
  if (parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("environment_id")
      .eq("id", parentId)
      .single();
    if (!parent || parent.environment_id !== environmentId) {
      return { error: "Parent category not found in this environment" };
    }
  }

  const { error } = await supabase.from("categories").insert({
    environment_id: environmentId,
    parent_id: parentId,
    name,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const renameCategory = async (id: string, formData: FormData) => {
  const name = formData.get("name")?.toString().trim();
  if (!name || name.length === 0) return { error: "Name is required" };
  if (name.length > 100) return { error: "Name must be 100 characters or less" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const moveCategory = async (id: string, formData: FormData) => {
  const newParentId = (formData.get("parent_id") as string) || null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Prevent moving a category under itself or its descendants
  if (newParentId) {
    const visited = new Set<string>();
    let checkId: string | null = newParentId;
    while (checkId) {
      if (checkId === id)
        return { error: "Cannot move a category under itself or its descendants" };
      if (visited.has(checkId)) break;
      visited.add(checkId);
      const parent = await fetchParentId(supabase, checkId);
      checkId = parent;
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({ parent_id: newParentId })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};

export const deleteCategory = async (id: string) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Tasks with this category will be set to null via ON DELETE SET NULL
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
};
