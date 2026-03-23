import type { Database } from "./database";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskState = "planned" | "in_progress" | "dependent" | "finished";
export type TaskAssignmentStatus = "pending" | "accepted" | "refused";
export type TaskFilter =
	| "all"
	| "planned"
	| "in_progress"
	| "dependent"
	| "finished"
	| "assigned_to_me"
	| "i_assigned"
	| "refused";
