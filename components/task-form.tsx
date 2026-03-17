"use client";

import { useState } from "react";
import { createTask } from "@/app/actions/tasks";

export const TaskForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createTask(formData);

    if (result.error) {
      setError(result.error);
    } else {
      form.reset();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="rounded bg-red-100 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="What needs to be done?"
          className="flex-1 rounded border px-3 py-2"
          aria-label="Task title"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
      </div>

      <input
        name="description"
        type="text"
        placeholder="Description (optional)"
        className="rounded border px-3 py-2"
        aria-label="Task description"
      />
    </form>
  );
};
