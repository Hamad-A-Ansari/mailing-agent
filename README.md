# Switch FAANG

A personal job-search command center built with Next.js and Supabase. It manages recruiter contacts, sends and tracks personalized cold outreach, syncs replies from your inbox, follows up automatically, and includes a coding-interview practice module.

## What it does

- **Recruiter outreach** — maintain a contact database (recruiters, companies, roles), bulk-import contacts from CSV/XLSX, and send personalized emails from reusable templates with variable substitution.
- **Email sync & reply tracking** — reads your inbox over IMAP, threads replies to the right contact/application, and detects bounces and auto-replies so you don't chase dead leads.
- **Follow-ups** — schedules and sends automatic follow-up emails on a cadence, run via a GitHub Actions cron workflow.
- **Application tracking** — a kanban-style board for tracking job applications end-to-end.
- **Coding interview practice** — a problem list with an in-browser code editor (Monaco) and remote code execution via Judge0.
- **AI mock interviews** — voice-based mock interviews (Vapi) with AI-generated questions and feedback (Groq/Gemini).
- **Resume grading** — upload a resume and get AI-generated feedback against a target role.
- **Browser extension** — a companion Chrome extension (`extension/`) for saving LinkedIn job posts and recruiter profiles directly into the app.

## Architecture

- **Framework**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Auth & database**: Supabase (Postgres + Auth). Session handling lives in `src/middleware.ts` and `src/lib/supabase/`; `auth-client.ts` is the browser client, `auth-server.ts` is the cookie-aware server client used in server components and route handlers, and `server.ts` is the service-role client for privileged server-side operations.
- **Email**: `src/lib/email/` — `sender.ts` sends outreach via SMTP (Nodemailer, per-user credentials with an env-var fallback), `reader.ts`/`sync.ts` pull and thread replies over IMAP, `bounce-detector.ts` classifies bounces/auto-replies, and `template-engine.ts` handles variable substitution in templates.
- **Scheduled jobs**: `.github/workflows/cron-jobs.yml` hits `/api/cron/check-replies` and `/api/follow-ups/send` on a schedule, authenticated via a shared `CRON_SECRET`.
- **Database schema**: `supabase/migrations/` — sequential SQL migrations, applied via the Supabase CLI or dashboard.
- **UI**: shadcn-style components (`src/components/ui/`) built on Base UI primitives, with `react-hook-form` + `zod` for form validation across the app.

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An SMTP account for sending outreach (e.g. Gmail with an app password) and an IMAP-capable inbox for reply sync

### Setup

```bash
git clone <this-repo>
cd mailing-agent
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your own values (see [Environment variables](#environment-variables) below), then apply the database migrations in `supabase/migrations/` to your Supabase project (via the Supabase CLI, `supabase db push`, or by running them in order through the SQL editor).

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account at `/sign-up`, confirm your email, and you'll land on the dashboard.

### Build

```bash
npm run build
npm run start
```

### Lint / typecheck

```bash
npm run lint
npx tsc --noEmit
```

There is currently no automated test suite.

## Environment variables

See `.env.local.example` for the full list of variables this project reads, with notes on where to obtain each one. At a minimum you'll need Supabase project credentials, SMTP credentials, and an encryption key for storing per-user SMTP passwords. AI-interview and coding-practice features additionally require Vapi, Groq/Gemini, and Judge0 credentials — the app runs without them, but those features will be unavailable.

## Deploying

This project is set up to deploy on [Vercel](https://vercel.com). Set the same environment variables from `.env.local` in your Vercel project settings, and configure `CRON_SECRET` / `APP_URL` as GitHub Actions secrets so the scheduled workflow in `.github/workflows/cron-jobs.yml` can reach your deployed app.

Supabase Auth emails (sign-up confirmation, password reset) are sent through Supabase's own mail service by default, which is rate-limited and intended for development. For production use, configure a custom SMTP provider under Project Settings → Auth → SMTP Settings in your Supabase dashboard.
