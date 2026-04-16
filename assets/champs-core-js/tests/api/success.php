<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        ['type' => 'message', 'level' => 'success', 'text' => 'Salvo com sucesso!'],
        // aqui depois você testa formfiller/populate/custom etc.
    ]
], JSON_UNESCAPED_UNICODE);