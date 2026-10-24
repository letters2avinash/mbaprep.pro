-- Phase 1 core schema: exams, sections, topics, questions, profiles,
-- tests, attempts, purchases, notes and videos.
-- Row Level Security is set up in the next migration.

-- Shared helper: keeps updated_at current on writes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Exams (for example MOCK-CAT, MOCK-XAT, MOCK-GMAT).
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]+$'),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

-- Sections belong to one exam. Time limits, counts and marking live here
-- and come from config. Do not hardcode them.
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]+$'),
  name text not null,
  time_limit_minutes integer not null check (time_limit_minutes > 0),
  question_count integer not null check (question_count > 0),
  option_count integer not null check (option_count in (4, 5)),
  marking_scheme_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(marking_scheme_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, code),
  -- Lets questions prove their section belongs to their exam.
  unique (id, exam_id)
);

create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  name text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, name),
  -- Lets questions prove their topic belongs to their section.
  unique (id, section_id)
);

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

-- Profiles mirror auth.users. Rows are created by the trigger below.
-- Only the service role may change role or sub_role.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'tutor', 'admin')),
  sub_role text check (sub_role in ('content', 'website', 'academic', 'marketing', 'sales', 'accounts')),
  full_name text,
  country text,
  phone text,
  phone_verified boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sub_role_only_for_admin check (role = 'admin' or sub_role is null),
  constraint admin_needs_sub_role check (role <> 'admin' or sub_role is not null)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email_verified)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Questions. Only status = 'published' reaches students (enforced by RLS).
-- AI-drafted questions start as 'draft'.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_code text not null unique check (length(question_code) between 1 and 64),
  exam_id uuid not null references public.exams (id) on delete restrict,
  section_id uuid not null,
  topic_id uuid,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  option_count integer not null check (option_count in (4, 5)),
  stem text not null check (length(trim(stem)) > 0),
  options_json jsonb not null
    check (jsonb_typeof(options_json) = 'array' and jsonb_array_length(options_json) = option_count),
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D', 'E')),
  explanation text,
  marks numeric(6, 2) not null check (marks >= 0),
  -- Stored as a positive penalty magnitude. Scoring subtracts it.
  negative_marks numeric(6, 2) not null default 0 check (negative_marks >= 0),
  tags text[] not null default '{}',
  source text not null default 'csv_import' check (source in ('csv_import', 'ai_draft', 'manual')),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  created_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Correct option must exist for this question's option count (E needs 5).
  constraint correct_option_in_range check (ascii(correct_option) - 64 <= option_count),
  -- Reviewed or published questions must name a reviewer.
  constraint reviewer_required check (status = 'draft' or reviewed_by is not null),
  constraint section_belongs_to_exam foreign key (section_id, exam_id)
    references public.sections (id, exam_id) on delete restrict,
  constraint topic_belongs_to_section foreign key (topic_id, section_id)
    references public.topics (id, section_id) on delete set null (topic_id)
);

create index questions_exam_section_status_idx on public.questions (exam_id, section_id, status);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- Tests are ordered sets of questions for one exam.
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  is_published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tests_set_updated_at
  before update on public.tests
  for each row execute function public.set_updated_at();

-- Junction table: which questions a test contains, and in what order.
create table public.test_questions (
  test_id uuid not null references public.tests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position integer not null check (position > 0),
  primary key (test_id, question_id),
  unique (test_id, position)
);

-- One row per student attempt. Written only by server code (service role).
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_score numeric(8, 2),
  created_at timestamptz not null default now(),
  constraint submitted_at_matches_status check (
    (status = 'in_progress' and submitted_at is null)
    or (status <> 'in_progress' and submitted_at is not null)
  )
);

create index test_attempts_user_idx on public.test_attempts (user_id, test_id);

-- One row per answered question in an attempt. Written only by server code.
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  marks_awarded numeric(6, 2) not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- Payments through Cashfree. Written only by the payment webhook (service role).
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  exam_id uuid references public.exams (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  provider text not null default 'cashfree' check (provider = 'cashfree'),
  provider_order_id text unique,
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- LMS content. PDF notes point to a Storage path. Videos point to a URL.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  section_id uuid references public.sections (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  storage_path text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  section_id uuid references public.sections (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  url text not null check (url ~ '^https://'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();
