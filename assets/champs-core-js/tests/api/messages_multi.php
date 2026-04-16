<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        ['type' => 'message', 'level' => 'info',    'text' => 'Mensagem 1 (info)'],
        ['type' => 'message', 'level' => 'warning', 'text' => 'Mensagem 2 (warning)'],
        ['type' => 'message', 'level' => 'success', 'text' => 'Mensagem 3 (success)'],
    ]
], JSON_UNESCAPED_UNICODE);
