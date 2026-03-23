-- 1. Create task_dependencies junction table
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- 2. Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task dependencies" ON public.task_dependencies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE POLICY "Members can add task dependencies" ON public.task_dependencies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE POLICY "Members can remove task dependencies" ON public.task_dependencies FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON public.task_dependencies (depends_on_task_id);

-- 4. Circular dependency prevention function
CREATE OR REPLACE FUNCTION public.check_circular_dependency()
RETURNS trigger AS $$
BEGIN
  -- Check if adding this dependency would create a cycle
  -- Walk from depends_on_task_id following dependencies to see if we reach task_id
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      SELECT depends_on_task_id AS current_task
      FROM public.task_dependencies
      WHERE task_id = NEW.depends_on_task_id
      UNION
      SELECT td.depends_on_task_id
      FROM public.task_dependencies td
      JOIN dep_chain dc ON dc.current_task = td.task_id
    )
    SELECT 1 FROM dep_chain WHERE current_task = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger
CREATE TRIGGER prevent_circular_dependency
  BEFORE INSERT ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_circular_dependency();
