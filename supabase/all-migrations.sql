-- ============================================================
-- COMBINED MIGRATIONS: Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ==================== MIGRATION 001: Tasks ====================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_created on public.tasks (user_id, created_at desc);
alter table public.tasks enable row level security;

create policy "Users can view own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can create own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on public.tasks for delete using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_task_updated
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- ==================== MIGRATION 002: Environments ====================
create table if not exists public.environments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 100),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.environment_members (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (environment_id, user_id)
);

alter table public.tasks add column if not exists environment_id uuid references public.environments(id) on delete cascade;

create or replace function public.is_environment_member(env_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.environment_members
    where environment_id = env_id
      and user_id = auth.uid()
      and joined_at is not null
  );
$$;

-- Data migration: create Personal environment for each existing user with tasks
do $$
declare
  rec record;
  new_env_id uuid;
begin
  for rec in select distinct user_id from public.tasks where environment_id is null loop
    insert into public.environments (name, owner_id)
    values ('Personal', rec.user_id)
    returning id into new_env_id;

    insert into public.environment_members (environment_id, user_id, role, joined_at)
    values (new_env_id, rec.user_id, 'owner', now());

    update public.tasks
    set environment_id = new_env_id
    where user_id = rec.user_id
      and environment_id is null;
  end loop;
end;
$$;

-- Delete tasks without environment (orphaned)
delete from public.tasks where environment_id is null;

-- Make environment_id NOT NULL
alter table public.tasks alter column environment_id set not null;

-- RLS on environments
alter table public.environments enable row level security;

create policy "Members can view environment" on public.environments for select
  using (auth.uid() = owner_id or public.is_environment_member(id));
create policy "Owner can create environment" on public.environments for insert
  with check (auth.uid() = owner_id);
create policy "Owner can update environment" on public.environments for update
  using (auth.uid() = owner_id);
create policy "Owner can delete environment" on public.environments for delete
  using (auth.uid() = owner_id);

-- RLS on environment_members
alter table public.environment_members enable row level security;

create policy "Members can view memberships" on public.environment_members for select
  using (auth.uid() = user_id or public.is_environment_member(environment_id));
create policy "Owner can invite members" on public.environment_members for insert
  with check (exists (select 1 from public.environments where id = environment_id and owner_id = auth.uid()));
create policy "Member or owner can update membership" on public.environment_members for update
  using (auth.uid() = user_id or exists (select 1 from public.environments where id = environment_id and owner_id = auth.uid()));
create policy "Member or owner can delete membership" on public.environment_members for delete
  using (auth.uid() = user_id or exists (select 1 from public.environments where id = environment_id and owner_id = auth.uid()));

-- Replace tasks RLS with environment-based policies
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can create own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Environment members can view tasks" on public.tasks for select using (public.is_environment_member(environment_id));
create policy "Environment members can create tasks" on public.tasks for insert with check (public.is_environment_member(environment_id));
create policy "Environment members can update tasks" on public.tasks for update using (public.is_environment_member(environment_id));
create policy "Environment members can delete tasks" on public.tasks for delete using (public.is_environment_member(environment_id));

create index if not exists idx_env_members_env_user on public.environment_members (environment_id, user_id);
create index if not exists idx_env_members_user on public.environment_members (user_id);
create index if not exists idx_tasks_env_created on public.tasks (environment_id, created_at desc);

-- ==================== MIGRATION 003: Task States ====================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'planned'
  CHECK (state IN ('planned', 'in_progress', 'dependent', 'finished'));

UPDATE public.tasks SET state = 'finished' WHERE completed = true;
UPDATE public.tasks SET state = 'planned' WHERE completed = false;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed;

CREATE INDEX IF NOT EXISTS idx_tasks_env_state ON public.tasks (environment_id, state);

-- ==================== MIGRATION 004: Categories ====================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view categories" ON public.categories FOR SELECT USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can create categories" ON public.categories FOR INSERT WITH CHECK (public.is_environment_member(environment_id));
CREATE POLICY "Members can update categories" ON public.categories FOR UPDATE USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can delete categories" ON public.categories FOR DELETE USING (public.is_environment_member(environment_id));

CREATE INDEX IF NOT EXISTS idx_categories_env ON public.categories (environment_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks (category_id);

-- ==================== MIGRATION 005: Tags ====================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 50),
  color text CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment_id, name)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tags" ON public.tags FOR SELECT USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can create tags" ON public.tags FOR INSERT WITH CHECK (public.is_environment_member(environment_id));
CREATE POLICY "Members can update tags" ON public.tags FOR UPDATE USING (public.is_environment_member(environment_id));
CREATE POLICY "Members can delete tags" ON public.tags FOR DELETE USING (public.is_environment_member(environment_id));

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view task tags" ON public.task_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can add task tags" ON public.task_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can remove task tags" ON public.task_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE INDEX IF NOT EXISTS idx_tags_env ON public.tags (environment_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON public.task_tags (tag_id);

-- ==================== MIGRATION 006: Task Dependencies ====================
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task dependencies" ON public.task_dependencies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can add task dependencies" ON public.task_dependencies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can remove task dependencies" ON public.task_dependencies FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON public.task_dependencies (depends_on_task_id);

CREATE OR REPLACE FUNCTION public.check_circular_dependency()
RETURNS trigger AS $$
BEGIN
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

CREATE TRIGGER prevent_circular_dependency
  BEFORE INSERT ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_circular_dependency();

-- ==================== MIGRATION 007: Task Photos ====================
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

ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task photos" ON public.task_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can upload task photos" ON public.task_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));
CREATE POLICY "Members can delete task photos" ON public.task_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_environment_member(t.environment_id)));

CREATE INDEX IF NOT EXISTS idx_task_photos_task ON public.task_photos (task_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_photos_completion ON public.task_photos (task_id) WHERE is_completion_photo = true;

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

-- ==================== MIGRATION 008: Teams ====================
create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where email = lower(email_input) limit 1;
$$;

drop policy if exists "Members can view environment" on public.environments;
create policy "Members and invitees can view environment" on public.environments for select
  using (
    auth.uid() = owner_id
    or public.is_environment_member(id)
    or exists (select 1 from public.environment_members where environment_id = id and user_id = auth.uid())
  );

-- ==================== MIGRATION 009: Auto-create env for new users ====================
create or replace function public.handle_new_user_environment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_env_id uuid;
begin
  insert into public.environments (name, owner_id)
  values ('Personal', new.id)
  returning id into new_env_id;

  insert into public.environment_members (environment_id, user_id, role, joined_at)
  values (new_env_id, new.id, 'owner', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_environment on auth.users;
create trigger on_auth_user_created_environment
  after insert on auth.users
  for each row
  execute function public.handle_new_user_environment();

-- Backfill: create Personal environment for existing users who have none
do $$
declare
  rec record;
  new_env_id uuid;
begin
  for rec in
    select u.id as user_id
    from auth.users u
    where not exists (
      select 1
      from public.environment_members em
      where em.user_id = u.id
        and em.joined_at is not null
    )
  loop
    insert into public.environments (name, owner_id)
    values ('Personal', rec.user_id)
    returning id into new_env_id;

    insert into public.environment_members (environment_id, user_id, role, joined_at)
    values (new_env_id, rec.user_id, 'owner', now());
  end loop;
end;
$$;
