import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_PREFIX = "tdl_";
const TOKEN_LENGTH = 36; // 4 prefix + 32 hex chars

export const createApiSupabaseClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

export const authenticateApiKey = async (
  request: Request
): Promise<{ userId: string } | null> => {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7);
  if (
    token.length !== TOKEN_LENGTH ||
    !token.startsWith(TOKEN_PREFIX) ||
    !/^[0-9a-f]{32}$/.test(token.slice(TOKEN_PREFIX.length))
  ) {
    return null;
  }

  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createApiSupabaseClient();
  const { data, error } = await supabase.rpc("verify_api_key", {
    p_key_hash: keyHash,
  });

  if (error || typeof data !== "string" || !UUID_RE.test(data)) return null;

  return { userId: data };
};
