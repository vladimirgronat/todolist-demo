-- ============================================================
-- Migration 009: Auto-create Personal environment for new users
-- Adds trigger on auth.users + backfills existing users without environments
-- ============================================================

-- 1. Trigger function: create "Personal" environment on user signup
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

-- 2. Trigger on auth.users for future signups
drop trigger if exists on_auth_user_created_environment on auth.users;
create trigger on_auth_user_created_environment
  after insert on auth.users
  for each row
  execute function public.handle_new_user_environment();

-- 3. Backfill: create Personal environment for existing users who have none
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
