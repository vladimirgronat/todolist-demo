-- ============================================================
-- Migration 002: Environments & Environment Members
-- Adds multi-environment support, migrates existing tasks
-- ============================================================

-- 1. Create environments table
create table if not exists public.environments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 100),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Create environment_members table
create table if not exists public.environment_members (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (environment_id, user_id)
);

-- 3. Add environment_id to tasks (nullable initially for data migration)
alter table public.tasks add column if not exists environment_id uuid references public.environments(id) on delete cascade;

-- 4. Helper function: check if current user is a joined member of an environment
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

-- 5. Data migration: create Personal environment for each existing user with tasks
do $$
declare
  rec record;
  new_env_id uuid;
begin
  for rec in select distinct user_id from public.tasks loop
    -- Create a Personal environment for each user
    insert into public.environments (name, owner_id)
    values ('Personal', rec.user_id)
    returning id into new_env_id;

    -- Add the user as an owner member (already joined)
    insert into public.environment_members (environment_id, user_id, role, joined_at)
    values (new_env_id, rec.user_id, 'owner', now());

    -- Assign all of this user's tasks to the new environment
    update public.tasks
    set environment_id = new_env_id
    where user_id = rec.user_id
      and environment_id is null;
  end loop;
end;
$$;

-- Make environment_id NOT NULL now that all existing rows are migrated
alter table public.tasks alter column environment_id set not null;

-- 6. RLS on environments
alter table public.environments enable row level security;

create policy "Members can view environment"
  on public.environments for select
  using (auth.uid() = owner_id or public.is_environment_member(id));

create policy "Owner can create environment"
  on public.environments for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update environment"
  on public.environments for update
  using (auth.uid() = owner_id);

create policy "Owner can delete environment"
  on public.environments for delete
  using (auth.uid() = owner_id);

-- 7. RLS on environment_members
alter table public.environment_members enable row level security;

create policy "Members can view memberships"
  on public.environment_members for select
  using (
    auth.uid() = user_id
    or public.is_environment_member(environment_id)
  );

create policy "Owner can invite members"
  on public.environment_members for insert
  with check (
    exists (
      select 1 from public.environments
      where id = environment_id
        and owner_id = auth.uid()
    )
  );

create policy "Member or owner can update membership"
  on public.environment_members for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.environments
      where id = environment_id
        and owner_id = auth.uid()
    )
  );

create policy "Member or owner can delete membership"
  on public.environment_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.environments
      where id = environment_id
        and owner_id = auth.uid()
    )
  );

-- 8. Replace tasks RLS policies with environment-membership-based policies
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can create own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Environment members can view tasks"
  on public.tasks for select
  using (public.is_environment_member(environment_id));

create policy "Environment members can create tasks"
  on public.tasks for insert
  with check (public.is_environment_member(environment_id));

create policy "Environment members can update tasks"
  on public.tasks for update
  using (public.is_environment_member(environment_id));

create policy "Environment members can delete tasks"
  on public.tasks for delete
  using (public.is_environment_member(environment_id));

-- 9. Indexes
create index if not exists idx_env_members_env_user
  on public.environment_members (environment_id, user_id);

create index if not exists idx_env_members_user
  on public.environment_members (user_id);

create index if not exists idx_tasks_env_created
  on public.tasks (environment_id, created_at desc);
