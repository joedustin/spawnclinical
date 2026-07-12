<?php
/**
 * SPAWN Gallery — Shared Database Connection
 *
 * ⚠  GoDaddy cPanel Note:
 * GoDaddy automatically prefixes your database name and username
 * with your cPanel account name. For example, if your cPanel
 * username is "mysite123", the real credentials are:
 *
 *   DB_NAME:  mysite123_SPAWN-Gallery
 *   DB_USER:  mysite123_spawnPost
 *
 * To find the exact values:
 *   cPanel → MySQL Databases → "Current Databases" and "Current Users"
 * Then update the constants below.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 't1opnxy4p69t_SPAWN-Gallery');        // ← add your cPanel prefix
define('DB_USER', 't1opnxy4p69t_spawnPost');             // ← add your cPanel prefix
define('DB_PASS', getenv('DB_PASS') ?: '');

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}
