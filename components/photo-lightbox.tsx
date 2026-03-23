"use client";

import { useState, useEffect, useCallback } from "react";

interface LightboxPhoto {
  url: string;
  filename: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export const PhotoLightbox = ({ photos, initialIndex, onClose }: PhotoLightboxProps) => {
  const [index, setIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer: ${photo.filename}`}
    >
      <div
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-full p-1 text-white/80 hover:text-white transition-colors duration-150"
          aria-label="Close lightbox"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous */}
        {photos.length > 1 && (
          <button
            onClick={goPrev}
            className="absolute -left-12 rounded-full p-2 text-white/70 hover:text-white transition-colors duration-150"
            aria-label="Previous photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.filename}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />

        {/* Next */}
        {photos.length > 1 && (
          <button
            onClick={goNext}
            className="absolute -right-12 rounded-full p-2 text-white/70 hover:text-white transition-colors duration-150"
            aria-label="Next photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Counter */}
      {photos.length > 1 && (
        <p className="absolute bottom-6 text-sm text-white/60">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
};
