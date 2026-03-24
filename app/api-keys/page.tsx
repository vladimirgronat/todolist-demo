import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { listApiKeys } from "@/app/actions/api-keys";
import { ApiKeyCreate } from "@/components/api-key-create";
import { ApiKeyList } from "@/components/api-key-list";

export default async function ApiKeysPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const result = await listApiKeys();
  const keys = result.data ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to tasks
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">API keys</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create and manage API keys for programmatic access to your tasks.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-900 dark:shadow-gray-950/50">
          <ApiKeyCreate />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-900 dark:shadow-gray-950/50">
          <ApiKeyList keys={keys} />
        </div>
      </div>
    </main>
  );
}
