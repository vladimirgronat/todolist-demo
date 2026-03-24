"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApiKey } from "@/app/actions/api-keys";

export const ApiKeyCreate = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createApiKey(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.rawKey) {
        setRawKey(result.rawKey);
        form.reset();
      }
    });
  };

  const handleCopy = async () => {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    setRawKey(null);
    setCopied(false);
    router.refresh();
  };

  if (rawKey) {
    return (
      <div className="space-y-3">
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
        >
          Copy this key now. You won&apos;t be able to see it again!
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <code className="block break-all font-mono text-sm text-gray-900 dark:text-gray-100">
            {rawKey}
          </code>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold dark:text-gray-100">Create a new key</h2>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
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
          placeholder="Key name, e.g. CI Pipeline"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600 dark:focus:border-blue-500 dark:focus:bg-gray-900"
          aria-label="API key name"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow active:bg-blue-800 disabled:opacity-50 disabled:shadow-none"
        >
          {isPending ? "Creating…" : "Create API key"}
        </button>
      </div>
    </form>
  );
};
