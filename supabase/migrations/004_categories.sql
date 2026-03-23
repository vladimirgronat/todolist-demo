-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add category_id to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 3. Enable RLS - use is_environment_member helper from migration 002
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
  ON public.categories FOR SELECT
  USING (public.is_environment_member(environment_id));

CREATE POLICY "Members can create categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_environment_member(environment_id));

CREATE POLICY "Members can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_environment_member(environment_id));

CREATE POLICY "Members can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_environment_member(environment_id));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_categories_env ON public.categories (environment_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks (category_id);
