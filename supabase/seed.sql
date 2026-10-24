-- Seed: exam catalogue only.
-- Sections, time limits, question counts and marking schemes are NOT seeded.
-- They are unverified until the owner confirms them, so admins enter them.
insert into public.exams (code, name, is_active) values
  ('MOCK-CAT', 'CAT', true),
  ('MOCK-GMAT', 'GMAT', true),
  ('MOCK-XAT', 'XAT', true)
on conflict (code) do nothing;
