import Link from "next/link";
import { getEnvironments, getActiveEnvironmentId } from "@/lib/environments";
import { EnvironmentList } from "./environment-list";
import { NewEnvironmentForm } from "./new-environment-form";

export default async function EnvironmentsPage() {
  const environments = await getEnvironments();
  const activeEnvironmentId = await getActiveEnvironmentId();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">Environments</h1>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            &larr; Back
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <NewEnvironmentForm />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <EnvironmentList environments={environments} activeEnvironmentId={activeEnvironmentId ?? undefined} />
        </div>
      </div>
    </main>
  );
}
