<?php
header('Content-Type: application/json; charset=utf-8');

$mode  = $_GET['mode']  ?? 'single';
$sleep = (int)($_GET['sleep'] ?? 0);

if ($sleep > 0) {
    sleep(min($sleep, 5));
}

function buildHtml($title)
{
    return '<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>'.$title.'</title>
<style>
body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif;
    padding: 40px;
    background: #f7f8fb;
}
.card {
    max-width: 800px;
    margin: auto;
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
}
h1 { margin-bottom: 10px; }
</style>
</head>
<body>
<div class="card">
    <h1>'.$title.'</h1>
    <p>Gerado via action <strong>open-new-page</strong></p>
    <p>Data/Hora: '.date('d/m/Y H:i:s').'</p>
</div>
</body>
</html>';
}

if ($mode === 'multi') {

    echo json_encode([
        'actions' => [
            [
                'type' => 'open-new-page',
                'target' => '_blank',
                'page' => buildHtml('Relatório 1')
            ],
            [
                'type' => 'open-new-page',
                'target' => '_blank',
                'page' => buildHtml('Relatório 2')
            ]
        ]
    ]);
    exit;
}

$target = $mode === 'self' ? '_self' : '_blank';

echo json_encode([
    'actions' => [
        [
            'type' => 'open-new-page',
            'target' => $target,
            'page' => buildHtml('Relatório Single')
        ]
    ]
]);
