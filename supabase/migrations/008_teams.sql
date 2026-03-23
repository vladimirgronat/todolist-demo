-- ============================================================
-- Migration 008: Teams — email lookup function + allow pending
-- invitees to see environments they are invited to
-- ============================================================

-- 1. DB function to look up a user ID by email
--    Uses SECURITY DEFINER so that auth.users is accessible
create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where email = lower(email_input) limit 1;
$$;

-- 2. Replace environments SELECT policy to include pending invitees
drop policy if exists "Members can view environment" on public.environments;

create policy "Members and invitees can view environment"
  on public.environments for select
  using (
    auth.uid() = owner_id
    or public.is_environment_member(id)
    or exists (
      select 1 from public.environment_members
      where environment_id = id
        and user_id = auth.uid()
    )
  );
