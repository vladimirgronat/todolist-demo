import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ envId: string; id: string }> };

/** Fetch parent_id of a category */
const fetchParentId = async (
  supabase: SupabaseClient<Database>,
  envId: string,
  categoryId: string
): Promise<string | null> => {
  const { data } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", categoryId)
    .eq("environment_id", envId)
    .single();
  return data?.parent_id ?? null;
};

/** Check if `ancestorId` appears in the parent chain of `startId` */
const hasAncestor = async (
  supabase: SupabaseClient<Database>,
  envId: string,
  startId: string,
  ancestorId: string
): Promise<boolean> => {
  let currentId: string | null = startId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === ancestorId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    currentId = await fetchParentId(supabase, envId, currentId);
  }

  return false;
};

/** Get depth from a category to its root (number of ancestors) */
const getAncestorDepth = async (
  supabase: SupabaseClient<Database>,
  envId: string,
  categoryId: string | null
): Promise<number> => {
  let depth = 0;
  let currentId = categoryId;
  const visited = new Set<string>();

  while (currentId) {
    depth++;
    if (visited.has(currentId)) return depth;
    visited.add(currentId);
    currentId = await fetchParentId(supabase, envId, currentId);
  }

  return depth;
};

/** Get the max subtree depth below a category (including itself = 1) */
const getSubtreeDepth = async (
  supabase: SupabaseClient<Database>,
  envId: string,
  categoryId: string
): Promise<number> => {
  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId)
    .eq("environment_id", envId);

  if (!children || children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const child of children) {
    const d = await getSubtreeDepth(supabase, envId, child.id);
    if (d > maxChildDepth) maxChildDepth = d;
  }

  return 1 + maxChildDepth;
};

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
  const parentId = raw?.parent_id === null ? null : raw?.parent_id;

  if (parentId === undefined) {
    return apiBadRequest("parent_id is required (string or null)");
  }

  const newParentId = parentId === null ? null : String(parentId);

  // Verify the category exists
  const { data: cat } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("id", id)
    .eq("environment_id", envId)
    .single();

  if (!cat) return apiNotFound("Category not found");

  // Cannot move to self
  if (newParentId === id) {
    return apiBadRequest("Cannot set a category as its own parent");
  }

  if (newParentId) {
    // Verify new parent exists in this environment
    const { data: newParent } = await supabase
      .from("categories")
      .select("id")
      .eq("id", newParentId)
      .eq("environment_id", envId)
      .single();

    if (!newParent)
      return apiBadRequest("parent_id does not exist in this environment");

    // Circular check: ensure `id` is not an ancestor of `newParentId`
    const circular = await hasAncestor(supabase, envId, newParentId, id);
    if (circular) {
      return apiBadRequest("Cannot move: would create a circular parent chain");
    }

    // Depth limit: new parent's ancestor depth + current subtree depth <= 50
    const parentAncestorDepth = await getAncestorDepth(supabase, envId, newParentId);
    const subtreeDepth = await getSubtreeDepth(supabase, envId, id);
    if (parentAncestorDepth + subtreeDepth > 50) {
      return apiBadRequest("Category depth limit of 50 exceeded");
    }
  }

  const { data: updated, error } = await supabase
    .from("categories")
    .update({ parent_id: newParentId })
    .eq("id", id)
    .eq("environment_id", envId)
    .select("*")
    .single();

  if (error || !updated) return apiBadRequest(error?.message ?? "Update failed");

  return apiSuccess(updated);
}
