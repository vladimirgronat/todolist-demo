import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Environment } from "@/types/environment";

export const getEnvironments = async (): Promise<Environment[]> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: members, error: memberError } = await supabase
    .from("environment_members")
    .select("environment_id")
    .eq("user_id", user.id)
    .not("joined_at", "is", null);

  if (memberError || !members || members.length === 0) {
    return [];
  }

  const envIds = members.map((m) => m.environment_id);

  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .in("id", envIds)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
};

export const getActiveEnvironmentId = async (
  cookieValue?: string
): Promise<string | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // If a cookie value is provided, verify user is a member of that environment
  if (cookieValue) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(cookieValue)) {
      const { data: membership } = await supabase
        .from("environment_members")
        .select("environment_id")
        .eq("environment_id", cookieValue)
        .eq("user_id", user.id)
        .not("joined_at", "is", null)
        .single();

      if (membership) {
        return membership.environment_id;
      }
    }
  }

  // Fallback: return the user's first environment
  const { data: fallbackMembers } = await supabase
    .from("environment_members")
    .select("environment_id")
    .eq("user_id", user.id)
    .not("joined_at", "is", null);

  if (!fallbackMembers || fallbackMembers.length === 0) {
    return null;
  }

  const fallbackEnvIds = fallbackMembers.map((m) => m.environment_id);

  const { data: firstEnv } = await supabase
    .from("environments")
    .select("id")
    .in("id", fallbackEnvIds)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return firstEnv?.id ?? null;
};
