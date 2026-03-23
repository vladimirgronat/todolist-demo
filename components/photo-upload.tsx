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
  const [isNative, setIsNative] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      if (cameraInputRef.current) cameraInputRef.current.value = "";
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

  const spinnerIcon = (
    <svg className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const cameraIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  // Native Capacitor � uses Camera plugin directly
  if (isNative) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={disabled || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Take photo with camera"
          >
            {uploading ? spinnerIcon : cameraIcon}
            <span className="text-gray-600 dark:text-gray-300">Camera</span>
          </button>
          <button
            type="button"
            onClick={handleGalleryPick}
            disabled={disabled || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
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

  // Web � Camera capture (browser native) + file upload
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Camera button � opens native camera on mobile browsers */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600"
          aria-label="Take photo with camera"
        >
          {uploading ? spinnerIcon : cameraIcon}
          <span className="text-gray-600 dark:text-gray-300">Camera</span>
        </button>

        {/* Upload button � opens file picker */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600"
          aria-label="Upload photo from files"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-300">Upload</span>
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="Take photo with camera"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="Select photo file"
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}
    </div>
  );
};
