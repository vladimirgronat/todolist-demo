import type { Database } from "./database";

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
export type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];
