import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiPaginatedResponse,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
} from "@/lib/api-response";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_SORT_FIELDS = ["created_at", "updated_at", "title"] as const;
const VALID_ORDERS = ["asc", "desc"] as const;
const VALID_STATES = ["planned", "in_progress", "dependent", "finished"];
const VALID_ASSIGNMENT_STATUSES = ["pending", "accepted", "refused"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string }> }
) {
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

  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state");
  const categoryId = searchParams.get("category_id");
  const tagId = searchParams.get("tag_id");
  const assignedTo = searchParams.get("assigned_to");
  const assignmentStatus = searchParams.get("assignment_status");
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") ?? "desc";
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");

  // Validate sort/order
  if (!VALID_SORT_FIELDS.includes(sort as (typeof VALID_SORT_FIELDS)[number])) {
    return apiBadRequest(`Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(", ")}`);
  }
  if (!VALID_ORDERS.includes(order as (typeof VALID_ORDERS)[number])) {
    return apiBadRequest("Invalid order. Must be 'asc' or 'desc'");
  }
  if (state && !VALID_STATES.includes(state)) {
    return apiBadRequest(`Invalid state. Must be one of: ${VALID_STATES.join(", ")}`);
  }
  if (assignmentStatus && !VALID_ASSIGNMENT_STATUSES.includes(assignmentStatus)) {
    return apiBadRequest(
      `Invalid assignment_status. Must be one of: ${VALID_ASSIGNMENT_STATUSES.join(", ")}`
    );
  }

  const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 100);
  const ascending = order === "asc";

  // If filtering by tag, first get matching task IDs
  let tagTaskIds: string[] | null = null;
  if (tagId) {
    if (!UUID_RE.test(tagId)) return apiBadRequest("Invalid tag_id format");
    const { data: tagTasks } = await supabase
      .from("task_tags")
      .select("task_id")
      .eq("tag_id", tagId);
    tagTaskIds = tagTasks?.map((tt) => tt.task_id) ?? [];
    if (tagTaskIds.length === 0) {
      return apiPaginatedResponse([], null, false);
    }
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("environment_id", envId)
    .order(sort, { ascending });

  if (state) query = query.eq("state", state);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);
  if (assignmentStatus) query = query.eq("assignment_status", assignmentStatus);
  if (tagTaskIds) query = query.in("id", tagTaskIds);

  // Cursor-based pagination
  if (cursor) {
    if (ascending) {
      query = query.gt(sort, cursor);
    } else {
      query = query.lt(sort, cursor);
    }
  }

  query = query.limit(limit + 1);

  const { data: tasks, error } = await query;
  if (error) return apiBadRequest(error.message);

  const hasMore = (tasks?.length ?? 0) > limit;
  const page = hasMore ? tasks!.slice(0, limit) : (tasks ?? []);
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1][sort as keyof (typeof page)[0]])
      : null;

  return apiPaginatedResponse(page, nextCursor, hasMore);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ envId: string }> }
) {
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

  let body: { title?: string; description?: string; category_id?: string; assigned_to?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const title = body.title?.trim();
  if (!title || title.length === 0) return apiBadRequest("Title is required");
  if (title.length > 200) return apiBadRequest("Title must be 200 characters or less");

  const description = body.description?.trim() ?? null;
  if (description && description.length > 2000) {
    return apiBadRequest("Description must be 2000 characters or less");
  }

  const categoryId = body.category_id ?? null;
  if (categoryId) {
    if (!UUID_RE.test(categoryId)) return apiBadRequest("Invalid category_id format");
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("environment_id", envId)
      .single();
    if (!cat) return apiBadRequest("Category not found in this environment");
  }

  const assignedTo = body.assigned_to ?? null;
  if (assignedTo) {
    if (!UUID_RE.test(assignedTo)) return apiBadRequest("Invalid assigned_to format");
    if (assignedTo === auth.userId) {
      return apiBadRequest("You cannot assign a task to yourself");
    }
    const { data: assigneeMembership } = await supabase
      .from("environment_members")
      .select("id")
      .eq("environment_id", envId)
      .eq("user_id", assignedTo)
      .not("joined_at", "is", null)
      .single();
    if (!assigneeMembership) {
      return apiBadRequest("Assignee must be a joined member of this environment");
    }
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: auth.userId,
      environment_id: envId,
      title,
      description,
      state: "planned",
      category_id: categoryId,
      assigned_to: assignedTo,
      assignment_status: assignedTo ? "pending" : null,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      refusal_reason: null,
    })
    .select()
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(task, 201);
}
