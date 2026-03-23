"use client";

import { useState } from "react";
import { createTag, renameTag, updateTagColor, deleteTag } from "@/app/actions/tags";
import type { Tag } from "@/types/tag";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

interface TagManagerProps {
  tags: Tag[];
  environmentId: string;
}

export const TagManager = ({ tags, environmentId }: TagManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("environment_id", environmentId);
    const result = await createTag(formData);
    if (result.error) {
      setError(result.error);
    } else {
      form.reset();
    }
    setLoading(false);
  };

  const handleRename = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await renameTag(id, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
    }
    setLoading(false);
  };

  const handleColorChange = async (id: string, color: string) => {
    setError(null);
    const formData = new FormData();
    formData.set("color", color);
    const result = await updateTagColor(id, formData);
    if (result.error) setError(result.error);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setLoading(true);
    const result = await deleteTag(id);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tags</h2>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="space-y-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="new-tag-color" className="sr-only">Tag color</label>
          <input
            id="new-tag-color"
            name="color"
            type="color"
            defaultValue="#3b82f6"
            className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-0.5 dark:border-gray-700"
          />
          <label htmlFor="new-tag-name" className="sr-only">New tag name</label>
          <input
            id="new-tag-name"
            name="name"
            type="text"
            required
            maxLength={50}
            placeholder="New tag…"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {/* Preset colors for quick selection */}
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const colorInput = document.getElementById("new-tag-color") as HTMLInputElement;
                if (colorInput) colorInput.value = c;
              }}
              className="h-5 w-5 rounded-full border border-gray-200 transition-transform hover:scale-125 dark:border-gray-700"
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </form>

      {/* Tag list */}
      {tags.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
          No tags yet — create one above.
        </p>
      ) : (
        <ul className="space-y-1">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {/* Color swatch */}
              <div className="relative shrink-0">
                <label htmlFor={`color-${tag.id}`} className="sr-only">Color for {tag.name}</label>
                <input
                  id={`color-${tag.id}`}
                  type="color"
                  value={tag.color ?? "#6b7280"}
                  onChange={(e) => handleColorChange(tag.id, e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded-full border border-gray-200 p-0 dark:border-gray-700"
                />
              </div>

              {/* Name or rename form */}
              {editingId === tag.id ? (
                <form
                  onSubmit={(e) => handleRename(tag.id, e)}
                  className="flex flex-1 items-center gap-1"
                >
                  <label htmlFor={`rename-${tag.id}`} className="sr-only">Rename tag</label>
                  <input
                    id={`rename-${tag.id}`}
                    name="name"
                    type="text"
                    required
                    maxLength={50}
                    defaultValue={tag.name}
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                  {tag.name}
                </span>
              )}

              {/* Actions — visible on hover */}
              {editingId !== tag.id && (
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditingId(tag.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label={`Rename "${tag.name}"`}
                    title="Rename"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    disabled={loading}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
                    aria-label={`Delete "${tag.name}"`}
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
