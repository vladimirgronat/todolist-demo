"use client";

import { useState } from "react";
import { createEnvironment } from "@/app/actions/environments";
import { useRouter } from "next/navigation";

export const NewEnvironmentForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createEnvironment(formData);

    if (result.error) {
      setError(result.error);
    } else {
      form.reset();
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400"
        >
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <input
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="New environment name"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
          aria-label="Environment name"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow active:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
};
