"use client";

import { useState } from "react";
import { createCategory } from "@/app/actions/categories";

interface CategoryFormProps {
  environmentId: string;
  parentId?: string | null;
  onDone?: () => void;
}

export const CategoryForm = ({
  environmentId,
  parentId,
  onDone,
}: CategoryFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCategory(formData);

    if (result.error) {
      setError(result.error);
    } else {
      e.currentTarget.reset();
      onDone?.();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-1">
        <input type="hidden" name="environment_id" value={environmentId} />
        {parentId && <input type="hidden" name="parent_id" value={parentId} />}
        <input
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="Category name"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          aria-label="New category name"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "…" : "Add"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
