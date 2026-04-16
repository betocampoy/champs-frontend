<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'formfiller',
            'data' => [
                'nome'  => 'Beto',
                'email' => 'beto@exemplo.com',
                // exemplo do formato legado {counter,data} (mantido)
                'nivel' => [
                    'counter' => 1,
                    'data' => [ '1' => 'admin' ]
                ]
            ]
        ],
        [
            'type' => 'message',
            'level' => 'success',
            'text' => 'FormFiller aplicado (sem jsCustomFunction).'
        ],
        [
            'type' => 'custom',
            'function' => 'afterFill',
            'data' => [ 'from' => 'formfiller.php' ]
        ]
    ]
], JSON_UNESCAPED_UNICODE);
