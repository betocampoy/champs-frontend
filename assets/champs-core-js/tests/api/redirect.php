<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        ['type' => 'message', 'level' => 'info', 'text' => 'Redirecionando...'],
        ['type' => 'redirect', 'url' => '/tests/index.html#apos-redirect']
    ]
], JSON_UNESCAPED_UNICODE);
