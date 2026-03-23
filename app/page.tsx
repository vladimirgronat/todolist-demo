import { Suspense } from "react";
import Link from "next/link";
import { TaskForm } from "@/components/task-form";
import { TaskFilterTabs } from "@/components/task-filter";
import { TagFilter } from "@/components/tag-filter";
import { TagManager } from "@/components/tag-manager";
import { TaskList } from "@/components/task-list";
import { CategoryTree } from "@/components/category-tree";
import { EnvironmentSwitcher } from "@/components/environment-switcher";
import { PendingInvitations } from "@/components/pending-invitations";
import { getEnvironments, getActiveEnvironmentId } from "@/lib/environments";
import { getCategories, buildCategoryTree } from "@/lib/categories";
import { getTags } from "@/lib/tags";
import { getPendingInvitations } from "@/lib/teams";
import type { TaskFilter } from "@/types/task";

interface HomeProps {
  searchParams: Promise<{ filter?: string; env?: string; category?: string; tag?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filter = (params.filter as TaskFilter) || "all";
  const categoryId = params.category || null;
  const tagId = params.tag || null;

  const environments = await getEnvironments();
  const activeEnvironmentId = await getActiveEnvironmentId(params.env);

  if (!activeEnvironmentId || environments.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 dark:text-gray-100">TodoList</h1>
        <p className="text-gray-500 dark:text-gray-400">
          No environments found. Please contact support or sign in again.
        </p>
      </main>
    );
  }

  const flatCategories = await getCategories(activeEnvironmentId);
  const categoryTree = buildCategoryTree(flatCategories);
  const categoriesMap: Record<string, string> = {};
  for (const cat of flatCategories) {
    categoriesMap[cat.id] = cat.name;
  }

  const tags = await getTags(activeEnvironmentId);
  const pendingInvitations = await getPendingInvitations();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold dark:text-gray-100">TodoList</h1>
          <EnvironmentSwitcher
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/environments"
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Environments
          </Link>
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
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <PendingInvitations invitations={pendingInvitations} />

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="shrink-0 md:w-56">
          <CategoryTree
            categories={categoryTree}
            environmentId={activeEnvironmentId}
          />
          <div className="mt-6">
            <TagManager tags={tags} environmentId={activeEnvironmentId} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-6 min-w-0">
          <TaskForm environmentId={activeEnvironmentId} categories={flatCategories} />

          <TaskFilterTabs />

          <TagFilter tags={tags} />

          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            }
          >
            <TaskList
              filter={filter}
              environmentId={activeEnvironmentId}
              categoryId={categoryId}
              categoriesMap={categoriesMap}
              tagId={tagId}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
