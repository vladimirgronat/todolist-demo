"use client";

import type { Tag } from "@/types/tag";

interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export const TagChip = ({ tag, onRemove, onClick, active }: TagChipProps) => {
  const hasColor = !!tag.color;
  const bgStyle = hasColor ? { backgroundColor: tag.color! } : undefined;

  const baseClasses =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-150";
  const colorClasses = hasColor
    ? "text-white"
    : active
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  const content = (
    <>
      <span className="truncate max-w-[120px]">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label={`Remove tag "${tag.name}"`}
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${colorClasses} cursor-pointer hover:opacity-80`}
        style={bgStyle}
        aria-pressed={active}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`} style={bgStyle}>
      {content}
    </span>
  );
};
