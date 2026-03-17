import { Suspense } from "react";
import { TaskForm } from "@/components/task-form";
import { TaskFilterTabs } from "@/components/task-filter";
import { TaskList } from "@/components/task-list";
import { TaskSuggestions } from "@/components/task-suggestions";
import type { TaskFilter } from "@/types/task";

interface HomeProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filter = (params.filter as TaskFilter) || "all";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">TodoList</h1>
        <form
          action={async () => {
            "use server";
            const { createServerSupabaseClient } = await import(
              "@/lib/supabase-server"
            );
            const supabase = await createServerSupabaseClient();
            await supabase.auth.signOut();
            const { redirect } = await import("next/navigation");
            redirect("/login");
          }}
        >
          <button
            type="submit"
            className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        <TaskForm />

        <TaskSuggestions />

        <TaskFilterTabs />

        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          }
        >
          <TaskList filter={filter} />
        </Suspense>
      </div>
    </main>
  );
}
