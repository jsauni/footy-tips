# Footy Tips

A mobile-first rugby league tipping web app. Players sign in with an emailed one-time code, tip every game each round, and compete on a public ladder and in private invite-only competitions. Private comps can optionally track a buy-in (winner takes all). The app **never handles money**; see [Buy-ins](#buy-ins).

- **Web:** Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4
- **Backend:** Supabase: Postgres with row-level security, Auth (email OTP)
- **Hosting:** any Next.js host (Vercel is the simplest)

## Features

| | |
|---|---|
| Sign-in | Email + 6-digit code. No passwords. New emails create an account. |
| Tipping | Tap a team to tip; saves instantly. Each game locks at its own kick-off, enforced in the database. |
| Margin tiebreaker | First game of each round. Error = \|your margin − actual\|; missing = +50. |
| Public ladder | Everyone who plays. |
| Private comps | Create, share an invite link/code (native share sheet on phones), comp ladder. |
| Buy-ins (optional) | $1–$500, fixed at creation, 18+ confirmation to create/join. Members pay the organiser's PayID with a personal reference (`TIPS-XXXX`) and tap "I've paid". The organiser confirms when it lands (or marks cash payments). Reminder banners for unpaid members and pending confirmations. At season end it shows the winner(s) and split, and the organiser records the payout. Only confirmed-paid members can win. |
| Fixtures & results | Entered by admins in `/admin`: add games, fix times/teams/venues, enter scores. Ladders are computed on read, so a saved result re-scores everyone instantly. |
| Moderation | Offensive and staff-like names are blocked for tipping names and comp names. Admins can search players, rename them, and remove them (optionally blocking the email from signing up again) in `/admin/players`. |
| Account deletion | Self-service at **Me → Delete my account**. Documented in the Privacy Policy and Rules. |
| Legal | Public `/terms`, `/privacy`, `/disclaimer` and `/rules` pages, linked from sign-in and the Me page. |
| Privacy | Others' tips become visible only after kick-off. Emails are never shown to other players. |

## Local development

Requires Node 24, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start          # local Postgres/Auth on ports 553xx; applies migrations + seed
```

Create `.env.development.local` using the values printed by `supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase status>
```

```bash
npm run dev             # http://localhost:3000
```

Sign-in emails are caught locally by Mailpit at http://127.0.0.1:55324. The seed adds three **demo** rounds of season 2027 dated relative to now (round 1 finished, round 2 open).

Make yourself an admin (local or production SQL editor):

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

`supabase db reset` rebuilds the local database from scratch.

## Tests and CI

End-to-end tests live in [tests/](tests/) and run against the local Supabase stack and a running copy of the app:

| Suite | What it covers |
|---|---|
| `db` | Auth, RLS, tip lockout, scoring and tiebreaks, comps, buy-in payments, name filter, blocked emails, admin-only functions, account deletion |
| `web` | Redirects, public pages (rules, terms, privacy, disclaimer, icons), signed-in pages, admin pages hidden from non-admins |
| `ui` | A phone-sized Chrome session: sign-up and onboarding, tipping, buy-in comp from both sides, admin adding a game and entering a result, renaming and removing players, payout, account deletion |

```bash
supabase db reset                       # the UI suite completes the demo season, so reset between runs
npm run dev                             # in another terminal
APP_URL=http://localhost:3000 npm run test:e2e        # or: npm run test:e2e -- db web
```

The tests refuse to run unless Supabase is on localhost. The UI suite uses your installed Google Chrome. Set `SCREENSHOTS=some/dir` to save screenshots.

[GitHub Actions](.github/workflows/ci.yml) runs on every pull request and push to `main`:

- **Lint, types, build:** `npm run lint`, `npm run typecheck`, `npm run build`
- **End-to-end tests:** starts local Supabase in Docker on the runner, builds and starts the app, runs `npm run test:e2e`. On failure, the app log and screenshots are uploaded as an artifact.

## Production setup

1. **Create a Supabase project** (Sydney region), then push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   This also loads the 18 teams. Don't run `seed.sql` in production: it holds demo fixtures. If the project still has tables from the old Expo app, use a fresh project or drop them first.
2. **Auth → Email templates:** set both *Magic Link* and *Confirm signup* to show `{{ .Token }}` (see [supabase/templates/otp.html](supabase/templates/otp.html)). Without this, users get a link instead of a code.
3. **Auth → SMTP:** configure a real SMTP provider (Resend, Postmark, SES…). Supabase's built-in mailer is heavily rate-limited and not meant for production. Set the email OTP length to 6.
4. **Auth → URL configuration:** set the Site URL to your domain.
5. **Deploy** to Vercel with these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used for account deletion and admin rename/remove)
   - Optional, for error reporting: `NEXT_PUBLIC_SENTRY_DSN`, plus `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` for readable stack traces. See [Error reporting](#error-reporting-sentry).
6. **Fill in [src/lib/site.ts](src/lib/site.ts)** (operator name, contact email, governing state, email provider) and have the legal pages reviewed. See [Legal pages](#legal-pages).
7. **Make yourself an admin** (SQL above) and add the season's games in `/admin`.

## Fixtures and results

Admins manage everything in `/admin`:

- **Add games:** pick a season and round (or **+ Round N** for a new one), then **Add a game**: teams, kick-off (entered in your own time zone), venue and an optional round name such as *Finals Week 1*. The form keeps the season, round and date so you can enter a whole round quickly.
- **Enter results:** type both scores, set the status to **Full time** and press **Save result**. Ladders re-score straight away.
- **Fix mistakes:** **Edit game details** changes the time, teams, round or venue. Tips lock at the stored kick-off time, so update it if a game moves. If you change a team, tips on the team that's no longer playing are removed and those players can tip again before kick-off. **Delete game** removes it and its tips.
- **Postponed:** set the status to *Postponed* and it isn't scored or used as the margin game.

There's no automatic data feed or scheduled job. Results appear as soon as an admin saves them.

## Moderation

- **Name filter:** [`display_name_problem()`](supabase/migrations/20261122000300_moderation.sql) checks tipping names and competition names. It catches leetspeak (`sh1t`), spaced-out letters (`f u c k`) and repeated letters. Ambiguous short words only match as whole words, so names like Hancock, Dickson or Cassidy pass. Names that look like staff (Admin, Moderator, Official, NRL…) are reserved. It's enforced in the database (a trigger on `auth.users` and on `competitions`), and the app checks first to show a friendly message. To add words, change the arrays in a new migration.
- **Players (`/admin/players`):** search by name or email, **Rename**, or **Remove**. Removing deletes the account, tips and memberships, and any comps that player ran (the admin is warned if others are in them). Tick **Block this email** to stop it signing up again. Blocked addresses are stored normalised (lower case, `+tag` removed) in `private.blocked_emails`, and can be unblocked on the same page. Admins can't remove themselves or other admins.

## Error reporting (Sentry)

Crashes in the browser and on the server (pages, server actions, the proxy) are reported to [Sentry](https://sentry.io). The free Developer plan is enough for this app. Sentry is **off** unless `NEXT_PUBLIC_SENTRY_DSN` is set, so local dev, CI and the tests never send anything.

**Setup:**

1. Create a Sentry account and a **Next.js** project. Copy its DSN (Project settings → Client Keys).
2. In Vercel, set `NEXT_PUBLIC_SENTRY_DSN` for Production (and Preview if you want those errors too).
3. For readable stack traces, also set `SENTRY_ORG` and `SENTRY_PROJECT` (the slugs in your Sentry URL), and `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens, an organisation token). The build then uploads source maps and deletes them from the deployed output.
4. Redeploy. Errors show up tagged with the Vercel environment.

**How it's wired:**

- [src/lib/sentry.ts](src/lib/sentry.ts): shared settings. It turns off everything the SDK would otherwise collect about people (IP address, cookies, headers, request bodies, query strings, local variables) and replaces email addresses with `[email]` in anything that's sent. There's no session replay, and performance tracing is off unless you set `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.
- [src/instrumentation.ts](src/instrumentation.ts) (server, via `onRequestError`), [src/instrumentation-client.ts](src/instrumentation-client.ts) (browser) and [src/app/global-error.tsx](src/app/global-error.tsx) (root-layout crash screen).
- Browser reports go to `/monitoring` on your own domain, so ad blockers don't drop them. [src/app/sentry-tunnel/route.ts](src/app/sentry-tunnel/route.ts) forwards just the event to Sentry. The path is excluded from the sign-in redirect in `src/proxy.ts`.
- Sentry is listed as a service provider in the Privacy Policy. If you turn on session replay or send user details, update that section first.

## Account deletion

**Me → Delete my account** ([src/app/(app)/me/delete/](src/app/(app)/me/delete/)) explains what's deleted, asks the user to type DELETE, and deletes the auth user via the service-role key. Everything else cascades: profile, tips, memberships, payment records and comps they ran alone. Users who run a comp with other players must delete it first. Users who paid a buy-in are warned that the app can't refund money. Users who can't sign in can email the contact address in the Privacy Policy.

## Legal pages

[`/terms`](src/app/terms/page.tsx), [`/privacy`](src/app/privacy/page.tsx), [`/disclaimer`](src/app/disclaimer/page.tsx) and [`/rules`](src/app/rules/page.tsx) are public. Before launch:

- Replace the `[placeholders]` in [src/lib/site.ts](src/lib/site.ts). They appear on the live pages until you do.
- Have a lawyer review the pages, especially the buy-in terms and liability clause. They're a plain-English starting point written for this app, not legal advice.
- Update `legalUpdated` whenever the pages change.

## Icons

`public/icon.svg` is the source. `npm run icons` renders the iOS home-screen icon (`src/app/apple-icon.png`, 180×180) and the Android/PWA icons in `public/` with Chrome.

## Project layout

```
src/
  proxy.ts                    session refresh + auth/onboarding redirects
  app/
    login/, onboarding/       email OTP sign-in, choose tipping name
    rules/, terms/, privacy/, disclaimer/   public pages
    (app)/page.tsx            tipping (round picker, auto-save, margin game)
    (app)/ladder/             public ladder
    (app)/comps/              list, create, detail (ladder, payments, payout, invite)
    (app)/join/[code]/        invite landing page
    (app)/me/                 profile; me/delete = account deletion
    (app)/admin/              fixtures & results; admin/players = moderation
  lib/
    data.ts                   server-side reads (data access layer)
    actions.ts                server actions (comps, payments, fixtures, players, account)
    site.ts                   operator details for the legal pages
    sentry.ts                 error reporting settings (privacy filters)
  instrumentation.ts, instrumentation-client.ts   Sentry start-up (server, browser)
    supabase/                 browser, server and service-role (admin) clients
supabase/
  migrations/                 schema, RLS, scoring, teams, payments, moderation
  seed.sql                    demo fixtures (local only)
tests/                        end-to-end suites (npm run test:e2e)
scripts/make-icons.mjs        PNG icons from icon.svg
.github/workflows/ci.yml      GitHub Actions
```

Security lives in the database: RLS policies plus triggers enforce tip lockout, valid teams, own-row writes, member-only comp visibility, organiser-only payment confirmation, a buy-in that can't change after creation, admin-only fixtures, the name filter and blocked emails.

## Buy-ins

The design choices behind buy-ins are deliberate legal risk controls. Don't remove them without advice:

- The app never collects, holds, transfers or takes a cut of money. Players pay the organiser directly; the app only records claims and confirmations. Payment status changes go through `claim_payment()` (member) and `set_payment_status()` (organiser only).
- Comps are invite-only (no public listing), and 100% of buy-ins go to the winner.
- 18+ confirmation is required, the buy-in is capped at $500, and the amount can't change after people join.
- The organiser accepts those terms when creating the comp. Players see a disclaimer and the gambling helpline.
- No affiliation with the NRL or clubs is claimed, and no official logos are used (badges are colour + abbreviation).

## Not built yet / next steps

- Showing mates' tips per round inside a comp (RLS already allows reading tips after kick-off)
- Email/push reminders before lockout and for unpaid buy-ins (currently in-app banners only)
- The ladder is computed per request. Fine for thousands of players; add a materialised view or a cache if it grows large.
