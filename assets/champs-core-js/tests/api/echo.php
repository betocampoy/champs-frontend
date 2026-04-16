<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'message',
            'level' => 'info',
            'text' => 'Payload recebido abaixo (ver console).'
        ],
        [
            'type' => 'custom',
            'function' => 'debugPayload',
            'data' => $_POST
        ]
    ]
], JSON_UNESCAPED_UNICODE);
