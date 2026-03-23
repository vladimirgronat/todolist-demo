import Link from "next/link";
import { getEnvironments } from "@/lib/environments";
import { EnvironmentList } from "./environment-list";
import { NewEnvironmentForm } from "./new-environment-form";

export default async function EnvironmentsPage() {
  const environments = await getEnvironments();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold dark:text-gray-100">Environments</h1>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          &larr; Back
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <NewEnvironmentForm />
        <EnvironmentList environments={environments} />
      </div>
    </main>
  );
}
