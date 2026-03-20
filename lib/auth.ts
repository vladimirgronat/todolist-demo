import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { createClient } from "./supabase";

export const signUp = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

export const signInWithGoogle = async () => {
  const supabase = createClient();
  const isNative = Capacitor.isNativePlatform();
  const redirectTo = isNative
    ? "com.vladimirgronat.todolist://auth/callback"
    : `${location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
    },
  });
  if (error) throw error;

  // On native, open OAuth URL in system browser so the deep link
  // redirect brings the user back to the native app
  if (isNative && data.url) {
    await Browser.open({ url: data.url });
  }

  return data;
};
