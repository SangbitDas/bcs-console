-- BCS Console — schema migration: Phase 2 User Accounts & Cloud Sync
-- Profiles, User Bookmarks, Mistake Tracker, Exam Attempts & Performance Analytics
-- Strictly scoped to auth.users with Row Level Security (RLS) enabled.

-- 1. User Profiles (1:1 with auth.users) ----------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  email             text,
  avatar_url        text,
  target_bcs_batch  smallint default 51,
  phone             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: auto-create profile on auth.users insert (Google OAuth or email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Cloud Bookmarks (Multi-device bookmark sync) ------------------------------
create table if not exists public.user_bookmarks (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  question_id   bigint not null references public.questions (id) on delete cascade,
  custom_notes  text not null default '',
  created_at    timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.user_bookmarks enable row level security;

create index if not exists user_bookmarks_user_idx on public.user_bookmarks (user_id, created_at desc);
create index if not exists user_bookmarks_question_idx on public.user_bookmarks (question_id);

create policy "Users can view own bookmarks"
  on public.user_bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.user_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on public.user_bookmarks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.user_bookmarks for delete
  using (auth.uid() = user_id);

-- 3. Mistake Tracker & Revision Bank (Spaced Repetition) -----------------------
create table if not exists public.user_mistakes (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  question_id       bigint not null references public.questions (id) on delete cascade,
  wrong_count       int not null default 1,
  revision_count    int not null default 0,
  last_wrong_at     timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  is_resolved       boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.user_mistakes enable row level security;

create index if not exists user_mistakes_user_resolved_idx on public.user_mistakes (user_id, is_resolved, last_wrong_at desc);
create index if not exists user_mistakes_question_idx on public.user_mistakes (question_id);

create policy "Users can view own mistakes"
  on public.user_mistakes for select
  using (auth.uid() = user_id);

create policy "Users can insert own mistakes"
  on public.user_mistakes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own mistakes"
  on public.user_mistakes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own mistakes"
  on public.user_mistakes for delete
  using (auth.uid() = user_id);

-- 4. Exam Attempts (History, Mock Tests & Custom Exams) -------------------------
create table if not exists public.exam_attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  exam_type              text not null check (exam_type in ('mock', 'custom', 'exam', 'subject')),
  exam_slug              text references public.exams (slug) on delete set null,
  title                  text not null,
  total_questions        smallint not null,
  correct_count          smallint not null default 0,
  wrong_count            smallint not null default 0,
  unanswered_count       smallint not null default 0,
  negative_marking       numeric(3,2) not null default 0.50,
  marks_obtained         numeric(5,2) not null default 0.00,
  total_marks            smallint not null default 200,
  time_spent_seconds     int not null default 0,
  created_at             timestamptz not null default now()
);

alter table public.exam_attempts enable row level security;

create index if not exists exam_attempts_user_date_idx on public.exam_attempts (user_id, created_at desc);
create index if not exists exam_attempts_type_idx on public.exam_attempts (user_id, exam_type);

create policy "Users can view own attempts"
  on public.exam_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.exam_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own attempts"
  on public.exam_attempts for delete
  using (auth.uid() = user_id);

-- 5. Attempt Answers (Per-question audit & marking breakdown) -------------------
create table if not exists public.attempt_answers (
  id                  bigint generated always as identity primary key,
  attempt_id          uuid not null references public.exam_attempts (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  question_id         bigint not null references public.questions (id) on delete cascade,
  subject_id          smallint not null references public.subjects (id),
  user_answer         char(1) check (user_answer in ('A','B','C','D')),
  correct_answer      char(1) check (correct_answer in ('A','B','C','D')),
  is_correct          boolean not null default false,
  time_spent_seconds  smallint not null default 0,
  created_at          timestamptz not null default now()
);

alter table public.attempt_answers enable row level security;

create index if not exists attempt_answers_attempt_idx on public.attempt_answers (attempt_id);
create index if not exists attempt_answers_user_question_idx on public.attempt_answers (user_id, question_id);
create index if not exists attempt_answers_subject_idx on public.attempt_answers (user_id, subject_id);

create policy "Users can view own attempt answers"
  on public.attempt_answers for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempt answers"
  on public.attempt_answers for insert
  with check (auth.uid() = user_id);

-- 6. Subject Performance Analytics (Aggregated mastery tracker) -----------------
create table if not exists public.user_subject_performance (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  subject_id      smallint not null references public.subjects (id) on delete cascade,
  total_attempted int not null default 0,
  total_correct   int not null default 0,
  total_wrong     int not null default 0,
  accuracy_pct    numeric(5,2) generated always as (
                    case when total_attempted > 0
                      then round((total_correct::numeric / total_attempted::numeric) * 100, 2)
                      else 0
                    end
                  ) stored,
  updated_at      timestamptz not null default now(),
  unique (user_id, subject_id)
);

alter table public.user_subject_performance enable row level security;

create index if not exists user_subject_performance_user_idx on public.user_subject_performance (user_id, subject_id);

create policy "Users can view own performance"
  on public.user_subject_performance for select
  using (auth.uid() = user_id);

create policy "Users can insert own performance"
  on public.user_subject_performance for insert
  with check (auth.uid() = user_id);

create policy "Users can update own performance"
  on public.user_subject_performance for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
