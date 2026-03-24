import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (error || !task) return apiNotFound("Task not found");

  // Fetch tags
  const { data: taskTags } = await supabase
    .from("task_tags")
    .select("tag_id")
    .eq("task_id", id);

  let tags: { id: string; name: string; color: string | null }[] = [];
  if (taskTags && taskTags.length > 0) {
    const tagIds = taskTags.map((tt) => tt.tag_id);
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, name, color")
      .in("id", tagIds);
    tags = tagRows ?? [];
  }

  // Fetch dependencies
  const { data: deps } = await supabase
    .from("task_dependencies")
    .select("depends_on_task_id")
    .eq("task_id", id);

  const dependencies = deps?.map((d) => d.depends_on_task_id) ?? [];

  return apiSuccess({ ...task, tags, dependencies });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  let body: { title?: string; description?: string; category_id?: string | null; state?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  if (body.state !== undefined) {
    return apiBadRequest("Cannot change state via PATCH. Use the /state endpoint.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !existing) return apiNotFound("Task not found");

  const updatePayload: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title || title.length === 0) return apiBadRequest("Title is required");
    if (title.length > 200) return apiBadRequest("Title must be 200 characters or less");
    updatePayload.title = title;
  }

  if (body.description !== undefined) {
    const desc = body.description?.trim() ?? null;
    if (desc && desc.length > 2000) {
      return apiBadRequest("Description must be 2000 characters or less");
    }
    updatePayload.description = desc;
  }

  if (body.category_id !== undefined) {
    const categoryId = body.category_id;
    if (categoryId !== null) {
      if (!UUID_RE.test(categoryId)) return apiBadRequest("Invalid category_id format");
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("environment_id", envId)
        .single();
      if (!cat) return apiBadRequest("Category not found in this environment");
    }
    updatePayload.category_id = categoryId;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiBadRequest("No valid fields to update");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string; id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId, id } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (fetchError || !task) return apiNotFound("Task not found");

  // Only the task creator or environment owner can delete
  if (task.user_id !== auth.userId) {
    const { data: env } = await supabase
      .from("environments")
      .select("owner_id")
      .eq("id", envId)
      .single();
    if (!env || env.owner_id !== auth.userId) {
      return apiForbidden("Only the task creator or environment owner can delete this task");
    }
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) return apiBadRequest(error.message);

  return apiSuccess({ deleted: true });
}
