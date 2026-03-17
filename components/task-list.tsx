import { getTasks } from "@/lib/tasks";
import { TaskItem } from "./task-item";
import type { TaskFilter } from "@/types/task";

interface TaskListProps {
  filter: TaskFilter;
}

export const TaskList = async ({ filter }: TaskListProps) => {
  const tasks = await getTasks(filter);

  if (tasks.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        {filter === "all"
          ? "No tasks yet. Add one above!"
          : `No ${filter} tasks.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
};
