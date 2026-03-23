-- 1. Create task_photos table
CREATE TABLE IF NOT EXISTS public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  size_bytes integer NOT NULL,
  is_completion_photo boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task photos" ON public.task_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE POLICY "Members can upload task photos" ON public.task_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE POLICY "Members can delete task photos" ON public.task_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_task_photos_task ON public.task_photos (task_id, created_at);

-- 4. Unique completion photo per task
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_photos_completion ON public.task_photos (task_id) WHERE is_completion_photo = true;

-- 5. Max 10 photos per task trigger
CREATE OR REPLACE FUNCTION public.check_max_photos()
RETURNS trigger AS $$
DECLARE
  photo_count integer;
BEGIN
  SELECT COUNT(*) INTO photo_count FROM public.task_photos WHERE task_id = NEW.task_id;
  IF photo_count >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 photos per task';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_photos
  BEFORE INSERT ON public.task_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_photos();
