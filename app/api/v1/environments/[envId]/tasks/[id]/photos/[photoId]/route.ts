import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ envId: string; id: string; photoId: string }>;
};

export const DELETE = async (
  request: NextRequest,
  { params }: RouteContext
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id: taskId, photoId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify environment membership
  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  // Verify task belongs to environment
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("environment_id", envId)
    .single();

  if (!task) return apiNotFound("Task not found");

  // Fetch photo and verify it belongs to this task
  const { data: photo } = await supabase
    .from("task_photos")
    .select("id, storage_path, task_id")
    .eq("id", photoId)
    .single();

  if (!photo || photo.task_id !== taskId) return apiNotFound("Photo not found");

  // Delete from storage
  await supabase.storage.from("task-photos").remove([photo.storage_path]);

  // Delete from database
  await supabase.from("task_photos").delete().eq("id", photoId);

  return apiSuccess({ deleted: true });
};
