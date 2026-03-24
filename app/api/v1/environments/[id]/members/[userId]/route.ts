import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { id: environmentId, userId: targetUserId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify authenticated user is the owner
  const { data: env } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (!env) return apiNotFound("Environment not found");
  if (env.owner_id !== auth.userId) return apiForbidden("Only the owner can remove members");

  // Can't remove self (owner)
  if (targetUserId === auth.userId) {
    return apiBadRequest("Owner cannot be removed from the environment");
  }

  // Delete the membership
  const { data, error } = await supabase
    .from("environment_members")
    .delete()
    .eq("environment_id", environmentId)
    .eq("user_id", targetUserId)
    .select("id")
    .maybeSingle();

  if (error) return apiBadRequest(error.message);
  if (!data) return apiNotFound("Member not found");

  return apiSuccess({ removed: true });
};
