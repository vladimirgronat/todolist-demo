import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ envId: string; id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const { data: category, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (error || !category) return apiNotFound("Category not found");

  return apiSuccess(category);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const raw = body as Record<string, unknown> | null;
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  if (!name) return apiBadRequest("name is required");
  if (name.length > 100)
    return apiBadRequest("name must be 100 characters or fewer");

  const { data: category, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("environment_id", envId)
    .select("*")
    .single();

  if (error || !category) return apiNotFound("Category not found");

  return apiSuccess(category);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

  // Fetch the category to get its parent_id (for re-parenting children)
  const { data: cat } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (!cat) return apiNotFound("Category not found");

  // Set category_id = null on all tasks in this category
  await supabase
    .from("tasks")
    .update({ category_id: null })
    .eq("category_id", id);

  // Re-parent children to the deleted category's parent
  await supabase
    .from("categories")
    .update({ parent_id: cat.parent_id })
    .eq("parent_id", id)
    .eq("environment_id", envId);

  // Delete the category
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("environment_id", envId);

  if (error) return apiBadRequest(error.message);

  return apiSuccess({ deleted: true });
}
