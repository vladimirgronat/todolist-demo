"use client";

import { useState } from "react";
import { PhotoUpload } from "./photo-upload";

interface CompletionPhotoPromptProps {
  taskId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const CompletionPhotoPrompt = ({ taskId, onComplete, onSkip }: CompletionPhotoPromptProps) => {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onSkip}
      role="dialog"
      aria-modal="true"
      aria-label="Completion photo prompt"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Add a completion photo?
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Capture the finished result before marking this task as done.
        </p>

        <div className="mt-4">
          <PhotoUpload
            taskId={taskId}
            isCompletionPhoto
            onUploadComplete={() => setUploaded(true)}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Skip
          </button>
          {uploaded && (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
