<?php
header('Content-Type: application/json; charset=utf-8');

if($_POST['unidade_id'] == 1){
    $data = [
        '10' => 'Cliente A',
        '11' => 'Cliente B',
        '12' => 'Cliente C',
    ];
}elseif($_POST['unidade_id'] == 2){
    $data = [
        '13' => 'Cliente D',
        '14' => 'Cliente E',
        '15' => 'Cliente F',
        '16' => 'Cliente G',
    ];
}elseif($_POST['unidade_id'] == 3){
    $data = [];
}

echo json_encode([
    'actions' => [
        [
            'type' => 'populate',
            'data' => [
                'data_response' => [
                    'counter' => count($data),
                    'data' => $data
                ]
            ]
        ]
    ]
], JSON_UNESCAPED_UNICODE);