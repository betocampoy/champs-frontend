<?php
/**
 * TEST API - Remote Clients (paginado)
 *
 * GET params:
 *  - q (string)
 *  - page (int) default 1
 *  - per_page (int) default 20
 *  - unidade_id, ativo, tipo (opcionais)
 */

header('Content-Type: application/json; charset=utf-8');

// Simula latência para testar debounce + abort
usleep(250000); // 250ms

$q          = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$page       = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$perPage    = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;

$unidade_id = $_GET['unidade_id'] ?? null;
$ativo      = $_GET['ativo'] ?? null;
$tipo       = $_GET['tipo'] ?? null;

if ($page < 1) $page = 1;
if ($perPage < 1) $perPage = 20;
if ($perPage > 50) $perPage = 50; // limite saudável pro teste

// Base fake de clientes
$clients = [
    ['id' => 1,  'nome' => 'ACME LTDA',               'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 2,  'nome' => 'Beta Transportes',        'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 3,  'nome' => 'Gamma Comércio',          'unidade_id' => 2, 'ativo' => 0, 'tipo' => 'normal'],
    ['id' => 4,  'nome' => 'Delta Logística',         'unidade_id' => 3, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 5,  'nome' => 'Epsilon Distribuidora',   'unidade_id' => 2, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 6,  'nome' => 'Zeta Express',            'unidade_id' => 1, 'ativo' => 0, 'tipo' => 'normal'],
    ['id' => 7,  'nome' => 'Omega Solutions',         'unidade_id' => 3, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 8,  'nome' => 'Alpha Comercial',         'unidade_id' => 2, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 9,  'nome' => 'Sigma Transportadora',    'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 10, 'nome' => 'Phoenix Log',             'unidade_id' => 3, 'ativo' => 0, 'tipo' => 'normal'],

    // Repete pra simular base grande (só pro teste)
    ['id' => 11, 'nome' => 'ACME Filial 2',           'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 12, 'nome' => 'ACME Filial 3',           'unidade_id' => 2, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 13, 'nome' => 'ACME Filial 4',           'unidade_id' => 3, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 14, 'nome' => 'ACME Filial 5',           'unidade_id' => 1, 'ativo' => 0, 'tipo' => 'normal'],
    ['id' => 15, 'nome' => 'ACME Filial 6',           'unidade_id' => 2, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 16, 'nome' => 'ACME Filial 7',           'unidade_id' => 3, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 17, 'nome' => 'ACME Filial 8',           'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'vip'],
    ['id' => 18, 'nome' => 'ACME Filial 9',           'unidade_id' => 2, 'ativo' => 0, 'tipo' => 'normal'],
    ['id' => 19, 'nome' => 'ACME Filial 10',          'unidade_id' => 3, 'ativo' => 1, 'tipo' => 'normal'],
    ['id' => 20, 'nome' => 'ACME Filial 11',          'unidade_id' => 1, 'ativo' => 1, 'tipo' => 'normal'],
];

// Filtra
$filtered = array_values(array_filter($clients, function ($c) use ($q, $unidade_id, $ativo, $tipo) {
    if ($q !== '' && stripos($c['nome'], $q) === false) return false;

    if ($unidade_id !== null && $unidade_id !== '' && $c['unidade_id'] != $unidade_id) return false;
    if ($ativo !== null && $ativo !== '' && $c['ativo'] != $ativo) return false;
    if ($tipo !== null && $tipo !== '' && $c['tipo'] != $tipo) return false;

    return true;
}));

$total = count($filtered);
$offset = ($page - 1) * $perPage;
$pageItems = array_slice($filtered, $offset, $perPage);

$items = array_map(function ($c) {
    return [
        'value' => (string)$c['id'],
        'label' => $c['nome'] . ' (U' . $c['unidade_id'] . ')',
    ];
}, $pageItems);

$hasMore = ($offset + $perPage) < $total;

echo json_encode([
    'items'     => $items,
    'page'      => $page,
    'per_page'  => $perPage,
    'has_more'  => $hasMore,
    'next_page' => $hasMore ? ($page + 1) : null,
], JSON_UNESCAPED_UNICODE);

exit;