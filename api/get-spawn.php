<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';

$id = (int)($_GET['id'] ?? 0);
if ($id < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid id']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT * FROM spawns WHERE id = ? AND status = 'published' LIMIT 1"
    );
    $stmt->execute([$id]);
    $spawn = $stmt->fetch();

    if (!$spawn) {
        http_response_code(404);
        echo json_encode(['error' => 'Spawn not found']);
        exit;
    }

    $spawn['spawn_data'] = json_decode($spawn['spawn_data'], true);
    echo json_encode(['success' => true, 'spawn' => $spawn]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
