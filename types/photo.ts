import type { Database } from "./database";

export type TaskPhoto = Database["public"]["Tables"]["task_photos"]["Row"];
export type TaskPhotoInsert = Database["public"]["Tables"]["task_photos"]["Insert"];
