import type { Database } from "./database";

export type Environment = Database["public"]["Tables"]["environments"]["Row"];
export type EnvironmentInsert =
  Database["public"]["Tables"]["environments"]["Insert"];
export type EnvironmentUpdate =
  Database["public"]["Tables"]["environments"]["Update"];

export type EnvironmentMember =
  Database["public"]["Tables"]["environment_members"]["Row"];
export type EnvironmentMemberInsert =
  Database["public"]["Tables"]["environment_members"]["Insert"];
export type EnvironmentMemberUpdate =
  Database["public"]["Tables"]["environment_members"]["Update"];

export type EnvironmentRole = "owner" | "member";
