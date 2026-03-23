"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const deletePhoto = async (photoId: string) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get photo record
  const { data: photo } = await supabase
    .from("task_photos")
    .select("*")
    .eq("id", photoId)
    .single();
  if (!photo) return { error: "Photo not found" };

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("task-photos")
    .remove([photo.storage_path]);
  if (storageError) return { error: storageError.message };

  // Delete record
  const { error } = await supabase
    .from("task_photos")
    .delete()
    .eq("id", photoId);
  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
};
