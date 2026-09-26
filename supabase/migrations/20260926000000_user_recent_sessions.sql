-- BCS Console - Phase 3: Cloud-synced Recent Practice Sessions with Pinning
-- Recents were previously on-device only (AsyncStorage / zustand persist).
-- This table makes them server-owned so signed-in users get cross-device sync.
-- Anonymous users keep the local store and merge it into the cloud on first login.

create table if not exists public.user_recent_sessions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  session_key     text not null,
  kind            text not null check (kind in ('practice','mock','custom')),
  label           text not null default '',
  total           smallint not null default 0,
  right_count     smallint not null default 0,
  wrong_count     smallint not null default 0,
  score           numeric(7,2),
  rerun           jsonb,
  mock_rerun      jsonb,
  done            jsonb,
  idx             int,
  completed       boolean not null default false,
  is_pinned       boolean not null default false,
  pinned_at       timestamptz,
  last_active_at  timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, session_key)
);

alter table public.user_recent_sessions enable row level security;

create index if not exists user_recent_sessions_user_pin_idx
  on public.user_recent_sessions (user_id, is_pinned desc, last_active_at desc);
create index if not exists user_recent_sessions_user_active_idx
  on public.user_recent_sessions (user_id, last_active_at desc);

drop policy if exists "Users can view own recent sessions" on public.user_recent_sessions;
create policy "Users can view own recent sessions"
  on public.user_recent_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recent sessions" on public.user_recent_sessions;
create policy "Users can insert own recent sessions"
  on public.user_recent_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recent sessions" on public.user_recent_sessions;
create policy "Users can update own recent sessions"
  on public.user_recent_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recent sessions" on public.user_recent_sessions;
create policy "Users can delete own recent sessions"
  on public.user_recent_sessions for delete
  using (auth.uid() = user_id);