<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'modal',
            'title' => 'Ações no Modal',
            'body'  => '<p>Clique em um botão para disparar actions.</p>',
            'buttons' => [
                [
                    'text' => 'Mostrar mensagem',
                    'role' => 'action',
                    'class' => 'btn btn-primary',
                    'actions' => [
                        [ 'type' => 'message', 'level' => 'success', 'text' => 'Action executada pelo modal!' ]
                    ]
                ],
                [
                    'text' => 'Cancelar',
                    'role' => 'cancel',
                    'class' => 'champs-btn-secondary'
                ]
            ]
        ]
    ]
], JSON_UNESCAPED_UNICODE);
