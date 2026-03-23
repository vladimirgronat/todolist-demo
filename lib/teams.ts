import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { EnvironmentMember } from "@/types/environment";

export const getEnvironmentMembers = async (
  environmentId: string
): Promise<EnvironmentMember[]> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("environment_members")
    .select("*")
    .eq("environment_id", environmentId)
    .order("invited_at", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
};

interface PendingInvitation {
  invitation: EnvironmentMember;
  environmentName: string;
}

export const getPendingInvitations = async (): Promise<PendingInvitation[]> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: invitations, error: invError } = await supabase
    .from("environment_members")
    .select("*")
    .eq("user_id", user.id)
    .is("joined_at", null)
    .order("invited_at", { ascending: true });

  if (invError || !invitations || invitations.length === 0) {
    return [];
  }

  const envIds = invitations.map((inv) => inv.environment_id);

  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id, name")
    .in("id", envIds);

  if (envError || !environments) {
    return [];
  }

  const envNameMap = new Map(environments.map((e) => [e.id, e.name]));

  return invitations.map((invitation) => ({
    invitation,
    environmentName: envNameMap.get(invitation.environment_id) ?? "Unknown",
  }));
};

interface EnvironmentOwnerInfo {
  ownerId: string;
  isCurrentUserOwner: boolean;
}

export const getEnvironmentOwner = async (
  environmentId: string
): Promise<EnvironmentOwnerInfo | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: env, error } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (error || !env) {
    return null;
  }

  return {
    ownerId: env.owner_id,
    isCurrentUserOwner: env.owner_id === user.id,
  };
};
