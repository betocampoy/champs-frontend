<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'modal',
            'title' => 'Ações no Modal',
            'body'  => '<p>Esse modal foi criado automaticamente pelo champs-core-js.</p>',
            'buttons' => [
                [
                    'text' => 'Mostrar mensagem',
                    'role' => 'action',
                    'class' => 'bnt btn-primary',
                    "data-champs-ajax-teste='foi'",
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
