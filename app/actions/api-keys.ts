"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ACTIVE_KEYS = 5;

export const createApiKey = async (formData: FormData) => {
  const name = (formData.get("name") as string)?.trim();

  if (!name || name.length === 0) {
    return { error: "Name is required" };
  }

  if (name.length > 100) {
    return { error: "Name must be 100 characters or less" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Enforce max 5 active (non-revoked) keys
  const { count, error: countError } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (countError) {
    return { error: "Failed to check existing keys" };
  }

  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return { error: `You can have at most ${MAX_ACTIVE_KEYS} active API keys` };
  }

  // Generate raw key: tdl_ + 32 hex chars
  const rawKey = `tdl_${crypto.randomBytes(16).toString("hex")}`;

  // Store SHA-256 hash — raw key is never persisted
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  // Prefix for display: first 12 chars (e.g. "tdl_a1b2c3d4")
  const keyPrefix = rawKey.slice(0, 12);

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
  });

  if (error) {
    return { error: "Failed to create API key" };
  }

  revalidatePath("/api-keys");
  return { rawKey };
};

export const listApiKeys = async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Failed to load API keys" };
  }

  return { data };
};

export const revokeApiKey = async (id: string) => {
  if (!id || !UUID_RE.test(id)) {
    return { error: "Invalid key ID" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    return { error: "Failed to revoke API key" };
  }

  if (!data || data.length === 0) {
    return { error: "Key not found or already revoked" };
  }

  revalidatePath("/api-keys");
  return { success: true as const };
};
