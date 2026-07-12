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

This was migrated from a GoDaddy PHP/MySQL stack. The legacy `.php` backend and
MySQL `init*.sql` files have been removed; the Node functions in `/api/*.js`
replace them. `vercel.json` rewrites still map the old `*.php` URLs to the new
functions, so the frontend keeps calling the original paths unchanged.

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

Each contact is stamped with two custom contact properties:

- **`custom_source` = `"SPAWN Website"`** — the lead's origin.
- **`utm_campaign`** — the marketing campaign, read from the page's
  `?utm_campaign=` query string (default `41501340-SpawnClinical`).

**Create both custom properties in HubSpot first** (Settings → Properties →
Contact properties, single-line text). Until `utm_campaign` exists the API
would reject the write, so `hubspot-lead.js` retries without it — leads still
save, but the campaign value is dropped until you add the property.

Setting a property does **not** by itself add a contact to a HubSpot marketing
campaign — membership is derived from campaign *assets*. To attribute these
leads to campaign `41501340`: build a workflow (trigger *utm_campaign is
`41501340-SpawnClinical`*, or *custom_source is `SPAWN Website`*), then **add
that workflow as an asset of the campaign** so enrolled contacts are credited.

## Migration notes

- MySQL → Postgres: `AUTO_INCREMENT`→`SERIAL`, `ENUM`→`CHECK`, JSON `LONGTEXT`→`JSONB`.
- `spawn_data` is now `JSONB` (returned pre-parsed by the driver).
- PHP `mail()` → Resend HTTP API.
- The schema now lives in `db/schema.sql` (single-command variant:
  `db/schema.single.sql`); the old MySQL `api/init*.sql` files are gone.
- The legacy GoDaddy site can run in parallel until DNS cutover.
