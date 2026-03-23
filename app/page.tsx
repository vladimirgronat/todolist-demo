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
import { MobileSidebar } from "@/components/mobile-sidebar";
import { getEnvironments, getActiveEnvironmentId, ensurePersonalEnvironment } from "@/lib/environments";
import { getCategories, buildCategoryTree } from "@/lib/categories";
import { getTags } from "@/lib/tags";
import { getEnvironmentMembers, getPendingInvitations } from "@/lib/teams";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { signOut } from "@/app/actions/auth";
import type { TaskFilter } from "@/types/task";

const VALID_FILTERS: TaskFilter[] = [
  "all",
  "planned",
  "in_progress",
  "dependent",
  "finished",
  "assigned_to_me",
  "i_assigned",
  "refused",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidFilter = (v: string | undefined): v is TaskFilter =>
  !!v && VALID_FILTERS.includes(v as TaskFilter);

const isValidUUID = (v: string | undefined): v is string =>
  !!v && UUID_RE.test(v);

interface HomeProps {
  searchParams: Promise<{ filter?: string; env?: string; category?: string; tag?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filter: TaskFilter = isValidFilter(params.filter) ? params.filter : "all";
  const categoryId = (params.category === "uncategorized" || isValidUUID(params.category)) ? params.category : null;
  const tagId = isValidUUID(params.tag) ? params.tag : null;

  await ensurePersonalEnvironment();

  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 dark:text-gray-100">TodoList</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Please sign in to continue.
        </p>
      </main>
    );
  }

  const environments = await getEnvironments();
  const activeEnvironmentId = await getActiveEnvironmentId(isValidUUID(params.env) ? params.env : undefined);

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
  const members = await getEnvironmentMembers(activeEnvironmentId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-4 rounded-2xl bg-white p-3 shadow-sm sm:mb-6 sm:p-4 dark:bg-gray-900 dark:shadow-gray-950/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl dark:text-gray-100">TodoList</h1>
            <EnvironmentSwitcher
              environments={environments}
              activeEnvironmentId={activeEnvironmentId}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user?.email && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" title={user.email}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="truncate max-w-[180px]">{user.email}</span>
              </span>
            )}
            {/* Environments — icon on mobile, text+icon on desktop */}
            <Link
              href="/environments"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:px-3"
              aria-label="Environments"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span className="hidden sm:inline">Environments</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:px-3"
                aria-label="Sign out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <PendingInvitations invitations={pendingInvitations} />

      <div className="flex flex-col gap-6 md:flex-row">
        <MobileSidebar>
            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
              <CategoryTree
                categories={categoryTree}
                environmentId={activeEnvironmentId}
              />
            </div>
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
              <TagManager tags={tags} environmentId={activeEnvironmentId} />
            </div>
        </MobileSidebar>
        <div className="flex flex-1 flex-col gap-4 min-w-0">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 dark:shadow-gray-950/50">
            <TaskForm
              environmentId={activeEnvironmentId}
              currentUserId={user.id}
              categories={flatCategories}
              members={members}
            />
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
              currentUserId={user.id}
              categoryId={categoryId}
              categoriesMap={categoriesMap}
              categories={flatCategories}
              members={members}
              tagId={tagId}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
