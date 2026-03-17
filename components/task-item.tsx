"use client";

import { useState } from "react";
import { toggleTask, deleteTask, updateTask } from "@/app/actions/tasks";
import type { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
}

export const TaskItem = ({ task }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await toggleTask(task.id, task.completed);
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteTask(task.id);
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await updateTask(task.id, formData);
    setIsEditing(false);
    setLoading(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleUpdate}
        className="flex flex-col gap-2 rounded border p-3"
      >
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={task.title}
          className="rounded border px-3 py-2"
          aria-label="Edit task title"
        />
        <input
          name="description"
          type="text"
          defaultValue={task.description ?? ""}
          className="rounded border px-3 py-2"
          aria-label="Edit task description"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded border p-3">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={handleToggle}
        disabled={loading}
        className="h-5 w-5 shrink-0"
        aria-label={`Mark "${task.title}" as ${task.completed ? "active" : "completed"}`}
      />

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${task.completed ? "line-through text-gray-400" : ""}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-gray-500 truncate">{task.description}</p>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
          aria-label={`Edit "${task.title}"`}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          aria-label={`Delete "${task.title}"`}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
