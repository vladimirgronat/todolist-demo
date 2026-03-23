import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const log: string[] = [];

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    log.push(`user: ${user?.id ?? "null"}, error: ${userErr?.message ?? "none"}`);

    if (!user) {
      return NextResponse.json({ log, result: "no user" });
    }

    // Check existing memberships
    const { data: members, error: memErr } = await supabase
      .from("environment_members")
      .select("id, environment_id, role, joined_at")
      .eq("user_id", user.id);

    log.push(`members: ${JSON.stringify(members)}, error: ${memErr?.message ?? "none"}`);

    // Check existing environments owned by user
    const { data: envs, error: envErr } = await supabase
      .from("environments")
      .select("id, name, owner_id");

    log.push(`environments visible: ${JSON.stringify(envs)}, error: ${envErr?.message ?? "none"}`);

    // Try to create a test environment
    const { data: newEnv, error: createErr } = await supabase
      .from("environments")
      .insert({ name: "Debug-Test", owner_id: user.id })
      .select("id")
      .single();

    log.push(`create env: ${JSON.stringify(newEnv)}, error: ${createErr?.message ?? "none"}`);

    if (newEnv) {
      // Try to create membership
      const { data: newMem, error: memCreateErr } = await supabase
        .from("environment_members")
        .insert({
          environment_id: newEnv.id,
          user_id: user.id,
          role: "owner",
          joined_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      log.push(`create member: ${JSON.stringify(newMem)}, error: ${memCreateErr?.message ?? "none"}`);

      // Clean up: delete the test environment
      const { error: delErr } = await supabase
        .from("environments")
        .delete()
        .eq("id", newEnv.id);

      log.push(`cleanup: error: ${delErr?.message ?? "none"}`);
    }

    return NextResponse.json({ log, result: "done" });
  } catch (e) {
    log.push(`exception: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ log, result: "exception" });
  }
}
