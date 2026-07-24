# Codex session handoff

Updated: 2026-07-24

## Current uncommitted milestone

A later task implemented the Public Landing → Personal Practice App Shell route
separation on top of commit `5d2d2d8`. At the time of this update it had not
been committed, pushed, or deployed.

New canonical routes:

- `/` — short public landing only;
- `/today` — guest/authenticated practice-first home;
- `/journey` — seven-day plan;
- `/progress` — progress and mastery;
- `/profile` — account, sync, and privacy.

The four app routes share a route-aware desktop/mobile navigation shell.
Authentication started from `/` returns to `/today`; authentication started
inside a canonical app route returns to that same route. Invalid `next` values
fall back to `/today`.

## Product and repository

- Product: EQ Dev — daily communication practice and Personal Practice pilot.
- Repository: `lchuka1619/eq-dev`
- Local workspace: `C:\Projects\eq-dev`
- Production: `https://eq-dev-xi.vercel.app`
- Supabase project ref: `lgcrhhmlxdtkomcakwwc`
- Framework: Next.js-compatible app running through vinext/Vite.
- Persistence is offline-first: local storage protects practice progress; Supabase is the account sync layer.

## Current Git state

- Working branch: `agent/connected-rehearsal-auth`
- Latest commit: `5d2d2d8 Add connected rehearsal and harden auth callback`
- Draft PR: `https://github.com/lchuka1619/eq-dev/pull/1`
- PR base: `main`
- Do not assume the draft PR is merged. Check GitHub and `git status -sb` at the start of a new session.

This handoff file was created after commit `5d2d2d8` and may be uncommitted until explicitly published.

## Implemented milestones

### Sprint 5

- Supabase Google OAuth and email magic link.
- Local progress remains available without login.
- Cloud hydration and local-to-cloud progress merge.
- User-owned rows are protected with RLS.

### Sprint 6

- Onboarding and personalized seven-day plan.
- Today exercise integration.
- Repeating practice on the same date does not artificially increment day/streak progress.

### Personal Practice pilot

- Organization ideation/event pilot.
- Past Event Repair with fact versus general conclusion.
- Guided and Prompted controlled variations.
- Seeded deterministic variation engine.
- Progression uses repeated performance evidence, not one self-rating.
- Static fallback content when AI is unavailable.
- Optional real-life bridge.
- Day 7 Connected Rehearsal:
  - seven decision moments;
  - ten-minute cap;
  - pause/resume;
  - recovery phrase;
  - safe finish;
  - local restore and cloud hydration.
- Exact connected-rehearsal responses remain local-only.

## Database

Applied migrations include:

- `20260722000000_auth_and_cloud_progress.sql`
- Personal Practice migrations from earlier milestones.
- `20260724030000_bridge_connected_rehearsal.sql`

The latest migration creates:

- `real_life_bridges`
- `connected_rehearsals`

It has been applied to the linked remote Supabase database. A later dry-run reported the remote database up to date.

Two-user integration testing confirmed that RLS prevents one authenticated user from reading another user's Personal Practice, bridge, route, and connected-rehearsal records.

## Authentication diagnosis

Google and Email providers were confirmed enabled through the Supabase Auth settings endpoint. Local environment variables point to the expected project and include a browser-safe publishable key.

Google Cloud's authorized OAuth redirect URI must remain:

`https://lgcrhhmlxdtkomcakwwc.supabase.co/auth/v1/callback`

Supabase Authentication → URL Configuration must use:

- Site URL: `https://eq-dev-xi.vercel.app`
- Redirect URL: `https://eq-dev-xi.vercel.app/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`

If the production callback is missing from the Supabase allow-list, Supabase ignores the application's `redirectTo` and falls back to its Site URL. This previously caused Vercel login to return to `http://localhost:3000`.

The application now routes an OAuth code accidentally returned to `/` through `/auth/callback` and displays a useful session-exchange error.

Successful login intentionally remains on the same landing/practice page. Confirm success using the header:

- profile initial/avatar visible: authenticated;
- `Ахицаа cloud-д хадгалах` still visible: no authenticated session.

There is no separate authenticated dashboard yet.

## Validation at commit 5d2d2d8

- TypeScript: passed.
- ESLint: passed.
- Unit tests: 15 passed.
- vinext production build: passed.
- Rendered HTML smoke test: passed.
- Mobile E2E: passed.
- Supabase two-user RLS integration test: passed.

The E2E covers:

- Guided repetitions progressing to Prompted;
- mobile layout;
- real-life bridge reflection;
- Day 7 pause/resume and recovery;
- all seven connected moments;
- plan completion;
- OAuth code fallback and error cleanup.

## Important files

- `components/auth/auth-provider.tsx`
- `components/auth/auth-modal.tsx`
- `app/auth/callback/route.ts`
- `components/personal-practice/personal-practice-pilot.tsx`
- `components/personal-practice/connected-rehearsal.tsx`
- `lib/personal-practice/variation-engine.ts`
- `lib/personal-practice/connected-rehearsal.ts`
- `lib/personal-practice/cloud-practice.ts`
- `lib/personal-practice/persistence.ts`
- `lib/plan/learning-plan.ts`
- `supabase/migrations/20260724030000_bridge_connected_rehearsal.sql`
- `docs/implementation/SUPABASE_AUTH_SETUP.md`

## Environment and secrets

- `.env.local` contains real local credentials and must never be printed or committed.
- `.env.example` contains placeholders only.
- Never expose Supabase service-role, secret, JWT secret, database password, Gemini key, or connection strings through `NEXT_PUBLIC_` variables.
- Audio, transcripts, and exact rehearsal responses should not be uploaded to the cloud by default.

## Next recommended milestone

First verify production authentication after the Supabase URL Configuration changes:

1. Sign out or use a private window.
2. Open `https://eq-dev-xi.vercel.app`.
3. Sign in with Google.
4. Confirm the URL returns to the Vercel domain without `code` or `auth_error`.
5. Confirm the header shows a profile initial instead of the cloud-save button.
6. Complete a small practice and verify cloud sync.
7. Refresh and verify the authenticated session and progress hydrate.

After authentication is confirmed, the next small UX milestone is an authenticated home/progress state or automatic focus/scroll to today's practice after login. A separate dashboard should only be added after agreeing on its scope.

## New-session startup checklist

At the beginning of the next Codex session:

1. Read this file and the three primary product/implementation documents in `docs/`.
2. Run `git status -sb`, `git log -3 --oneline`, and inspect PR #1.
3. Preserve unrelated or uncommitted user changes.
4. Check whether PR #1 was merged before creating more branches.
5. Verify production auth before changing the architecture again.
6. Run proportional tests before commit/push.
