import type { Database } from "./database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
