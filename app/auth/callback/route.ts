import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const isValidRedirectPath = (path: string): boolean =>
  path.startsWith("/") && !path.startsWith("//") && !path.includes("://");

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safePath = isValidRedirectPath(next) ? next : "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
