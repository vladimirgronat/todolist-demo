"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSuggestions } from "@/lib/vectel";

interface Suggestion {
  title: string;
  description: string | null;
}

// Simple in-memory rate limiter (per server instance)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(userId, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
};

export const suggestTasks = async (): Promise<{
  suggestions: Suggestion[];
  error: string | null;
}> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { suggestions: [], error: "Not authenticated" };
  }

  if (!checkRateLimit(user.id)) {
    return {
      suggestions: [],
      error: "Too many requests. Please wait a minute before trying again.",
    };
  }

  // Fetch existing task titles for context
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title")
    .eq("completed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const existingTitles = tasks?.map((t) => t.title) ?? [];

  try {
    const suggestions = await getSuggestions(existingTitles);
    return { suggestions, error: null };
  } catch (err) {
    return {
      suggestions: [],
      error:
        err instanceof Error ? err.message : "Failed to get suggestions",
    };
  }
};
