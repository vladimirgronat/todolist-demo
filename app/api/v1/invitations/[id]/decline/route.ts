import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { id: invitationId } = await params;
  const supabase = createApiSupabaseClient();

  // Find pending invitation belonging to the authenticated user
  const { data: invitation } = await supabase
    .from("environment_members")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", auth.userId)
    .is("joined_at", null)
    .maybeSingle();

  if (!invitation) return apiNotFound("Invitation not found");

  // Decline: delete the membership row
  const { error } = await supabase
    .from("environment_members")
    .delete()
    .eq("id", invitationId);

  if (error) return apiBadRequest(error.message);

  return apiSuccess({ declined: true });
};
