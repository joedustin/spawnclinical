<?php
/**
 * SPAWN — HubSpot Lead Capture
 *
 * Creates (or finds) a contact in HubSpot via Contacts API v3.
 * Sources the contact under "Other Campaigns" with the SPAWN campaign UTM
 * stored in hs_analytics_source_data_1 for attribution reporting.
 *
 * NOTE ON CAMPAIGN ASSOCIATION:
 *   HubSpot's Marketing Campaign attribution is owned by HubSpot's tracking
 *   system and cannot be set directly via the Contacts API. To fully associate
 *   these contacts with campaign 41501340-SpawnClinical, create a HubSpot
 *   Workflow: trigger = "Contact is created" + filter "Lead Source = Other
 *   Campaigns", then add the "Add to campaign" action targeting that campaign.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

// ─── CONFIG ──────────────────────────────────────────────────────────────────
define('HUBSPOT_TOKEN',        getenv('HUBSPOT_TOKEN') ?: '');
define('HUBSPOT_CAMPAIGN_UTM', '41501340-SpawnClinical');

// ─── PARSE INPUT ─────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

$firstName = mb_substr(trim($body['firstName'] ?? ''), 0, 255);
$lastName  = mb_substr(trim($body['lastName']  ?? ''), 0, 255);
$email     = mb_substr(trim($body['email']     ?? ''), 0, 255);
$comment   = mb_substr(trim($body['comment']   ?? ''), 0, 2000);

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid email is required']);
    exit;
}

// ─── BUILD CONTACT PAYLOAD ───────────────────────────────────────────────────
// Only writable properties — hs_analytics_* campaign fields are system-managed
// and will cause a 400 if included. Attribution is handled via hs_analytics_source.
$payload = json_encode([
    'properties' => [
        'firstname'            => $firstName,
        'lastname'             => $lastName,
        'email'                => $email,
        'message'              => $comment,
        'custom_source' => 'SPAWN Website',   // free-form drill-down — trigger your workflow off this
        'hs_lead_status'             => 'NEW',
    ]
]);

// ─── CREATE CONTACT ───────────────────────────────────────────────────────────
$ch = curl_init('https://api.hubapi.com/crm/v3/objects/contacts');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . HUBSPOT_TOKEN,
    ],
    CURLOPT_TIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

// 201 = created, 200 = ok, 409 = already exists — all treated as success
if ($httpCode === 201 || $httpCode === 200 || $httpCode === 409) {
    echo json_encode(['success' => true]);
    exit;
}

// Anything else is a real error — log details but never block the spawn flow
http_response_code(500);
echo json_encode([
    'error'   => 'HubSpot API error (HTTP ' . $httpCode . ')',
    'details' => $result['message'] ?? $response,
]);
