"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeApiKey } from "@/app/actions/api-keys";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface ApiKeyListProps {
  keys: ApiKey[];
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const ApiKeyList = ({ keys }: ApiKeyListProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRevoke = (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await revokeApiKey(id);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold dark:text-gray-100">Your keys</h2>

      {keys.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No API keys yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Create one above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const isRevoked = key.revoked_at !== null;

            return (
              <div
                key={key.id}
                className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  isRevoked
                    ? "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900/50"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isRevoked
                          ? "text-gray-400 line-through dark:text-gray-500"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {key.name}
                    </span>
                    {isRevoked ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      <code className="font-mono">{key.key_prefix}…</code>
                    </span>
                    <span>Created {formatDate(key.created_at)}</span>
                    <span>
                      Last used:{" "}
                      {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
                    </span>
                  </div>
                </div>

                {!isRevoked && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id, key.name)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:active:bg-red-900/40"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
