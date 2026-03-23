-- 1. Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 50),
  color text CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment_id, name)
);

-- 2. Create task_tags junction table
CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- 3. Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tags" ON public.tags FOR SELECT USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can create tags" ON public.tags FOR INSERT WITH CHECK (public.is_environment_member(environment_id));
CREATE POLICY "Members can update tags" ON public.tags FOR UPDATE USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can delete tags" ON public.tags FOR DELETE USING (public.is_environment_member(environment_id));

-- 4. Enable RLS on task_tags — access via task's environment
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view task tags" ON public.task_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can add task tags" ON public.task_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can remove task tags" ON public.task_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_tags_env ON public.tags (environment_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON public.task_tags (tag_id);
