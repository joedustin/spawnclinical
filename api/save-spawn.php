<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db.php';

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || empty($body['spawn']['productName'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid spawn data']);
    exit;
}

$spawn   = $body['spawn'];
$persona = in_array($body['persona'] ?? '', ['sponsor', 'site', 'patient'])
           ? $body['persona'] : 'sponsor';

// Sanitise inputs
$productName    = mb_substr(strip_tags($spawn['productName']),    0, 255);
$tagline        = mb_substr(strip_tags($spawn['tagline'] ?? ''),  0, 500);
$firstName      = mb_substr(strip_tags($body['firstName']      ?? ''), 0, 255);
$lastName       = mb_substr(strip_tags($body['lastName']       ?? ''), 0, 255);
$creatorEmail   = mb_substr(strip_tags($body['creatorEmail']   ?? ''), 0, 255);
$creatorComment = mb_substr(strip_tags($body['creatorComment'] ?? ''), 0, 1000);
$spawnPrompt    = mb_substr(strip_tags($body['spawnPrompt']    ?? ''), 0, 2000);
$spawnJson      = json_encode($spawn, JSON_UNESCAPED_UNICODE);

// Build display name from first + last (fallback to legacy creatorName field)
$displayName = trim($firstName . ' ' . $lastName);
if (!$displayName) {
    $displayName = mb_substr(strip_tags($body['creatorName'] ?? 'Anonymous'), 0, 255) ?: 'Anonymous';
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO spawns
           (product_name, tagline, persona, creator_name, first_name, last_name, creator_email, creator_comment, spawn_prompt, spawn_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $productName,
        $tagline,
        $persona,
        $displayName,
        $firstName,
        $lastName,
        $creatorEmail,
        $creatorComment,
        $spawnPrompt,
        $spawnJson,
    ]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save: ' . $e->getMessage()]);
}
