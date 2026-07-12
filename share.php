<?php
/**
 * SPAWN Clinical — Rich Social Sharing Proxy
 * ─────────────────────────────────────────────────────────────
 * Social crawlers (LinkedIn, X/Twitter, Slack, iMessage, etc.)
 * don't execute JavaScript, so they need server-rendered Open
 * Graph meta tags to generate a rich link preview.
 *
 * This file:
 *  1. Fetches the spawn from the DB and builds dynamic OG tags
 *  2. Immediately JS-redirects real browsers to spawn.html?id=X
 *  3. Social bots (no JS) just read the meta and stop here
 *
 * Usage: share.php?id=42  →  redirects to spawn.html?id=42
 *        but with rich OG title/description for social previews
 * ─────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/api/db.php';

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: gallery.html');
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT * FROM spawns WHERE id = ? AND status = 'published' LIMIT 1"
    );
    $stmt->execute([$id]);
    $spawn = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    header('Location: gallery.html');
    exit;
}

if (!$spawn) {
    header('Location: gallery.html');
    exit;
}

// ── Parse spawn data ──────────────────────────────────────────
$spawnData   = json_decode($spawn['spawn_data'] ?? '{}', true) ?: [];
$productName = $spawnData['productName'] ?? $spawn['product_name'] ?? 'SPAWN Solution';
$tagline     = $spawnData['tagline']     ?? $spawn['tagline']      ?? '';
$heroText    = $spawnData['heroText']    ?? '';
$creator     = $spawn['creator_name']   ?? '';
$persona     = ucfirst($spawn['persona'] ?? '');

// ── Build OG strings ──────────────────────────────────────────
function esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$ogTitle = esc($productName) . ' — Built with SPAWN Clinical';

// Description: tagline + persona + creator + brief hero snippet
$descParts = [];
if ($tagline)  $descParts[] = esc($tagline);
if ($persona)  $descParts[] = "[$persona Solution]";
if ($creator && $creator !== 'Anonymous') $descParts[] = 'Spawned by ' . esc($creator);
if ($heroText) $descParts[] = esc(substr($heroText, 0, 150)) . '…';
$ogDesc = implode(' — ', $descParts) ?: 'A custom AI-generated eClinical solution built with SPAWN Clinical.';

$canonicalUrl = 'https://spawnclinical.com/share.php?id=' . $id;
$spawnUrl     = 'https://spawnclinical.com/spawn.html?id=' . $id;
$ogImage      = 'https://spawnclinical.com/og-image.png';

?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $ogTitle ?></title>
<meta name="description" content="<?= $ogDesc ?>">

<!-- Open Graph (Facebook, LinkedIn, Slack, iMessage, etc.) -->
<meta property="og:type"         content="website">
<meta property="og:url"          content="<?= esc($canonicalUrl) ?>">
<meta property="og:site_name"    content="SPAWN Clinical">
<meta property="og:title"        content="<?= $ogTitle ?>">
<meta property="og:description"  content="<?= $ogDesc ?>">
<meta property="og:image"        content="<?= esc($ogImage) ?>">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type"   content="image/png">

<!-- Twitter / X Card -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:site"        content="@spawnclinical">
<meta name="twitter:title"       content="<?= $ogTitle ?>">
<meta name="twitter:description" content="<?= $ogDesc ?>">
<meta name="twitter:image"       content="<?= esc($ogImage) ?>">

<!-- Redirect real browsers immediately.
     Social crawlers don't execute JS so they stay and read the meta above. -->
<script>window.location.replace('<?= $spawnUrl ?>');</script>
<meta http-equiv="refresh" content="0;url=<?= esc($spawnUrl) ?>">

<style>
  body{background:#05050E;color:#F1F5F9;font-family:sans-serif;
    display:flex;align-items:center;justify-content:center;
    min-height:100vh;margin:0;text-align:center;padding:2rem}
  a{color:#22C55E}
</style>
</head>
<body>
  <p>
    Loading <strong><?= esc($productName) ?></strong>…<br><br>
    <a href="<?= esc($spawnUrl) ?>">Click here if you are not redirected automatically</a>
  </p>
</body>
</html>
