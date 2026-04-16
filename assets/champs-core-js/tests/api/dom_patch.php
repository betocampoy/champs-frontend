<?php

header('Content-Type: application/json; charset=utf-8');

$action = $_POST['action'] ?? '';

function response(array $actions = [], array $extra = []): void
{
    echo json_encode(array_merge([
        'actions' => $actions,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function message(
    string $level,
    string $text,
    bool $clearBefore = true,
    bool $persist = false,
    int $seconds = 5,
    ?string $target = '.champs_post_response'
): array {
    $payload = [
        'type' => 'message',
        'level' => $level,
        'text' => $text,
        'clearBefore' => $clearBefore,
        'persist' => $persist,
        'target' => $target,
    ];

    if (!$persist) {
        $payload['seconds'] = $seconds;
    }

    return $payload;
}

function domPatch(
    string $operation,
    string $target,
    ?string $html = null,
    array $extra = []
): array {
    $payload = array_merge([
        'type' => 'dom-patch',
        'operation' => $operation,
        'target' => $target,
    ], $extra);

    if ($html !== null) {
        $payload['html'] = $html;
    }

    return $payload;
}

function cardItemHtml(int $id, string $title, string $text): string
{
    return '
    <div class="col-12 col-lg-6" id="dompatch-item-' . $id . '">
        <div id="dompatch-card-' . $id . '">
            <div class="card h-100">
                <div class="card-header">
                    <div class="fw-semibold">' . htmlspecialchars($title) . '</div>
                </div>
                <div class="card-body">
                    <div class="champs_message_content mb-2"></div>
                    <p class="mb-0">' . htmlspecialchars($text) . '</p>
                </div>
            </div>
        </div>
    </div>';
}

function rowHtml(int $id, string $name, string $status): string
{
    return '
    <tr id="dompatch-row-' . $id . '">
        <td>' . $id . '</td>
        <td>' . htmlspecialchars($name) . '</td>
        <td>' . htmlspecialchars($status) . '</td>
    </tr>';
}

switch ($action) {
    case 'replace-card-1':
        response([
            message('success', 'Card 1 substituído com sucesso.'),
            domPatch(
                'replace',
                '#dompatch-item-1',
                cardItemHtml(1, 'Card 1 atualizado', 'Conteúdo substituído via backend fake.')
            ),
        ]);

    case 'prepend-card':
        $id = (int) ($_POST['id'] ?? rand(100, 999));

        response([
            message('success', 'Card inserido no início.'),
            domPatch(
                'prepend',
                '#champs-card-list-dompatch',
                cardItemHtml($id, 'Novo card ' . $id, 'Inserido com prepend.')
            ),
        ]);

    case 'append-card':
        $id = (int) ($_POST['id'] ?? rand(100, 999));

        response([
            message('success', 'Card inserido no final.'),
            domPatch(
                'append',
                '#champs-card-list-dompatch',
                cardItemHtml($id, 'Novo card ' . $id, 'Inserido com append.')
            ),
        ]);

    case 'remove-card-2':
        response([
            message('success', 'Card 2 removido.'),
            domPatch('remove', '#dompatch-item-2'),
        ]);

    case 'clear-cards':
        response([
            message('success', 'Lista de cards limpa.'),
            domPatch('clear', '#champs-card-list-dompatch'),
        ]);

    case 'replace-row-1':
        response([
            message('success', 'Linha 1 substituída.'),
            domPatch(
                'replace',
                '#dompatch-row-1',
                rowHtml(1, 'Empresa A atualizada', 'Atualizada')
            ),
        ]);

    case 'append-row':
        $id = (int) ($_POST['id'] ?? rand(100, 999));

        response([
            message('success', 'Linha adicionada.'),
            domPatch(
                'append',
                '#dompatch-table-body',
                rowHtml($id, 'Empresa ' . $id, 'Nova')
            ),
        ]);

    case 'remove-row-2':
        response([
            message('success', 'Linha 2 removida.'),
            domPatch('remove', '#dompatch-row-2'),
        ]);

    case 'clear-rows':
        response([
            message('success', 'Tabela limpa.'),
            domPatch('clear', '#dompatch-table-body'),
        ]);

    default:
        response([
            message('error', 'Ação de teste inválida.'),
        ]);
}
