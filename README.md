# SPAWN Clinical

An AI eClinical satire site — static frontend + serverless backend.
Originally an April Fools' experiment (see `about.html`).

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Static HTML/CSS/JS (no framework) |
| Backend | Vercel Serverless Functions (Node.js, ESM) in `/api` |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| AI | Anthropic Claude API (server-side proxy) |
| Leads | HubSpot Contacts API v3 |
| Email | Resend (optional) |

This was migrated from a GoDaddy PHP/MySQL stack. The original `.php` files are
kept for reference but are **excluded from Vercel** via `.vercelignore`; the
Node functions in `/api/*.js` replace them, and `vercel.json` rewrites map the
old `*.php` URLs to the new functions so the frontend needed no changes.

## API Endpoints

| URL (frontend calls) | Function | Purpose |
|---|---|---|
| `/api/claude-proxy.php` → | `api/claude-proxy.js` | Spawn generation via Claude |
| `/api/chat-proxy.php` → | `api/chat-proxy.js` | Dusty chatbot (start/message/save_idea) |
| `/api/save-spawn.php` → | `api/save-spawn.js` | Save a spawn to the gallery |
| `/api/get-spawns.php` → | `api/get-spawns.js` | Paginated gallery listing |
| `/api/get-spawn.php` → | `api/get-spawn.js` | Single spawn by id |
| `/api/hubspot-lead.php` → | `api/hubspot-lead.js` | HubSpot lead capture |
| `/share.php` → | `api/share.js` | Rich Open Graph social previews |

## Deploy (first time)

1. **Push this repo to GitHub.**
2. **Vercel → New Project → import the repo.** Framework preset: **Other**.
3. **Add a Neon database:** Vercel → Storage → Create → Neon. This injects
   `DATABASE_URL` automatically.
4. **Create the schema:** open Neon's SQL Editor and run `db/schema.sql`.
5. **Set environment variables** (Vercel → Settings → Environment Variables) —
   see `.env.example`: `ANTHROPIC_API_KEY`, `HUBSPOT_TOKEN`, and optionally
   `RESEND_API_KEY` / `IDEA_NOTIFY_*`.
6. **Deploy.**

## HubSpot campaign association

`custom_source = "SPAWN Website"` is stamped on each contact. Create that
custom contact property in HubSpot, then build a workflow (trigger:
*custom_source is "SPAWN Website"*) to add contacts to the campaign.

## Migration notes

- MySQL → Postgres: `AUTO_INCREMENT`→`SERIAL`, `ENUM`→`CHECK`, JSON `LONGTEXT`→`JSONB`.
- `spawn_data` is now `JSONB` (returned pre-parsed by the driver).
- PHP `mail()` → Resend HTTP API.
- The legacy GoDaddy site can run in parallel until DNS cutover.
