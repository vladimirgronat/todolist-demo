"use client";

import { useState } from "react";
import {
  acceptTaskAssignment,
  changeTaskState,
  clearTaskAssignment,
  deleteTask,
  refuseTaskAssignment,
  updateTask,
} from "@/app/actions/tasks";
import { addTagToTask, removeTagFromTask } from "@/app/actions/tags";
import { addDependency, removeDependency } from "@/app/actions/dependencies";
import { deletePhoto } from "@/app/actions/photos";
import { TagChip } from "./tag-chip";
import { PhotoGrid } from "./photo-grid";
import { PhotoUpload } from "./photo-upload";
import { CompletionPhotoPrompt } from "./completion-photo-prompt";
import type { Task } from "@/types/task";
import type { TaskState } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { EnvironmentMember } from "@/types/environment";

interface BasicTask {
  id: string;
  title: string;
  state: string;
}

interface PhotoWithUrl {
  id: string;
  url: string;
  filename: string;
  is_completion_photo: boolean;
}

interface TaskItemProps {
  task: Task;
  currentUserId: string;
  members?: EnvironmentMember[];
  categoryName?: string;
  categories?: Category[];
  tags?: Tag[];
  allTags?: Tag[];
  dependencyIds?: string[];
  allTasksBasic?: BasicTask[];
  photoCount?: number;
}

export const TaskItem = ({
  task,
  currentUserId,
  members = [],
  categoryName,
  categories = [],
  tags = [],
  allTags = [],
  dependencyIds = [],
  allTasksBasic = [],
  photoCount = 0,
}: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskTags, setTaskTags] = useState<Tag[]>(tags);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [localDepIds, setLocalDepIds] = useState<string[]>(dependencyIds);
  const [depLoading, setDepLoading] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [localPhotoCount, setLocalPhotoCount] = useState(photoCount);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const isCreator = task.user_id === currentUserId;
  const isAssignee = task.assigned_to === currentUserId;

  const assignableMembers = members.filter(
    (member) => member.joined_at !== null && member.user_id !== task.user_id
  );

  const handleStateChange = async (newState: TaskState) => {
    if (newState === "finished" && task.state !== "finished") {
      setShowCompletionPrompt(true);
      return;
    }
    setLoading(true);
    await changeTaskState(task.id, newState);
    setLoading(false);
  };

  const completeFinish = async () => {
    setShowCompletionPrompt(false);
    setLoading(true);
    await changeTaskState(task.id, "finished");
    setLoading(false);
  };

  const loadPhotos = async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/photos?task_id=${encodeURIComponent(task.id)}`);
      const json = await res.json();
      if (json.data) setPhotos(json.data);
    } finally {
      setPhotosLoading(false);
    }
  };

  const togglePhotos = () => {
    const next = !showPhotos;
    setShowPhotos(next);
    if (next && photos.length === 0) loadPhotos();
  };

  const handleDeletePhoto = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setLocalPhotoCount((c) => Math.max(0, c - 1));
    await deletePhoto(photoId);
  };

  const handleUploadComplete = () => {
    setLocalPhotoCount((c) => c + 1);
    loadPhotos();
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteTask(task.id);
    setLoading(false);
  };

  const handleAcceptAssignment = async () => {
    setAssignmentError(null);
    setLoading(true);
    const result = await acceptTaskAssignment(task.id);
    if (result.error) {
      setAssignmentError(result.error);
    }
    setLoading(false);
  };

  const handleRefuseAssignment = async () => {
    setAssignmentError(null);
    setLoading(true);
    const result = await refuseTaskAssignment(task.id, refusalReason);
    if (result.error) {
      setAssignmentError(result.error);
    } else {
      setShowRefuseForm(false);
      setRefusalReason("");
    }
    setLoading(false);
  };

  const handleClearAssignment = async () => {
    setAssignmentError(null);
    setLoading(true);
    const result = await clearTaskAssignment(task.id);
    if (result.error) {
      setAssignmentError(result.error);
    }
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

  const handleToggleTag = async (tag: Tag) => {
    const isAssigned = taskTags.some((t) => t.id === tag.id);
    if (isAssigned) {
      setTaskTags((prev) => prev.filter((t) => t.id !== tag.id));
      await removeTagFromTask(task.id, tag.id);
    } else {
      setTaskTags((prev) => [...prev, tag]);
      await addTagToTask(task.id, tag.id);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setTaskTags((prev) => prev.filter((t) => t.id !== tagId));
    await removeTagFromTask(task.id, tagId);
  };

  const handleAddDependency = async (depTaskId: string) => {
    if (!depTaskId || localDepIds.includes(depTaskId)) return;
    setDepLoading(true);
    setLocalDepIds((prev) => [...prev, depTaskId]);
    const formData = new FormData();
    formData.set("task_id", task.id);
    formData.set("depends_on_task_id", depTaskId);
    const result = await addDependency(formData);
    if (result.error) {
      setLocalDepIds((prev) => prev.filter((id) => id !== depTaskId));
    }
    setDepLoading(false);
  };

  const handleRemoveDependency = async (depTaskId: string) => {
    setDepLoading(true);
    setLocalDepIds((prev) => prev.filter((id) => id !== depTaskId));
    const formData = new FormData();
    formData.set("task_id", task.id);
    formData.set("depends_on_task_id", depTaskId);
    const result = await removeDependency(formData);
    if (result.error) {
      setLocalDepIds((prev) => [...prev, depTaskId]);
    }
    setDepLoading(false);
  };

  const depTaskMap = new Map(allTasksBasic.map((t) => [t.id, t]));
  const availableForDep = allTasksBasic.filter(
    (t) => t.id !== task.id && !localDepIds.includes(t.id)
  );

  if (isEditing) {
    return (
      <form
        onSubmit={handleUpdate}
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        data-testid="task-item"
      >
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={task.title}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:bg-gray-900"
          aria-label="Edit task title"
        />
        <input
          name="description"
          type="text"
          defaultValue={task.description ?? ""}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:bg-gray-900"
          aria-label="Edit task description"
        />

        {/* Category selector */}
        {categories.length > 0 && (
          <select
            name="category_id"
            defaultValue={task.category_id ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600"
            aria-label="Edit task category"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}

        {isCreator && assignableMembers.length > 0 && (
          <select
            name="assigned_to"
            defaultValue={task.assigned_to ?? ""}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600"
            aria-label="Edit task assignee"
          >
            <option value="">Unassigned</option>
            {assignableMembers.map((member) => (
              <option key={member.id} value={member.user_id}>
                {member.user_id.slice(0, 8)}...
              </option>
            ))}
          </select>
        )}

        {/* Tag picker */}
        {allTags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => {
                const isAssigned = taskTags.some((t) => t.id === tag.id);
                return (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    onClick={() => handleToggleTag(tag)}
                    active={isAssigned}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-950/50" data-testid="task-item">
      <select
        value={task.state}
        onChange={(e) => handleStateChange(e.target.value as TaskState)}
        disabled={loading}
        className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm transition-colors hover:border-gray-300 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600"
        aria-label={`Change state of "${task.title}"`}
      >
        <option value="planned">Planned</option>
        <option value="in_progress">In Progress</option>
        <option value="dependent">Dependent</option>
        <option value="finished">Finished</option>
      </select>

      <div className="flex-1 min-w-0">
        {assignmentError && (
          <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {assignmentError}
          </p>
        )}
        <div className="flex items-center gap-2">
          <p
            className={`font-medium ${task.state === "finished" ? "line-through text-gray-400" : ""}`}
          >
            {task.title}
          </p>
          {categoryName && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {categoryName}
            </span>
          )}
          {task.state === "dependent" && (
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Blocked
            </span>
          )}
          {task.assigned_to && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                task.assignment_status === "refused"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : task.assignment_status === "accepted"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              {task.assignment_status === "refused"
                ? `Refused by ${task.assigned_to.slice(0, 8)}...`
                : task.assignment_status === "accepted"
                  ? `Accepted by ${task.assigned_to.slice(0, 8)}...`
                  : task.assigned_to === currentUserId
                    ? "Assigned to you"
                    : `Assigned to ${task.assigned_to.slice(0, 8)}...`}
            </span>
          )}
          {localDepIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeps(!showDeps)}
              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors duration-150"
              aria-label={`${localDepIds.length} dependencies, click to toggle`}
            >
              {localDepIds.length} dep{localDepIds.length !== 1 ? "s" : ""}
            </button>
          )}
          {localPhotoCount > 0 && (
            <button
              type="button"
              onClick={togglePhotos}
              className="shrink-0 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors duration-150"
              aria-label={`${localPhotoCount} photo${localPhotoCount !== 1 ? "s" : ""}, click to toggle`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {localPhotoCount}
            </button>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-gray-500 truncate">{task.description}</p>
        )}
        {task.assignment_status === "refused" && task.refusal_reason && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-medium">Refusal reason</p>
            <p className="mt-1 whitespace-pre-wrap">{task.refusal_reason}</p>
          </div>
        )}

        {isAssignee && task.assignment_status === "pending" && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This task was assigned to you. Accept it or refuse with an explanation.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAcceptAssignment}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setShowRefuseForm((prev) => !prev)}
                disabled={loading}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                Refuse
              </button>
            </div>
            {showRefuseForm && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  maxLength={500}
                  placeholder="Why are you refusing this task?"
                  className="min-h-[72px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  aria-label="Refusal explanation"
                />
                <button
                  type="button"
                  onClick={handleRefuseAssignment}
                  disabled={loading}
                  className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Submit refusal
                </button>
              </div>
            )}
          </div>
        )}
        {/* Assigned tags */}
        {taskTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {taskTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
            ))}
          </div>
        )}
        {/* Inline tag picker toggle (view mode) */}
        {allTags.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
              aria-label="Toggle tag picker"
            >
              {showTagPicker ? "− Hide tags" : "+ Tag"}
            </button>
            {showTagPicker && (
              <div className="mt-1 flex flex-wrap gap-1">
                {allTags
                  .filter((t) => !taskTags.some((tt) => tt.id === t.id))
                  .map((tag) => (
                    <TagChip
                      key={tag.id}
                      tag={tag}
                      onClick={() => handleToggleTag(tag)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
        {/* Dependency toggle (when no deps yet) */}
        {localDepIds.length === 0 && allTasksBasic.length > 1 && (
          <button
            type="button"
            onClick={() => setShowDeps(!showDeps)}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
            aria-label="Toggle dependency picker"
          >
            {showDeps ? "− Hide deps" : "+ Dep"}
          </button>
        )}
        {/* Dependency section */}
        {showDeps && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dependencies</p>
            {localDepIds.length > 0 && (
              <ul className="space-y-1 mb-2">
                {localDepIds.map((depId) => {
                  const depTask = depTaskMap.get(depId);
                  return (
                    <li key={depId} className="flex items-center gap-2 text-sm">
                      <span
                        className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                          depTask?.state === "finished"
                            ? "bg-green-500"
                            : depTask?.state === "in_progress"
                              ? "bg-blue-500"
                              : "bg-gray-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate flex-1">
                        {depTask?.title ?? depId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(depId)}
                        disabled={depLoading}
                        className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        aria-label={`Remove dependency on ${depTask?.title ?? depId}`}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {availableForDep.length > 0 && (
              <div className="flex gap-2">
                <select
                  id={`add-dep-${task.id}`}
                  defaultValue=""
                  className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  aria-label="Select task to add as dependency"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      handleAddDependency(val);
                      e.target.value = "";
                    }
                  }}
                  disabled={depLoading}
                >
                  <option value="" disabled>Add dependency…</option>
                  {availableForDep.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.state})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {availableForDep.length === 0 && localDepIds.length === 0 && (
              <p className="text-xs text-gray-400">No other tasks available.</p>
            )}
          </div>
        )}
        {/* Photos section */}
        {showPhotos && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Photos</p>
            {photosLoading ? (
              <div className="flex items-center gap-2 py-2">
                <svg className="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-400">Loading photos…</span>
              </div>
            ) : (
              <>
                <PhotoGrid photos={photos} onDelete={handleDeletePhoto} />
                <div className="mt-2">
                  <PhotoUpload taskId={task.id} onUploadComplete={handleUploadComplete} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {isCreator && task.assigned_to && (
          <button
            type="button"
            onClick={handleClearAssignment}
            disabled={loading}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-amber-700 transition-colors duration-150 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30 disabled:opacity-50"
            aria-label={`Unassign "${task.title}"`}
            title="Unassign"
          >
            Unassign
          </button>
        )}
        <button
          onClick={togglePhotos}
          className="rounded-lg p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={`Attach photo to "${task.title}"`}
          title="Attach photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={`Edit "${task.title}"`}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Delete "${task.title}"`}
        >
          Delete
        </button>
      </div>

      {showCompletionPrompt && (
        <CompletionPhotoPrompt
          taskId={task.id}
          onComplete={completeFinish}
          onSkip={completeFinish}
        />
      )}
    </div>
  );
};
