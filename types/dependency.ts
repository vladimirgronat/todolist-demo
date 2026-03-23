import type { Database } from "./database";
import type { Task } from "./task";

export type TaskDependency = Database["public"]["Tables"]["task_dependencies"]["Row"];

export interface TaskWithDependencies extends Task {
  dependencies: Task[];
  dependents: Task[];
}
