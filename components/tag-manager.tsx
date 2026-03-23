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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tags</h2>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <label htmlFor="new-tag-name" className="sr-only">New tag name</label>
        <input
          id="new-tag-name"
          name="name"
          type="text"
          required
          maxLength={50}
          placeholder="New tag…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <label htmlFor="new-tag-color" className="sr-only">Tag color</label>
        <input
          id="new-tag-color"
          name="color"
          type="color"
          defaultValue="#3b82f6"
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-gray-300 p-0.5 dark:border-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {/* Tag list */}
      {tags.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No tags yet — create one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Color swatch */}
              <div className="relative shrink-0">
                <label htmlFor={`color-${tag.id}`} className="sr-only">Color for {tag.name}</label>
                <input
                  id={`color-${tag.id}`}
                  type="color"
                  value={tag.color ?? "#6b7280"}
                  onChange={(e) => handleColorChange(tag.id, e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded-full border border-gray-300 p-0.5 dark:border-gray-700"
                />
              </div>

              {/* Name or rename form */}
              {editingId === tag.id ? (
                <form
                  onSubmit={(e) => handleRename(tag.id, e)}
                  className="flex flex-1 items-center gap-2"
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
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 transition-colors duration-150"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {tag.name}
                </span>
              )}

              {/* Preset color chips */}
              <div className="hidden sm:flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(tag.id, c)}
                    className={`h-4 w-4 rounded-full border transition-transform duration-150 hover:scale-125 ${
                      tag.color === c ? "border-gray-900 dark:border-white ring-1 ring-offset-1 ring-gray-400" : "border-gray-300 dark:border-gray-600"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Set color ${c} for "${tag.name}"`}
                  />
                ))}
              </div>

              {/* Actions */}
              {editingId !== tag.id && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(tag.id)}
                    className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors duration-150"
                    aria-label={`Rename "${tag.name}"`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    disabled={loading}
                    className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50 transition-colors duration-150"
                    aria-label={`Delete "${tag.name}"`}
                  >
                    Delete
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
