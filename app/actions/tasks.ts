"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const createTask = async (formData: FormData) => {
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

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
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

export const toggleTask = async (id: string, completed: boolean) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ completed: !completed })
    .eq("id", id);

  if (error) {
    return { error: error.message };
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
