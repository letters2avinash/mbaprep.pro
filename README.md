# mbaprep-v2

MBAPrep.pro rebuild, Phase 1 (launch scope).

- Exams: CAT, GMAT, XAT (other exams out of scope for now)
- Accounts: email + password, Google login, OTP verification (email via Brevo, SMS via MSG91)
- Question bank: CSV upload only (no in-app builder)
- Exam player: one player, configured per exam
- Roles: student, tutor (view-only), admin (sub-roles: content, website, academic, marketing, sales, accounts)
- Payments: Cashfree
- Stack: Next.js (TypeScript, App Router, Tailwind) as a PWA, Supabase (Postgres, Auth, Storage, Mumbai region), Sentry

The old PHP site is retired. Nothing from the old codebase is used here.

## Setup

Requirements: Node.js 20.9 or newer (Next.js 16 needs it), npm, and the Supabase CLI for migrations.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local secrets file:

   ```bash
   cp private/config.example.env private/config.env
   ```

   Fill in real values in `private/config.env`. This file is git-ignored. Never print secret values in logs or commit them. Keys are read from the server environment only, never sent to the browser unless prefixed `NEXT_PUBLIC_`.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Check the code:

   ```bash
   npm run lint
   npm run build
   ```

## Database (Supabase)

Migrations live in `supabase/migrations`. Apply them to a local or development project:

```bash
npx supabase link --project-ref <dev-project-ref>
npx supabase db push
```

Do not run `db push` against production without owner approval.

## Question bank CSV

- Templates: `templates/questions_template.csv`
- Column reference and allowed values: `templates/README.md`
- Admin upload page validates every row before writing. Import runs in one transaction per file. A duplicate `question_code` rejects that row.

## Content rules

- Every question has a status: `draft`, `reviewed`, or `published`. Only `published` questions reach students. AI-drafted questions start as `draft`.
- Exam patterns, marks, negative marks, and pricing are marked `unverified` in config until the owner confirms them. Do not present them as verified.
- Tutor restrictions are enforced by Supabase Row Level Security and server checks, not by hiding UI.

## Deployment (not yet approved)

Nothing has been deployed. The owner must approve each step below.

1. Create a Supabase project in the Mumbai region. Apply migrations.
2. Create a Vercel (or Cloudflare Pages) project linked to this repository.
3. Add every key from `private/config.example.env` as an environment variable in the host's dashboard. Do not commit values.
4. Set `CASHFREE_ENV` to `sandbox` until payment flows are tested end to end.
5. Connect the Sentry project using `SENTRY_DSN`.
6. Deploy a preview build first. Promote to production only after the owner approves.
