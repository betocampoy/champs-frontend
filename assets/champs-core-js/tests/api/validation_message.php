<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'validation-error',
            'message' => 'O id e o cliente são obrigatórios.'
            // sem fields
        ]
    ]
], JSON_UNESCAPED_UNICODE);
