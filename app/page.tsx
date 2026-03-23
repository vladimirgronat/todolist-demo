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
import { getEnvironments, getActiveEnvironmentId, ensurePersonalEnvironment } from "@/lib/environments";
import { getCategories, buildCategoryTree } from "@/lib/categories";
import { getTags } from "@/lib/tags";
import { getPendingInvitations } from "@/lib/teams";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { TaskFilter } from "@/types/task";

interface HomeProps {
  searchParams: Promise<{ filter?: string; env?: string; category?: string; tag?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filter = (params.filter as TaskFilter) || "all";
  const categoryId = params.category || null;
  const tagId = params.tag || null;

  await ensurePersonalEnvironment();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">TodoList</h1>
            <EnvironmentSwitcher
              environments={environments}
              activeEnvironmentId={activeEnvironmentId}
            />
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" title={user.email}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="truncate max-w-[180px]">{user.email}</span>
              </span>
            )}
            <Link
              href="/environments"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <PendingInvitations invitations={pendingInvitations} />

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="shrink-0 md:w-60">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
            <CategoryTree
              categories={categoryTree}
              environmentId={activeEnvironmentId}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
            <TagManager tags={tags} environmentId={activeEnvironmentId} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-4 min-w-0">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
            <TaskForm environmentId={activeEnvironmentId} categories={flatCategories} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TaskFilterTabs />
            <TagFilter tags={tags} />
          </div>

          <Suspense
            key={`${filter}-${activeEnvironmentId}-${categoryId}-${tagId}`}
            fallback={
              <div className="flex justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            }
          >
            <TaskList
              filter={filter}
              environmentId={activeEnvironmentId}
              categoryId={categoryId}
              categoriesMap={categoriesMap}
              categories={flatCategories}
              tagId={tagId}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
