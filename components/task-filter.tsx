"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TaskFilter } from "@/types/task";

const filters: { label: string; value: TaskFilter }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Dependent", value: "dependent" },
  { label: "Finished", value: "finished" },
  { label: "Assigned to Me", value: "assigned_to_me" },
  { label: "I Assigned", value: "i_assigned" },
  { label: "Refused", value: "refused" },
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
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="tablist" aria-label="Task filter">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          role="tab"
          aria-selected={current === value}
          onClick={() => handleFilter(value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            current === value
              ? value === "refused"
                ? "bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
