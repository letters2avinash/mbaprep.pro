-- Row Level Security and grants for Phase 1.
--
-- Roles:
--   student  takes tests, sees published content only.
--   tutor    no access to tests, attempts, purchases or unpublished content.
--            Tutor dashboard data needs an owner decision (see README), so
--            tutors get no student data here.
--   admin    sub_role decides the area: content and academic manage the
--            question bank and tests; content also manages notes and videos;
--            accounts reads purchases.
--
-- Writes to attempts, answers and purchases happen only in server code
-- using the service role, after the server checks the caller's role.

-- Role helpers. security definer so policies can read profiles without
-- recursing into profiles' own RLS.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.app_sub_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.sub_role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.is_admin_for(allowed_sub_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.app_role() = 'admin' and public.app_sub_role() = any (allowed_sub_roles);
$$;

-- Keep phone_verified honest: changing the number clears the flag, unless
-- the same statement sets it (the verification flow does that).
create or replace function public.reset_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone and new.phone_verified = old.phone_verified then
    new.phone_verified = false;
  end if;
  return new;
end;
$$;

create trigger profiles_reset_phone_verification
  before update on public.profiles
  for each row execute function public.reset_phone_verification();

-- Mirror email confirmation from auth into profiles.
create or replace function public.sync_email_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_verified();

-- Start from zero: anon and authenticated get nothing unless granted below.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
grant all on all tables in schema public to service_role;

alter table public.exams enable row level security;
alter table public.sections enable row level security;
alter table public.topics enable row level security;
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.purchases enable row level security;
alter table public.notes enable row level security;
alter table public.videos enable row level security;

-- Exams, sections and topics: any signed-in user can read active catalogue
-- entries. Content and academic admins manage them.
grant select on public.exams, public.sections, public.topics to authenticated;
grant insert, update, delete on public.exams, public.sections, public.topics to authenticated;

create policy exams_read on public.exams for select to authenticated
  using (is_active or public.is_admin_for(array['content', 'academic']));
create policy exams_admin_write on public.exams for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

create policy sections_read on public.sections for select to authenticated
  using (
    public.is_admin_for(array['content', 'academic'])
    or (public.app_role() is not null and exists (
      select 1 from public.exams e where e.id = exam_id and e.is_active
    ))
  );
create policy sections_admin_write on public.sections for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

create policy topics_read on public.topics for select to authenticated
  using (
    public.is_admin_for(array['content', 'academic'])
    or (public.app_role() is not null and exists (
      select 1 from public.sections s
      join public.exams e on e.id = s.exam_id
      where s.id = section_id and e.is_active
    ))
  );
create policy topics_admin_write on public.topics for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

-- Profiles: users read and edit their own name, country and phone only.
-- Role, sub_role and verification flags are never granted to authenticated.
grant select on public.profiles to authenticated;
grant update (full_name, country, phone) on public.profiles to authenticated;

create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_read_admin on public.profiles for select to authenticated
  using (public.app_role() = 'admin');
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Questions. Students get published rows only, and only the columns they
-- need to sit a test. correct_option and explanation are NOT granted to
-- authenticated, so the answer key stays server-side. Admin reads of the key
-- go through server code with the service role.
grant select (
  id, question_code, exam_id, section_id, topic_id, difficulty, option_count,
  stem, options_json, marks, negative_marks, tags, source, status,
  created_at, updated_at
) on public.questions to authenticated;
grant insert, update, delete on public.questions to authenticated;

create policy questions_read_published on public.questions for select to authenticated
  using (status = 'published' and public.app_role() = 'student');
create policy questions_admin_read on public.questions for select to authenticated
  using (public.is_admin_for(array['content', 'academic']));
create policy questions_admin_write on public.questions for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

-- Tests and their question lists: published tests for students, full access
-- for content and academic admins.
grant select, insert, update, delete on public.tests, public.test_questions to authenticated;

create policy tests_read on public.tests for select to authenticated
  using ((is_published and public.app_role() = 'student')
    or public.is_admin_for(array['content', 'academic']));
create policy tests_admin_write on public.tests for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

create policy test_questions_read on public.test_questions for select to authenticated
  using (exists (
    select 1 from public.tests t
    where t.id = test_id
      and ((t.is_published and public.app_role() = 'student')
        or public.is_admin_for(array['content', 'academic']))
  ));
create policy test_questions_admin_write on public.test_questions for all to authenticated
  using (public.is_admin_for(array['content', 'academic']))
  with check (public.is_admin_for(array['content', 'academic']));

-- Attempts and answers: students read their own, admins read all.
-- No authenticated write grants. Server code writes these with the service role.
grant select on public.test_attempts, public.attempt_answers to authenticated;

create policy test_attempts_read_own on public.test_attempts for select to authenticated
  using (user_id = (select auth.uid()) and public.app_role() = 'student');
create policy test_attempts_read_admin on public.test_attempts for select to authenticated
  using (public.is_admin_for(array['content', 'academic']));

create policy attempt_answers_read_own on public.attempt_answers for select to authenticated
  using (exists (
    select 1 from public.test_attempts a
    where a.id = attempt_id and a.user_id = (select auth.uid()) and public.app_role() = 'student'
  ));
create policy attempt_answers_read_admin on public.attempt_answers for select to authenticated
  using (public.is_admin_for(array['content', 'academic']));

-- Purchases: users read their own. Accounts admins read all. Written by the
-- Cashfree webhook through the service role.
grant select on public.purchases to authenticated;

create policy purchases_read_own on public.purchases for select to authenticated
  using (user_id = (select auth.uid()));
create policy purchases_read_accounts on public.purchases for select to authenticated
  using (public.is_admin_for(array['accounts']));

-- LMS content: published items for students, full access for content admins.
grant select, insert, update, delete on public.notes, public.videos to authenticated;

create policy notes_read on public.notes for select to authenticated
  using ((is_published and public.app_role() = 'student')
    or public.is_admin_for(array['content']));
create policy notes_admin_write on public.notes for all to authenticated
  using (public.is_admin_for(array['content']))
  with check (public.is_admin_for(array['content']));

create policy videos_read on public.videos for select to authenticated
  using ((is_published and public.app_role() = 'student')
    or public.is_admin_for(array['content']));
create policy videos_admin_write on public.videos for all to authenticated
  using (public.is_admin_for(array['content']))
  with check (public.is_admin_for(array['content']));
