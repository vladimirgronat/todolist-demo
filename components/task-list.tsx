import { getTasks } from "@/lib/tasks";
import { getTags } from "@/lib/tags";
import { getTaskDependencyMap } from "@/lib/dependencies";
import { getTaskPhotoCounts } from "@/lib/photos";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { TaskItem } from "./task-item";
import type { TaskFilter } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { EnvironmentMember } from "@/types/environment";

interface TaskListProps {
  filter: TaskFilter;
  environmentId: string;
  currentUserId: string;
  categoryId?: string | null;
  categoriesMap?: Record<string, string>;
  categories?: Category[];
  members?: EnvironmentMember[];
  tagId?: string | null;
}

export const TaskList = async ({
  filter,
  environmentId,
  currentUserId,
  categoryId,
  categoriesMap,
  categories = [],
  members = [],
  tagId,
}: TaskListProps) => {
  const tasks = await getTasks(environmentId, filter, categoryId, tagId);
  const allTags = await getTags(environmentId);

  // Batch-fetch task_tags and dependencies to avoid N+1
  const taskTagsMap: Record<string, Tag[]> = {};
  let depMap: Record<string, string[]> = {};
  let photoCountMap: Record<string, number> = {};
  if (tasks.length > 0) {
    const supabase = await createServerSupabaseClient();
    const taskIds = tasks.map((t) => t.id);
    const [{ data: taskTagRows }, fetchedDepMap, photoCounts] = await Promise.all([
      supabase
        .from("task_tags")
        .select("task_id, tag_id")
        .in("task_id", taskIds),
      getTaskDependencyMap(taskIds),
      getTaskPhotoCounts(taskIds),
    ]);

    depMap = fetchedDepMap;
    photoCountMap = photoCounts;

    if (taskTagRows) {
      const tagMap = new Map(allTags.map((t) => [t.id, t]));
      for (const row of taskTagRows) {
        const tag = tagMap.get(row.tag_id);
        if (tag) {
          if (!taskTagsMap[row.task_id]) taskTagsMap[row.task_id] = [];
          taskTagsMap[row.task_id].push(tag);
        }
      }
    }
  }

  const allTasksBasic = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    state: t.state,
  }));

  if (tasks.length === 0) {
    const filterMessageMap: Partial<Record<TaskFilter, string>> = {
      refused: "No refused tasks.",
      assigned_to_me: "No tasks assigned to you.",
      i_assigned: "You have not assigned any tasks.",
    };

    return (
      <p className="text-center text-gray-400 py-8">
        {filter === "all"
          ? "No tasks yet. Add one above!"
          : filterMessageMap[filter] ?? `No ${filter} tasks.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          categoryName={task.category_id && categoriesMap ? categoriesMap[task.category_id] : undefined}
          categories={categories}
          tags={taskTagsMap[task.id] ?? []}
          allTags={allTags}
          dependencyIds={depMap[task.id] ?? []}
          allTasksBasic={allTasksBasic}
          photoCount={photoCountMap[task.id] ?? 0}
          currentUserId={currentUserId}
          members={members}
        />
      ))}
    </div>
  );
};
