<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'validation-error',
            'message' => 'Corrija os campos destacados.',
            'fields' => [
                'email' => 'E-mail inválido',
                'nome'  => ['Obrigatório', 'Mínimo 3 caracteres']
            ]
        ],
        // Mesmo se viesse outra action depois, o pipeline deve parar aqui
        ['type' => 'message', 'level' => 'info', 'text' => 'Não deveria executar']
    ]
], JSON_UNESCAPED_UNICODE);

