"use client";

import { useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";

interface GridPhoto {
  id: string;
  url: string;
  filename: string;
  is_completion_photo: boolean;
}

interface PhotoGridProps {
  photos: GridPhoto[];
  onDelete?: (photoId: string) => void;
}

export const PhotoGrid = ({ photos, onDelete }: PhotoGridProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photoId: string) => {
    if (!onDelete) return;
    setDeletingId(photoId);
    onDelete(photoId);
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, i) => (
          <div key={photo.id} className="group relative">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`View ${photo.filename}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.filename}
                className="aspect-square w-full rounded-lg object-cover transition-transform duration-150 group-hover:scale-105"
                loading="lazy"
              />
            </button>

            {/* Completion photo badge */}
            {photo.is_completion_photo && (
              <span
                className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white shadow-sm"
                title="Completion photo"
                aria-label="Completion photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-150 hover:bg-red-600 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                aria-label={`Delete ${photo.filename}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
