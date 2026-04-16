<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'actions' => [
        [
            'type' => 'modal',
            'title' => 'Gerando os Botões do modal dinamicamente',
            'body'  => '<p>Esse modal foi criado automaticamente pelo champs-core-js.</p>',
            'buttons' => [
                [
                    'text' => 'Botão Dinâmico',
                    'class' => 'btn btn-primary',
                    'attrs' => [
                        'data-champs-ajax' => '',
                        'data-champs-ajax-confirm' => 'Confirmar?',
                        'data-champs-modal-close-on-action' => true,
                    ],
                ],
                [
                    'text' => 'Cancelar',
                    'role' => 'cancel',
                    'class' => 'btn btn-secondary'
                ]
            ]
        ]
    ]
], JSON_UNESCAPED_UNICODE);
