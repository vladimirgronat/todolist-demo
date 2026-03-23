"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TagChip } from "./tag-chip";
import type { Tag } from "@/types/tag";

interface TagFilterProps {
  tags: Tag[];
}

export const TagFilter = ({ tags }: TagFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTagId = searchParams.get("tag");

  if (tags.length === 0) return null;

  const handleToggle = (tagId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTagId === tagId) {
      params.delete("tag");
    } else {
      params.set("tag", tagId);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by tag">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags:</span>
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          onClick={() => handleToggle(tag.id)}
          active={activeTagId === tag.id}
        />
      ))}
    </div>
  );
};
