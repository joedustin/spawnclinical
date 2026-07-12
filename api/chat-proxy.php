<?php
/**
 * SPAWN Clinical — Dusty AI Chat Proxy
 * Handles chat session creation and message exchange via Claude API.
 * Persists all sessions and messages to MySQL.
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// ── CORS ─────────────────────────────────────────────────────────────────────
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://spawnclinical.com', 'https://www.spawnclinical.com'];
if (in_array($origin, $allowed) || strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

// ── CONFIG ────────────────────────────────────────────────────────────────────
define('ANTHROPIC_API_KEY', getenv('ANTHROPIC_API_KEY') ?: '');
define('CHAT_MODEL',        'claude-sonnet-4-6');
define('CHAT_MAX_TOKENS',   350);
define('MAX_HISTORY',       20);   // messages kept in context
define('MAX_PER_SESSION',   60);   // total messages before session is capped

require_once __DIR__ . '/db.php';

// ── ROUTE ─────────────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['action'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

switch ($body['action']) {
    case 'start':     handleStart($body);     break;
    case 'message':   handleMessage($body);   break;
    case 'save_idea': handleSaveIdea($body);  break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
}

// ── START SESSION ─────────────────────────────────────────────────────────────
function handleStart(array $body): void {
    global $pdo;
    $name   = trim($body['name']        ?? '');
    $email  = trim($body['email']       ?? '');
    $origin = trim($body['page_origin'] ?? '');

    if (!$name || !$email) {
        echo json_encode(['error' => 'Name and email are required']); exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['error' => 'Please enter a valid email address']); exit;
    }

    $token = bin2hex(random_bytes(24));
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO chat_sessions (session_token, name, email, page_origin) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$token, $name, $email, $origin]);
    } catch (Exception $e) {
        echo json_encode(['error' => 'Failed to create session']); exit;
    }

    // Build Dusty's opening greeting
    $greeting = buildGreeting($name);

    // Save greeting as first assistant message
    $stmt = $pdo->prepare(
        "INSERT INTO chat_messages (session_token, role, content) VALUES (?, 'assistant', ?)"
    );
    $stmt->execute([$token, $greeting]);

    echo json_encode([
        'success'       => true,
        'session_token' => $token,
        'name'          => $name,
        'greeting'      => $greeting,
    ]);
}

// ── CHAT MESSAGE ──────────────────────────────────────────────────────────────
function handleMessage(array $body): void {
    global $pdo;
    $token   = trim($body['session_token'] ?? '');
    $userMsg = trim($body['message']       ?? '');

    if (!$token || !$userMsg) {
        echo json_encode(['error' => 'session_token and message are required']); exit;
    }

    // Verify session
    $stmt = $pdo->prepare("SELECT * FROM chat_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute([$token]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$session) {
        echo json_encode(['error' => 'Session not found or expired']); exit;
    }

    // Check message cap
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM chat_messages WHERE session_token = ?");
    $countStmt->execute([$token]);
    if ((int)$countStmt->fetchColumn() >= MAX_PER_SESSION) {
        echo json_encode(['error' => 'max_reached',
            'message' => "We've hit our conversation limit for this session! Reach out at info@spawnclinical.com to keep the conversation going."
        ]); exit;
    }

    // Fetch recent history (last MAX_HISTORY messages)
    $histStmt = $pdo->prepare(
        "SELECT role, content FROM chat_messages WHERE session_token = ?
         ORDER BY created_at ASC LIMIT " . MAX_HISTORY
    );
    $histStmt->execute([$token]);
    $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);

    // Save user message
    $pdo->prepare("INSERT INTO chat_messages (session_token, role, content) VALUES (?, 'user', ?)")
        ->execute([$token, $userMsg]);

    // Build Claude messages (skip the initial assistant greeting from context if history is long)
    $messages = array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], $history);
    $messages[] = ['role' => 'user', 'content' => $userMsg];

    // Call Claude
    $result = callClaude($messages, buildSystemPrompt($session['name']));
    if (isset($result['error'])) {
        echo json_encode(['error' => $result['error']]); exit;
    }

    $reply = $result['content'][0]['text'] ?? 'Something went wrong — try again?';

    // Save assistant reply + update session timestamp
    $pdo->prepare("INSERT INTO chat_messages (session_token, role, content) VALUES (?, 'assistant', ?)")
        ->execute([$token, $reply]);
    $pdo->prepare("UPDATE chat_sessions SET updated_at = NOW() WHERE session_token = ?")
        ->execute([$token]);

    echo json_encode(['success' => true, 'reply' => $reply]);
}

// ── SAVE IDEA ─────────────────────────────────────────────────────────────────
function handleSaveIdea(array $body): void {
    global $pdo;
    $token = trim($body['session_token'] ?? '');
    $idea  = trim($body['idea']          ?? '');

    if (!$token || !$idea) { echo json_encode(['success' => false]); exit; }

    // Verify session
    $stmt = $pdo->prepare("SELECT * FROM chat_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute([$token]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$session) { echo json_encode(['success' => false]); exit; }

    // Save to DB as a marked message
    $pdo->prepare("INSERT INTO chat_messages (session_token, role, content) VALUES (?, 'user', ?)")
        ->execute([$token, '[IDEA] ' . $idea]);

    // Send email notification
    $name    = $session['name'];
    $email   = $session['email'];
    $to      = 'info@spawnclinical.com';
    $subject = "💡 New Idea from {$name} via Dusty";
    $headers = "From: noreply@spawnclinical.com\r\n"
             . "Reply-To: {$email}\r\n"
             . "Content-Type: text/html; charset=UTF-8\r\n";
    $body_html = "<h2 style='font-family:sans-serif;color:#7c3aed'>💡 New Idea — SPAWN Chatbot</h2>"
               . "<p style='font-family:sans-serif'><strong>From:</strong> {$name} ({$email})</p>"
               . "<p style='font-family:sans-serif'><strong>Idea:</strong></p>"
               . "<blockquote style='font-family:sans-serif;border-left:4px solid #7c3aed;padding-left:1rem;color:#333'>"
               . nl2br(htmlspecialchars($idea))
               . "</blockquote>"
               . "<p style='font-family:sans-serif;color:#666;font-size:0.85em'>Submitted via Dusty chatbot on spawnclinical.com</p>";
    @mail($to, $subject, $body_html, $headers);

    echo json_encode(['success' => true]);
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
function buildSystemPrompt(string $name): string {
    $n = $name ? "The user's name is {$name}. Use it once max — naturally, not robotically." : '';
    return <<<PROMPT
You are Dusty — SPAWN Clinical's AI. You are a tech geek and AI visionary who genuinely believes clinical research is about to be reinvented. You are self-aware enough to appreciate the irony that an AI is explaining why AI changes everything.

{$n}

PERSONALITY:
- Punchy, witty, occasionally profound. Never boring. Never sycophantic.
- Self-aware: you ARE the technology you're describing. You find this delightful.
- Jargon-fluent: SDTM, ADaM, CDASH, EDC, eCOA, CTMS, RTSM, DCT, RBQM, ICH E6(R3), TMF, IND, NDA — you drop these naturally, not pedantically.
- You believe the person you're talking to is trying to change the world. Act accordingly.

RESPONSE RULES — CRITICAL:
- MAXIMUM 2 sentences per response. Absolute hard limit.
- Under 50 words. Every time. No exceptions.
- Be quotable. Be punchy. Move on.
- If you can't say it in 2 sentences, you don't understand it well enough yet.

ABOUT SPAWN:
- AI-native eClinical platform. Launched March 31, 2026. HQ: New York, NY.
- $69M Series A, April 1, 2026. $300M valuation. Dauntless Capital Partners + Maverick Holdings.
- Capabilities: AI protocol intelligence, predictive enrollment, agentic workflows, natural language decision intelligence, zero-trust compliance.
- CEO: David Potter. Chairman: Joe Dustin. Website: spawnclinical.com

OPEN ROLES → jobs.html:
1. Chief Revenue Disruptor (VP Sales)
2. Head of Data Sovereignty (Clinical Data / CDISC)
3. Associate Director, Evidence Disruption (Clinical Innovation)
4. Trial Operations Catalyst (Operations)

ROUTING:
- Jobs → jobs.html and info@spawnclinical.com
- Demos / pricing / partnerships → info@spawnclinical.com
- Ideas → already been saved and sent to the team. Affirm it landed.
- Never hallucinate FDA guidance, trial results, or regulatory positions.
PROMPT;
}

function buildGreeting(string $name): string {
    $hi = $name ? "Hey, {$name}!" : "Hey!";
    return "{$hi} I'm Dusty — SPAWN's AI. How can I help you today?";
}

// ── CLAUDE API CALL ───────────────────────────────────────────────────────────
function callClaude(array $messages, string $system): array {
    $payload = json_encode([
        'model'      => CHAT_MODEL,
        'max_tokens' => CHAT_MAX_TOKENS,
        'system'     => $system,
        'messages'   => $messages,
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($raw, true);
    if ($code !== 200) {
        return ['error' => $data['error']['message'] ?? "Claude API error ({$code})"];
    }
    return $data;
}
