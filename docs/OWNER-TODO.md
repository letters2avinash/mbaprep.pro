# Owner to-do list

Everything left that needs you. Items marked **blocked** cannot move without
your accounts, keys or decisions.

## Accounts and keys (blocked)

- [ ] **Supabase project** (Mumbai region). Copy the URL, anon key and service-role key into `private/config.env`. Apply the migrations in `supabase/migrations`, then `supabase/seed.sql`.
- [ ] **Supabase Auth settings:** enable Email, keep "Confirm email" on, set the Site URL.
- [ ] **Brevo** API key (email OTP and, if wanted, auth emails via SMTP).
- [ ] **MSG91** auth key and template ID (SMS OTP).
- [ ] **Google login:** create an OAuth client and enable the Google provider in Supabase.
- [ ] **Cashfree** sandbox app ID and secret. Keep `CASHFREE_ENV=sandbox` until payments are tested.
- [ ] **Anthropic** API key (or OpenRouter key), and the draft and review model names.
- [ ] **Sentry DSN** for server and browser (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`).
- [ ] **Webinar.gg** token, if the webinar feature is in scope.
- [ ] **GitHub:** the push access token is saved on this Mac. Create a new one when it expires.

## Decisions needed

- [ ] **Tutor dashboard:** which students a tutor can see. Right now tutors can see no student data (safe default). This needs a tutor-to-student link.
- [ ] **Exam patterns:** confirm section names, time limits, question counts, option counts, marks and negative marks for CAT, GMAT and XAT. Until then, `config/exam-patterns.json` is marked unverified and sections are not seeded.
- [ ] **Admin accounts:** confirm the list of admins and their sub-roles. Admins are set in SQL for now.
- [ ] **CSV publishing:** should an admin be allowed to upload questions straight to `published`? Currently yes, and the uploader becomes the reviewer.
- [ ] **Deployment:** approve the Vercel (or Cloudflare Pages) project, the Supabase production project, and the production release. Nothing is deployed.

## Old site (Hostinger)

- [ ] **Hostinger Trash:** `public_html` for mbaprep.pro is in the Trash (`.trash`). Empty it when you're happy with the backups. This is permanent.
- [ ] **`private/`** on the mbaprep.pro account: keep or delete.
- [ ] **Unassigned databases** `u719623742_5Yt3U` (37 MB) and `u719623742_yt1Mr` (6 MB): not linked to any website. Check whether they belong to another site before deleting.
- [ ] **Hosting plan:** the Business plan expires on 26 October 2026. Renew it only if the other sites on the account still need it.
- [ ] **Local backups** in `OLD WEBSITE DATA`: `_mbaprep.pro.zip` and `u719623742_mba_db.sql`. Keep them somewhere safe outside the project. Do not commit them.
- [ ] **Local stray file:** `OLD WEBSITE DATA/_mbaprep.pro (1).zip` (356 bytes), not yet checked.

## Built but not verified end to end (needs Supabase)

- [ ] Sign-up, email confirmation and sign-in against a real Supabase project.
- [ ] Admin CSV import with a real admin account.
- [ ] Review workflow: draft, reviewed, published moves (the database check passed; the page itself is untested).

## Not built yet

- [ ] Email OTP and SMS OTP flows.
- [ ] Google login screens.
- [ ] Exam player screens (scoring and section timers are done and tested).
- [ ] Attempt saving and grading through server actions.
- [ ] Cashfree checkout and webhook.
- [ ] Notes (PDF) and recorded video screens for students.
- [ ] Tutor dashboard.
- [ ] Admin screens for sections, topics and tests.
