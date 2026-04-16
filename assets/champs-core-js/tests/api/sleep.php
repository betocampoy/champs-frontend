<?php
header('Content-Type: application/json; charset=utf-8');

$seconds = isset($_GET['seconds']) ? (int)$_GET['seconds'] : 3;
$seconds = max(1, min(10, $seconds));

$label = $_GET['label'] ?? 'Sleep test';

sleep($seconds);

echo json_encode([
    'actions' => [
        [
            'type' => 'message',
            'level' => 'success',
            'text' => "OK: {$label} — demorou {$seconds}s",
        ],
    ],
], JSON_UNESCAPED_UNICODE);
