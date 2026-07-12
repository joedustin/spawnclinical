# SPAWN Clinical — working notes for Claude

## Deployment workflow (standing instruction)

**Always ship to `main` when work is complete and verified.** Vercel deploys the
production site (`spawnclinical.com`) from `main`, so changes only go live once
they land there.

Each time a task's changes are finished and verified:

1. Commit the work on the active feature branch and push it.
2. Fast-forward / merge that branch into `main` and push `main`
   (`git checkout -B main origin/main && git merge --ff-only <branch> && git push origin main`).
3. Do this automatically — the user has given standing permission to merge and
   deploy to `main`. No need to ask first or open a PR for routine changes.

Only hold off if the work is incomplete, failed verification, or the user asked
to stage it. When in doubt about something risky/irreversible, still confirm.

## Architecture (quick reference)

- Static HTML/CSS/JS frontend (no framework); each page is a standalone `.html`
  with its own inline `<style>`. The nav is duplicated across pages.
- Backend: Vercel serverless functions in `/api/*.js` (Node ESM).
- DB: Neon Postgres (`db/schema.sql`); AI via Anthropic proxy; leads via HubSpot.
- `vercel.json` rewrites map legacy `*.php` URLs to the `/api/*.js` functions, so
  the frontend keeps calling the original paths.
- DNS/hosting notes: `docs/DNS-CUTOVER.md` (domain is live on Vercel).
