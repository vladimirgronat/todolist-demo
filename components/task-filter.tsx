"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TaskFilter } from "@/types/task";

const filters: { label: string; value: TaskFilter }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Dependent", value: "dependent" },
  { label: "Finished", value: "finished" },
];

export const TaskFilterTabs = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("filter") as TaskFilter) || "all";

  const handleFilter = (value: TaskFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-1" role="tablist" aria-label="Task filter">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          role="tab"
          aria-selected={current === value}
          onClick={() => handleFilter(value)}
          className={`rounded px-3 py-1 text-sm font-medium ${
            current === value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
