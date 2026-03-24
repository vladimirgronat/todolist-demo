import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
} from "@/lib/api-response";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ envId: string }> };

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

interface CategoryNode {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  environment_id: string;
  children: CategoryNode[];
}

const buildTree = (categories: CategoryRow[]): CategoryNode[] => {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

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

const getDepth = async (
  supabase: SupabaseClient<Database>,
  envId: string,
  parentId: string | null
): Promise<number> => {
  let depth = 0;
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId) {
    depth++;
    if (visited.has(currentId)) return depth;
    visited.add(currentId);
    currentId = await fetchParentId(supabase, envId, currentId);
  }

  return depth;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId } = await params;

  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  const format = request.nextUrl.searchParams.get("format") ?? "flat";
  if (format !== "flat" && format !== "tree") {
    return apiBadRequest("format must be 'flat' or 'tree'");
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("environment_id", envId)
    .order("sort_order", { ascending: true });

  if (error) return apiBadRequest(error.message);

  if (format === "tree") {
    return apiSuccess(buildTree(categories ?? []));
  }

  return apiSuccess(categories ?? []);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();
  const { envId } = await params;

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

  const parentId =
    raw?.parent_id === undefined || raw.parent_id === null
      ? null
      : String(raw.parent_id);

  // Validate parent exists in this environment
  if (parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parentId)
      .eq("environment_id", envId)
      .single();

    if (!parent) return apiBadRequest("parent_id does not exist in this environment");

    // Check depth limit (parent depth + 1 for new node <= 50)
    const parentDepth = await getDepth(supabase, envId, parentId);
    if (parentDepth + 1 > 50) {
      return apiBadRequest("Category depth limit of 50 exceeded");
    }
  }

  // Get max sort_order for siblings
  let sortQuery = supabase
    .from("categories")
    .select("sort_order")
    .eq("environment_id", envId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentId) {
    sortQuery = sortQuery.eq("parent_id", parentId);
  } else {
    sortQuery = sortQuery.is("parent_id", null);
  }

  const { data: maxSortRows } = await sortQuery;
  const sortOrder = maxSortRows && maxSortRows.length > 0
    ? maxSortRows[0].sort_order + 1
    : 0;

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      environment_id: envId,
      name,
      parent_id: parentId,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(category, 201);
}
