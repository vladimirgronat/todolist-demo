"use client";

import { useState } from "react";
import Link from "next/link";
import { renameEnvironment, deleteEnvironment } from "@/app/actions/environments";
import { useRouter } from "next/navigation";
import type { Environment } from "@/types/environment";

interface EnvironmentListProps {
  environments: Environment[];
  activeEnvironmentId?: string;
}

export const EnvironmentList = ({ environments, activeEnvironmentId }: EnvironmentListProps) => {
  if (environments.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8 dark:text-gray-500">
        No environments yet. Create one above!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {environments.map((env) => (
        <EnvironmentItem
          key={env.id}
          environment={env}
          canDelete={environments.length > 1}
          isActive={env.id === activeEnvironmentId}
        />
      ))}
    </div>
  );
};

interface EnvironmentItemProps {
  environment: Environment;
  canDelete: boolean;
  isActive: boolean;
}

const EnvironmentItem = ({ environment, canDelete, isActive }: EnvironmentItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRename = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("id", environment.id);
    const result = await renameEnvironment(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setIsEditing(false);
      router.refresh();
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${environment.name}"? All tasks in this environment will be deleted.`)) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("id", environment.id);
    const result = await deleteEnvironment(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }

    setLoading(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleRename}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
      >
        {error && (
          <div role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={environment.name}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            aria-label="Environment name"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setError(null);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
      isActive
        ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
        : "border-gray-200 dark:border-gray-700"
    }`}>
      {error && (
        <div role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {environment.name}
        {isActive && (
          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            Active
          </span>
        )}
      </span>
      <div className="flex gap-1 shrink-0">
        <Link
          href={`/?env=${environment.id}`}
          className="rounded-lg px-2 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          Open
        </Link>
        <Link
          href={`/environments/${environment.id}/team`}
          className="rounded-lg px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Team
        </Link>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label={`Rename "${environment.name}"`}
        >
          Rename
        </button>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
            aria-label={`Delete "${environment.name}"`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
