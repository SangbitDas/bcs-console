-- BCS Console — schema migration 1/2
-- Subjects → Exams → Questions (+ normalized Question Images), FTS, RLS (public read-only).
-- Project: bcs-console (ap-south-1). Source: dataset/bcs_preliminary_question_bank.json
-- (41 exams, 5,350 questions, taxonomy IDs 1..10 fixed per dataset/topics_taxonomy.md).
--
-- Design note (AGENTS.md §4: normalized vs text[] vs JSONB):
--   Chose NORMALIZED question_images over text[]/JSONB because (a) each image maps
--   1:1 to a Supabase Storage object with its own public URL + cache headers,
--   (b) PostgREST can embed/filter per image_type (question|solve) without array
--   gymnastics, (c) orphan/9-skipped-file auditing is a plain anti-join.
--   The v_questions_with_images view below re-aggregates arrays so API consumers
--   still get the canonical JSON shape (question_image_paths/solve_note_image_paths).
--   correct_answer: NULL = the 8 intentionally-blank defective rows (never coalesce).

-- 0. Extensions ---------------------------------------------------------------
create schema if not exists extensions;  -- advisor: never install extensions in public
create extension if not exists pg_trgm with schema extensions;  -- fuzzy Bangla/English search (no 'bengali' TS config exists; FTS uses 'simple')

-- 1. Subjects (ground truth, 10 fixed rows) ------------------------------------
create table if not exists subjects (
  id          smallint primary key check (id between 1 and 10),
  subject_en  text not null,
  subject_bn  text not null
);

insert into subjects (id, subject_en, subject_bn) values
  (1,  'Bangla Language & Literature',                 'বাংলা ভাষা ও সাহিত্য'),
  (2,  'English Language & Literature',                'English Language & Literature'),
  (3,  'Bangladesh Affairs',                           'বাংলাদেশ বিষয়াবলি'),
  (4,  'International Affairs',                        'আন্তর্জাতিক বিষয়াবলি'),
  (5,  'Geography, Environment & Disaster Management', 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা'),
  (6,  'General Science',                              'সাধারণ বিজ্ঞান'),
  (7,  'Computer & Information Technology',            'কম্পিউটার ও তথ্যপ্রযুক্তি'),
  (8,  'Mathematical Reasoning',                       'গাণিতিক যুক্তি'),
  (9,  'Mental Ability',                               'মানসিক দক্ষতা'),
  (10, 'Ethics, Values & Good Governance',             'নৈতিকতা, মূল্যবোধ ও সুশাসন')
on conflict (id) do update set
  subject_en = excluded.subject_en,
  subject_bn = excluded.subject_bn;

-- 2. Exams (slug PK = dataset exam_slug, e.g. '17th_bcs') -----------------------
create table if not exists exams (
  slug            text primary key check (slug ~ '^\d+(st|nd|rd|th)_bcs$'),
  title           text not null,                       -- JSON: exam.title  ("17th BCS")
  exam_date       date,                                -- JSON: exam.date   (YYYY-MM-DD)
  total_marks     smallint,                            -- JSON: exam.total_marks (50/100/200 per era)
  set_code        text not null default '',            -- JSON: exam.set_code (Bengali, e.g. "পদ্ম")
  total_questions smallint not null,                   -- JSON: exam.total_questions == len(questions)
  created_at      timestamptz not null default now()
);

-- 3. Questions -----------------------------------------------------------------
create table if not exists questions (
  id                   bigint generated always as identity primary key,
  exam_slug            text not null references exams (slug) on delete cascade,  -- JSON: exam_slug (denorm FK)
  question_number      smallint not null check (question_number >= 1),            -- JSON: question_number
  subject_id           smallint not null references subjects (id),                -- JSON: subject_id
  question             text not null default '',                                  -- JSON: question ('' only if q-images exist)
  option_a             text not null default '',                                  -- JSON: option_a..d
  option_b             text not null default '',
  option_c             text not null default '',
  option_d             text not null default '',
  correct_answer       char(1) check (correct_answer in ('A','B','C','D')),       -- JSON: correct_answer; NULL = blank defective row
  solve_note           text not null default '',                                  -- JSON: solve_note ('' only if solve-images exist)
  has_question_image   boolean not null default false,                            -- JSON: has_question_image (seed-validated vs arrays)
  has_solve_note_image boolean not null default false,                            -- JSON: has_solve_note_image
  has_image            boolean generated always as (has_question_image or has_solve_note_image) stored,  -- JSON: has_image
  search_vector        tsvector generated always as (
                         to_tsvector('simple',
                           coalesce(question,'') || ' ' || coalesce(option_a,'') || ' ' ||
                           coalesce(option_b,'') || ' ' || coalesce(option_c,'') || ' ' ||
                           coalesce(option_d,'') || ' ' || coalesce(solve_note,''))) stored,
  created_at           timestamptz not null default now(),
  unique (exam_slug, question_number)
);

create index if not exists questions_exam_subject_idx on questions (exam_slug, subject_id);
create index if not exists questions_has_image_idx   on questions (has_image) where has_image;
create index if not exists questions_correct_idx     on questions (correct_answer);
create index if not exists questions_fts_idx         on questions using gin (search_vector);
create index if not exists questions_trgm_idx        on questions using gin (question gin_trgm_ops);

-- 4. Question images (1 row per Storage object) ---------------------------------
create table if not exists question_images (
  id           bigint generated always as identity primary key,
  question_id  bigint not null references questions (id) on delete cascade,
  image_type   text not null check (image_type in ('question','solve')),  -- question_image_paths vs solve_note_image_paths
  storage_path text not null,  -- bucket key, 1:1 with local path, e.g. images/10th_bcs/q6_img1.jpg
  public_url   text not null,  -- https://<ref>.supabase.co/storage/v1/object/public/bcs-images/<storage_path>
  created_at   timestamptz not null default now(),
  unique (question_id, storage_path)
);

create index if not exists question_images_question_idx on question_images (question_id);
create index if not exists question_images_path_idx     on question_images (storage_path);

-- 5. Convenience view: canonical JSON shape per question ------------------------
-- WITH (security_invoker = true): view enforces the querying user's permissions
-- and RLS (not the owner's). Required on PG15+; fixes the SECURITY DEFINER advisor.
create or replace view v_questions_with_images with (security_invoker = true) as
select
  q.id, q.exam_slug, q.question_number, q.subject_id,
  s.subject_en, s.subject_bn,
  q.question, q.option_a, q.option_b, q.option_c, q.option_d,
  q.correct_answer, q.solve_note,
  q.has_question_image, q.has_solve_note_image, q.has_image,
  coalesce(array_agg(i.storage_path order by i.storage_path) filter (where i.image_type = 'question'), '{}') as question_image_paths,
  coalesce(array_agg(i.storage_path order by i.storage_path) filter (where i.image_type = 'solve'),    '{}') as solve_note_image_paths,
  coalesce(array_agg(i.public_url   order by i.storage_path) filter (where i.image_type = 'question'), '{}') as question_image_urls,
  coalesce(array_agg(i.public_url   order by i.storage_path) filter (where i.image_type = 'solve'),    '{}') as solve_note_image_urls
from questions q
join subjects s on s.id = q.subject_id
left join question_images i on i.question_id = q.id
group by q.id, s.subject_en, s.subject_bn;

-- 6. RLS: public read-only; writes service_role only (bypasses RLS) -------------
alter table subjects         enable row level security;
alter table exams            enable row level security;
alter table questions        enable row level security;
alter table question_images  enable row level security;

drop policy if exists "public read subjects"        on subjects;
drop policy if exists "public read exams"           on exams;
drop policy if exists "public read questions"       on questions;
drop policy if exists "public read question_images" on question_images;

create policy "public read subjects"        on subjects        for select to anon, authenticated using (true);
create policy "public read exams"           on exams           for select to anon, authenticated using (true);
create policy "public read questions"       on questions       for select to anon, authenticated using (true);
create policy "public read question_images" on question_images for select to anon, authenticated using (true);
-- NOTE: no INSERT/UPDATE/DELETE policies → only service_role (bypasses RLS) can write.
-- Future user tables (bookmarks/progress) get per-user (auth.uid()) policies.
