"use client";

import { useState } from "react";
import { suggestTasks } from "@/app/actions/suggest";
import { createTask } from "@/app/actions/tasks";

interface Suggestion {
  title: string;
  description: string | null;
}

export const TaskSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setError(null);
    setLoading(true);
    const result = await suggestTasks();

    if (result.error) {
      setError(result.error);
    } else {
      setSuggestions(result.suggestions);
    }

    setLoading(false);
  };

  const handleAdd = async (suggestion: Suggestion) => {
    const formData = new FormData();
    formData.set("title", suggestion.title);
    if (suggestion.description) {
      formData.set("description", suggestion.description);
    }

    await createTask(formData);
    setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="self-start rounded border border-blue-600 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {loading ? "Thinking…" : "✨ Suggest tasks"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded bg-red-100 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-500">Suggestions:</p>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.title}
              className="flex items-center justify-between gap-3 rounded border border-dashed border-blue-300 bg-blue-50 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{suggestion.title}</p>
                {suggestion.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleAdd(suggestion)}
                className="shrink-0 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
