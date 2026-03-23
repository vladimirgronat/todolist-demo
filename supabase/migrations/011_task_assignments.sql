-- ============================================================
-- Migration 011: Task assignments with accept/refuse workflow
-- ============================================================

alter table public.tasks
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists assignment_status text
    check (assignment_status in ('pending', 'accepted', 'refused')),
  add column if not exists refusal_reason text,
  add column if not exists assigned_at timestamptz;

alter table public.tasks
  add constraint tasks_assignment_pair_check
  check (
    (assigned_to is null and assignment_status is null and refusal_reason is null and assigned_at is null)
    or (assigned_to is not null and assignment_status is not null)
  );

alter table public.tasks
  add constraint tasks_refusal_reason_check
  check (
    (assignment_status = 'refused' and refusal_reason is not null and char_length(trim(refusal_reason)) between 1 and 500)
    or (assignment_status is distinct from 'refused' and refusal_reason is null)
    or assignment_status is null
  );

create index if not exists idx_tasks_env_assignment_status
  on public.tasks (environment_id, assignment_status, updated_at desc);

create index if not exists idx_tasks_assigned_to_status
  on public.tasks (assigned_to, assignment_status, updated_at desc);