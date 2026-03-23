import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Category, CategoryTreeNode } from "@/types/category";

export const getCategories = async (environmentId: string): Promise<Category[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("environment_id", environmentId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const buildCategoryTree = (categories: Category[]): CategoryTreeNode[] => {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Initialize all nodes
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Build tree
  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};
