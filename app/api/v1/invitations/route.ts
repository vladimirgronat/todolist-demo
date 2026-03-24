import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import { apiSuccess, apiUnauthorized, apiBadRequest } from "@/lib/api-response";

export const GET = async (request: NextRequest) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const supabase = createApiSupabaseClient();

  // Get pending invitations (joined_at IS NULL)
  const { data: invitations, error: invError } = await supabase
    .from("environment_members")
    .select("id, environment_id, role, invited_at")
    .eq("user_id", auth.userId)
    .is("joined_at", null)
    .order("invited_at", { ascending: true });

  if (invError) return apiBadRequest(invError.message);
  if (!invitations || invitations.length === 0) return apiSuccess([]);

  // Fetch environment names for each invitation
  const envIds = invitations.map((inv) => inv.environment_id);
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id, name")
    .in("id", envIds);

  if (envError) return apiBadRequest(envError.message);

  const envNameMap = new Map(
    (environments ?? []).map((e) => [e.id, e.name])
  );

  const result = invitations.map((inv) => ({
    id: inv.id,
    environment_id: inv.environment_id,
    environment_name: envNameMap.get(inv.environment_id) ?? "Unknown",
    role: inv.role,
    invited_at: inv.invited_at,
  }));

  return apiSuccess(result);
};
