-- 1. Add state column with default 'planned'
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'planned'
  CHECK (state IN ('planned', 'in_progress', 'dependent', 'finished'));

-- 2. Data migration: map completed boolean to new states
UPDATE public.tasks SET state = 'finished' WHERE completed = true;
UPDATE public.tasks SET state = 'planned' WHERE completed = false;

-- 3. Drop completed column
ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed;

-- 4. Create index for environment+state filtering
CREATE INDEX IF NOT EXISTS idx_tasks_env_state ON public.tasks (environment_id, state);
