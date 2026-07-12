# DNS Cutover — point spawnclinical.com at Vercel

Steps to move `spawnclinical.com` from the legacy GoDaddy site to the new
Vercel deployment, editing DNS at GoDaddy.

> **Status: LIVE.** As of the last check, `spawnclinical.com` already resolves
> to Vercel and serves the deployment with a valid TLS cert — apex
> `A → 216.198.79.1`, `www` CNAME → a Vercel project target
> (`*.vercel-dns-NNN.com`), apex redirects to `www`, MX + SPF intact. GoDaddy
> still holds the nameservers (`nsNN.domaincontrol.com`). The steps below are
> retained for reference / rollback / re-setup.

> **Golden rule:** whatever records Vercel's dashboard shows for your domain are
> authoritative. Vercel can assign a project-specific apex IP that differs from
> the generic values below — always prefer the dashboard values.

## 0. Pre-flight (before touching DNS)

Verify the Vercel deployment works end-to-end on its `*.vercel.app` URL first —
DNS cutover only changes *where* the domain points, not whether the app works:

- [ ] All env vars set in Vercel (Settings → Environment Variables):
      `ANTHROPIC_API_KEY`, `DATABASE_URL` (auto-injected by the Neon
      integration), `HUBSPOT_TOKEN`, and optionally `RESEND_API_KEY` /
      `IDEA_NOTIFY_TO` / `IDEA_NOTIFY_FROM`.
- [ ] Neon schema created — run `db/schema.sql` in Neon's SQL Editor.
- [ ] Smoke-test on the `*.vercel.app` URL: generate a spawn, save it, load the
      gallery, open the Dusty chatbot, and check a `/share?id=N` preview.
- [ ] **Rotate secrets** — the Anthropic + HubSpot keys were hardcoded in the
      old PHP on GoDaddy (see `.env.example`). Rotate them before go-live.

## 1. Add the domain in Vercel

1. Vercel → your Project → **Settings → Domains**.
2. Add **both** `spawnclinical.com` and `www.spawnclinical.com`.
3. Vercel shows the exact DNS records to set and marks them "Invalid
   Configuration" until DNS matches. Pick a primary (e.g. apex) and let the
   other redirect.

## 2. Edit DNS at GoDaddy

GoDaddy → **Domain Portfolio → spawnclinical.com → DNS → Manage DNS**.

Target state:

| Type    | Name  | Value                          | TTL |
| ------- | ----- | ------------------------------ | --- |
| `A`     | `@`   | `216.198.79.1` *(current Vercel apex IP — or whatever Vercel shows)* | 600 |
| `CNAME` | `www` | `cname.vercel-dns.com` *(or the project-specific `*.vercel-dns-NNN.com` Vercel assigns)* | 600 |

- **Edit** the existing `@` A record (GoDaddy ships a parked one) — don't add a
  second. GoDaddy can't put a CNAME on the apex, so the root uses an A record.
- **Edit** the existing `www` CNAME to `cname.vercel-dns.com`.
- **Delete** any conflicting `A`/`AAAA`/`CNAME` on `@` or `www` (old hosting
  IPs, `AAAA` records).

## 3. Disable GoDaddy features that override DNS

- **Domain Forwarding** (Settings → Forwarding) — turn it **off**. Forwarding
  injects GoDaddy's own parking A record and hijacks the apex.
- Detach any **Website Builder / cPanel hosting** still claiming `@`/`www`.

## 4. Leave these alone

- **MX** records (email) — don't touch, or mail breaks.
- **TXT** records (SPF/DKIM/domain verification) — keep in place.
- **Nameservers** — keep GoDaddy's defaults for this record-edit approach.

## 5. Verify

- Propagation is usually minutes to ~1h (GoDaddy default TTL 1h; lowering to
  600 beforehand helps). Full global propagation can take up to 48h.
- Vercel's Domains panel flips to **Valid** and auto-provisions the SSL cert
  (Let's Encrypt) — no action needed.
- Check from a terminal:
  ```bash
  dig +short spawnclinical.com A          # → Vercel apex IP
  dig +short www.spawnclinical.com CNAME  # → cname.vercel-dns.com
  ```

## Alternative — hand DNS to Vercel

Instead of editing records, set GoDaddy's nameservers to Vercel's
(**Nameservers → Change → Enter my own**, e.g. `ns1.vercel-dns.com` /
`ns2.vercel-dns.com`, or whatever Vercel lists). Downside: you must re-create
your **MX/TXT email records inside Vercel**, or email breaks. Prefer the
record-edit approach in §2 unless you want centralized DNS.

## Notes

- `share.js` builds its absolute URLs from the incoming request host, so social
  previews work on `*.vercel.app`, `joedustin.com`, and `spawnclinical.com`
  without code changes.
- The `spawnclinical.com` / `www.spawnclinical.com` origins are already in the
  CORS allowlist (`lib/http.js`).
- The legacy GoDaddy site can keep running in parallel until you flip DNS.
