import type { Database } from "@/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProjectGeneration = Database["public"]["Tables"]["project_generations"]["Row"];

export type ProjectStatus = Project["status"];
export type GenerationType = Project["generation_type"];
