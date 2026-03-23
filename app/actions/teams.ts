"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inviteMember = async (formData: FormData) => {
  const environmentId = formData.get("environment_id")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();

  if (!environmentId) {
    return { error: "Environment ID is required" };
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "A valid email address is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify caller is the environment owner
  const { data: env, error: envError } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (envError || !env) {
    return { error: "Environment not found" };
  }

  if (env.owner_id !== user.id) {
    return { error: "Only the environment owner can invite members" };
  }

  // Look up user by email
  const { data: targetUserId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { email_input: email }
  );

  if (lookupError || !targetUserId) {
    return { error: "No user found with that email" };
  }

  // Check if already a member or pending
  const { data: existing } = await supabase
    .from("environment_members")
    .select("id")
    .eq("environment_id", environmentId)
    .eq("user_id", targetUserId)
    .single();

  if (existing) {
    return { error: "User is already a member or has a pending invitation" };
  }

  // Insert pending invitation (joined_at is null)
  const { error: insertError } = await supabase
    .from("environment_members")
    .insert({
      environment_id: environmentId,
      user_id: targetUserId,
      role: "member",
    });

  if (insertError) {
    return { error: "Failed to send invitation. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
};

export const removeMember = async (formData: FormData) => {
  const environmentId = formData.get("environment_id")?.toString().trim();
  const memberId = formData.get("member_id")?.toString().trim();

  if (!environmentId) {
    return { error: "Environment ID is required" };
  }

  if (!memberId) {
    return { error: "Member ID is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify caller is the environment owner
  const { data: env, error: envError } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (envError || !env) {
    return { error: "Environment not found" };
  }

  if (env.owner_id !== user.id) {
    return { error: "Only the environment owner can remove members" };
  }

  // Verify the target member is not the owner
  const { data: member, error: memberError } = await supabase
    .from("environment_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("environment_id", environmentId)
    .single();

  if (memberError || !member) {
    return { error: "Member not found" };
  }

  if (member.user_id === env.owner_id) {
    return { error: "Cannot remove the environment owner" };
  }

  const { error: deleteError } = await supabase
    .from("environment_members")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    return { error: "Failed to remove member. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
};

export const acceptInvitation = async (formData: FormData) => {
  const invitationId = formData.get("invitation_id")?.toString().trim();

  if (!invitationId) {
    return { error: "Invitation ID is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify the invitation belongs to the current user and is pending
  const { data: invitation, error: invError } = await supabase
    .from("environment_members")
    .select("id, user_id, joined_at")
    .eq("id", invitationId)
    .single();

  if (invError || !invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.user_id !== user.id) {
    return { error: "This invitation does not belong to you" };
  }

  if (invitation.joined_at !== null) {
    return { error: "Invitation has already been accepted" };
  }

  const { error: updateError } = await supabase
    .from("environment_members")
    .update({ joined_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (updateError) {
    return { error: "Failed to accept invitation. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
};

export const declineInvitation = async (formData: FormData) => {
  const invitationId = formData.get("invitation_id")?.toString().trim();

  if (!invitationId) {
    return { error: "Invitation ID is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify the invitation belongs to the current user and is pending
  const { data: invitation, error: invError } = await supabase
    .from("environment_members")
    .select("id, user_id, joined_at")
    .eq("id", invitationId)
    .single();

  if (invError || !invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.user_id !== user.id) {
    return { error: "This invitation does not belong to you" };
  }

  if (invitation.joined_at !== null) {
    return { error: "Cannot decline an already-accepted invitation" };
  }

  const { error: deleteError } = await supabase
    .from("environment_members")
    .delete()
    .eq("id", invitationId);

  if (deleteError) {
    return { error: "Failed to decline invitation. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
};

export const leaveEnvironment = async (formData: FormData) => {
  const environmentId = formData.get("environment_id")?.toString().trim();

  if (!environmentId) {
    return { error: "Environment ID is required" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify the user is NOT the owner
  const { data: env, error: envError } = await supabase
    .from("environments")
    .select("owner_id")
    .eq("id", environmentId)
    .single();

  if (envError || !env) {
    return { error: "Environment not found" };
  }

  if (env.owner_id === user.id) {
    return { error: "Owners cannot leave their own environment. Delete it instead." };
  }

  const { error: deleteError } = await supabase
    .from("environment_members")
    .delete()
    .eq("environment_id", environmentId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: "Failed to leave environment. Please try again." };
  }

  revalidatePath("/");
  return { error: null };
};
