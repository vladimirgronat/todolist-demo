"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const createEnvironment = async (formData: FormData) => {
  const name = formData.get("name")?.toString().trim();

  if (!name || name.length === 0) {
    return { error: "Name is required", environmentId: null };
  }

  if (name.length > 100) {
    return { error: "Name must be 100 characters or less", environmentId: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", environmentId: null };
  }

  const { data: env, error: envError } = await supabase
    .from("environments")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (envError || !env) {
    return { error: envError?.message ?? "Failed to create environment", environmentId: null };
  }

  const { error: memberError } = await supabase
    .from("environment_members")
    .insert({
      environment_id: env.id,
      user_id: user.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    return { error: memberError.message, environmentId: null };
  }

  revalidatePath("/");
  return { error: null, environmentId: env.id };
};

export const renameEnvironment = async (formData: FormData) => {
  const id = formData.get("id")?.toString().trim();
  const name = formData.get("name")?.toString().trim();

  if (!id) {
    return { error: "Environment ID is required" };
  }

  if (!name || name.length === 0) {
    return { error: "Name is required" };
  }

  if (name.length > 100) {
    return { error: "Name must be 100 characters or less" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("environments")
    .update({ name })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};

export const deleteEnvironment = async (formData: FormData) => {
  const id = formData.get("id")?.toString().trim();

  if (!id) {
    return { error: "Environment ID is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Ensure user has at least 2 environments before deleting
  const { count, error: countError } = await supabase
    .from("environment_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("joined_at", "is", null);

  if (countError) {
    return { error: "Failed to verify environments" };
  }

  if ((count ?? 0) < 2) {
    return { error: "Cannot delete your last environment" };
  }

  const { error } = await supabase
    .from("environments")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
};
