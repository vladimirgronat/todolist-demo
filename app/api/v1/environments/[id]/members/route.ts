import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
  apiConflict,
} from "@/lib/api-response";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { id: environmentId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify user is a joined member of this environment
  const { data: membership } = await supabase
    .from("environment_members")
    .select("id")
    .eq("environment_id", environmentId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .maybeSingle();

  if (!membership) return apiForbidden("You are not a member of this environment");

  const { data: members, error } = await supabase
    .from("environment_members")
    .select("id, user_id, role, invited_at, joined_at")
    .eq("environment_id", environmentId)
    .order("invited_at", { ascending: true });

  if (error) return apiBadRequest(error.message);

  return apiSuccess(members ?? []);
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { id: environmentId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify user is the owner of this environment
  const { data: env } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (!env) return apiNotFound("Environment not found");
  if (env.owner_id !== auth.userId) return apiForbidden("Only the owner can invite members");

  // Parse and validate body
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return apiBadRequest("Invalid JSON body");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) return apiBadRequest("email is required");

  // Look up target user by email
  const { data: targetUserId } = await supabase.rpc("get_user_id_by_email", {
    email_input: email,
  });

  if (!targetUserId) return apiNotFound("User not found");

  // Check if target user is already a member or invited
  const { data: existing } = await supabase
    .from("environment_members")
    .select("id")
    .eq("environment_id", environmentId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) return apiConflict("User is already a member or has a pending invitation");

  // Insert invitation (joined_at = null means pending)
  const { data, error } = await supabase
    .from("environment_members")
    .insert({
      environment_id: environmentId,
      user_id: targetUserId,
      role: "member",
    })
    .select("id, user_id, role, invited_at, joined_at")
    .single();

  if (error) return apiBadRequest(error.message);

  return apiSuccess(data, 201);
};
