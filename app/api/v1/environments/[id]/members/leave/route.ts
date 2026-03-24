import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
} from "@/lib/api-response";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { id: environmentId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify user is not the owner (owners can't leave)
  const { data: env } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (!env) return apiBadRequest("Environment not found");
  if (env.owner_id === auth.userId) {
    return apiForbidden("Owner cannot leave the environment. Delete it instead.");
  }

  // Delete membership
  const { data, error } = await supabase
    .from("environment_members")
    .delete()
    .eq("environment_id", environmentId)
    .eq("user_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error) return apiBadRequest(error.message);
  if (!data) return apiForbidden("You are not a member of this environment");

  return apiSuccess({ left: true });
};
