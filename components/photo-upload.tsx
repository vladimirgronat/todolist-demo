"use client";

import { useState, useRef, useEffect } from "react";
import {
  isNativeCameraAvailable,
  takePhoto,
  pickPhoto,
} from "@/lib/capacitor-camera";

interface PhotoUploadProps {
  taskId: string;
  isCompletionPhoto?: boolean;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PhotoUpload = ({ taskId, isCompletionPhoto = false, onUploadComplete, disabled = false }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsNative(isNativeCameraAvailable());
  }, []);

  const uploadFile = async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be 5 MB or less.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("task_id", taskId);
      formData.append("is_completion_photo", String(isCompletionPhoto));

      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error ?? "Upload failed");
        return;
      }

      onUploadComplete?.();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleCameraCapture = async () => {
    setError(null);
    try {
      const file = await takePhoto();
      if (file) await uploadFile(file);
    } catch (err) {
      if (err instanceof Error && err.message.includes("cancelled")) return;
      setError("Camera failed. Please try again.");
    }
  };

  const handleGalleryPick = async () => {
    setError(null);
    try {
      const file = await pickPhoto();
      if (file) await uploadFile(file);
    } catch (err) {
      if (err instanceof Error && err.message.includes("cancelled")) return;
      setError("Gallery failed. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  if (isNative) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={disabled || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
            aria-label="Take photo with camera"
          >
            {uploading ? (
              <svg className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <span className="text-gray-600 dark:text-gray-300">Camera</span>
          </button>
          <button
            type="button"
            onClick={handleGalleryPick}
            disabled={disabled || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
            aria-label="Pick photo from gallery"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300">Gallery</span>
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={handleDrop}
        className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-sm transition-all duration-200 ${
          dragOver
            ? "border-blue-400 bg-blue-50 shadow-inner dark:bg-blue-950/30 dark:border-blue-500"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750"
        } ${disabled || uploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        aria-label="Upload photo"
      >
        {uploading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">Uploading…</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">Add photo</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          aria-label="Select photo file"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}
    </div>
  );
};
