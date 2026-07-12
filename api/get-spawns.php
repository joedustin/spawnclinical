<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';

$page    = max(1, (int)($_GET['page']   ?? 1));
$limit   = min(24, max(1, (int)($_GET['limit'] ?? 12)));
$persona = in_array($_GET['persona'] ?? '', ['sponsor', 'site', 'patient'])
           ? $_GET['persona'] : null;
$offset  = ($page - 1) * $limit;

try {
    $where  = "WHERE status = 'published'" . ($persona ? " AND persona = :persona" : '');
    $params = $persona ? [':persona' => $persona] : [];

    // Total count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM spawns $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Paginated rows
    $params[':limit']  = $limit;
    $params[':offset'] = $offset;
    $rowStmt = $pdo->prepare(
        "SELECT id, product_name, tagline, persona,
                creator_name, creator_comment, spawn_data, created_at
         FROM spawns $where
         ORDER BY created_at DESC
         LIMIT :limit OFFSET :offset"
    );
    // Bind integers explicitly so MySQL doesn't receive them as strings
    foreach ([':limit' => $limit, ':offset' => $offset] as $k => $v) {
        $rowStmt->bindValue($k, $v, PDO::PARAM_INT);
    }
    if ($persona) $rowStmt->bindValue(':persona', $persona);
    $rowStmt->execute();
    $rows = $rowStmt->fetchAll();

    foreach ($rows as &$row) {
        $row['spawn_data'] = json_decode($row['spawn_data'], true);
    }
    unset($row);

    echo json_encode([
        'success' => true,
        'spawns'  => $rows,
        'total'   => $total,
        'page'    => $page,
        'pages'   => (int)ceil($total / $limit),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
