import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { createClient } from "./supabase";

export const setupDeepLinkListener = () => {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.includes("auth/callback")) return;

    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get("code");

    if (!code) return;

    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      window.location.href = "/";
    }
  });
};
