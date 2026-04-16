<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        ['type' => 'message', 'html' => '<div class="alert alert-success" role="alert">Mensagem de Sucesso</div>'],
        // aqui depois você testa formfiller/populate/custom etc.
    ]
], JSON_UNESCAPED_UNICODE);