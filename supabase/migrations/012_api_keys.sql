-- ============================================================
-- Migration 012: API Keys — table, RLS, verification function
-- ============================================================

-- 1. Create api_keys table
create table if not exists public.api_keys (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null check (char_length(name) <= 100),
  key_hash    text        not null,
  key_prefix  text        not null,
  last_used_at timestamptz null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz null
);

-- 2. Indexes
create unique index if not exists idx_api_keys_key_hash
  on public.api_keys (key_hash);

create index if not exists idx_api_keys_user_id
  on public.api_keys (user_id);

-- 3. Row Level Security
alter table public.api_keys enable row level security;

create policy "Users can view own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can create own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

-- No DELETE policy — revocation uses soft-delete via revoked_at

-- 4. Verification function: look up user_id by key_hash, update last_used_at
create or replace function public.verify_api_key(p_key_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  update public.api_keys
    set last_used_at = now()
    where key_hash = p_key_hash
      and revoked_at is null
  returning user_id into v_user_id;

  return v_user_id;
end;
$$;
