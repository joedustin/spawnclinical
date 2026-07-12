<?php
/**
 * SPAWN Clinical — Anthropic Claude Proxy
 * ─────────────────────────────────────────────────────────────
 * The API key lives here, server-side only. It is never sent
 * to the browser, never in JS, never in any network response.
 * ─────────────────────────────────────────────────────────────
 */

// ── YOUR API KEY ─────────────────────────────────────────────
// Replace the placeholder below with your real Anthropic API key.
// This file executes server-side; visitors cannot read its source.
define('ANTHROPIC_API_KEY', getenv('ANTHROPIC_API_KEY') ?: '');

// ── SETTINGS ─────────────────────────────────────────────────
define('ANTHROPIC_MODEL',  'claude-sonnet-4-6'); // model to use
define('MAX_TOKENS_CAP',   4096);                 // hard ceiling per request
define('RATE_LIMIT_MAX',   15);                   // max requests per session window
define('RATE_LIMIT_WINDOW', 60);                  // window in seconds

// ── CORS ─────────────────────────────────────────────────────
// Only your domain is allowed to call this proxy.
$allowed_origins = [
    'https://spawnclinical.com',
    'https://www.spawnclinical.com',
    'http://localhost:8080',   // local dev
    'http://localhost:3000',   // local dev
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
} elseif ($origin === '') {
    // Direct server-side or same-origin requests (no Origin header) — allow
} else {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Origin not permitted']);
    exit;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── SESSION-BASED RATE LIMITING ───────────────────────────────
// Each visitor gets a session; we count their calls per minute.
// This is lightweight and requires no database.
@session_start();
$now = time();

if (empty($_SESSION['rl_start']) || ($now - $_SESSION['rl_start']) > RATE_LIMIT_WINDOW) {
    $_SESSION['rl_start'] = $now;
    $_SESSION['rl_count'] = 0;
}

$_SESSION['rl_count']++;

if ($_SESSION['rl_count'] > RATE_LIMIT_MAX) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests — please wait a moment and try again.']);
    exit;
}

// ── READ & VALIDATE REQUEST BODY ──────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body) || empty($body['messages']) || !is_array($body['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body']);
    exit;
}

// Validate messages structure
foreach ($body['messages'] as $msg) {
    if (!isset($msg['role'], $msg['content']) || !in_array($msg['role'], ['user','assistant'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid message format']);
        exit;
    }
}

// ── BUILD SAFE FORWARD PAYLOAD ────────────────────────────────
// We control the model and cap tokens — the client cannot override these.
$forward = [
    'model'      => ANTHROPIC_MODEL,
    'max_tokens' => min((int)($body['max_tokens'] ?? MAX_TOKENS_CAP), MAX_TOKENS_CAP),
    'messages'   => array_slice($body['messages'], -10), // last 10 only, prevents abuse
];

// Optional system prompt (capped at 3000 chars)
if (!empty($body['system'])) {
    $forward['system'] = mb_substr((string)$body['system'], 0, 3000);
}

// ── CALL ANTHROPIC ────────────────────────────────────────────
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($forward),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: '          . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_TIMEOUT        => 90,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response  = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach Anthropic API: ' . $curl_err]);
    exit;
}

// Forward Anthropic's response (and status code) directly to the browser.
// The API key is never part of this response.
http_response_code($http_code);
echo $response;
