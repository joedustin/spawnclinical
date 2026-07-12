// SPAWN Clinical — rich social-sharing proxy
// Ported from share.php. Serves server-rendered Open Graph tags so social
// crawlers (LinkedIn, X, Slack, iMessage) show a rich preview, then redirects
// real browsers to spawn.html?id=X.
import { sql } from '../lib/db.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const id = parseInt(req.query.id, 10) || 0;

  // Build absolute base URL from the request so this works on any domain
  // (vercel.app preview, joedustin.com, or spawnclinical.com after cutover).
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const base  = `${proto}://${host}`;

  const bail = () => { res.setHeader('Location', '/gallery.html'); res.status(302).end(); };
  if (id <= 0) return bail();

  let spawn;
  try {
    const rows = await sql`SELECT * FROM spawns WHERE id = ${id} AND status = 'published' LIMIT 1`;
    spawn = rows[0];
  } catch {
    return bail();
  }
  if (!spawn) return bail();

  const data        = spawn.spawn_data || {};
  const productName = data.productName || spawn.product_name || 'SPAWN Solution';
  const tagline     = data.tagline || spawn.tagline || '';
  const heroText    = data.heroText || '';
  const creator     = spawn.creator_name || '';
  const persona     = spawn.persona ? spawn.persona.charAt(0).toUpperCase() + spawn.persona.slice(1) : '';

  const ogTitle = `${esc(productName)} — Built with SPAWN Clinical`;

  const parts = [];
  if (tagline) parts.push(esc(tagline));
  if (persona) parts.push(`[${persona} Solution]`);
  if (creator && creator !== 'Anonymous') parts.push('Spawned by ' + esc(creator));
  if (heroText) parts.push(esc(heroText.slice(0, 150)) + '…');
  const ogDesc = parts.join(' — ') || 'A custom AI-generated eClinical solution built with SPAWN Clinical.';

  const canonicalUrl = `${base}/share?id=${id}`;
  const spawnUrl     = `${base}/spawn.html?id=${id}`;
  const ogImage      = `${base}/og-image.png`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ogTitle}</title>
<meta name="description" content="${ogDesc}">

<meta property="og:type"         content="website">
<meta property="og:url"          content="${esc(canonicalUrl)}">
<meta property="og:site_name"    content="SPAWN Clinical">
<meta property="og:title"        content="${ogTitle}">
<meta property="og:description"  content="${ogDesc}">
<meta property="og:image"        content="${esc(ogImage)}">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type"   content="image/png">

<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:site"        content="@spawnclinical">
<meta name="twitter:title"       content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
<meta name="twitter:image"       content="${esc(ogImage)}">

<script>window.location.replace('${spawnUrl}');</script>
<meta http-equiv="refresh" content="0;url=${esc(spawnUrl)}">

<style>
  body{background:#05050E;color:#F1F5F9;font-family:sans-serif;
    display:flex;align-items:center;justify-content:center;
    min-height:100vh;margin:0;text-align:center;padding:2rem}
  a{color:#22C55E}
</style>
</head>
<body>
  <p>
    Loading <strong>${esc(productName)}</strong>…<br><br>
    <a href="${esc(spawnUrl)}">Click here if you are not redirected automatically</a>
  </p>
</body>
</html>`);
}
