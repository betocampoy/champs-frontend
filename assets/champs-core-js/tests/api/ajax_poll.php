<?php

/**
 * Backend fake do AjaxPoll (seção #sec-ajax-poll de tests/index.html).
 * Contadores por cenário na sessão PHP (o fetch do AjaxForm envia o cookie).
 */

session_start();

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? '?';
$globalLoader = $_SERVER['HTTP_X_GLOBAL_LOADER'] ?? '(ausente)';
$champsAjax = $_SERVER['HTTP_X_CHAMPS_AJAX'] ?? '(ausente)';

function response(array $actions): void
{
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['actions' => $actions], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function tick(string $key): int
{
    $_SESSION['poll'][$key] = ($_SESSION['poll'][$key] ?? 0) + 1;
    return $_SESSION['poll'][$key];
}

function text(string $target, string $value): array
{
    return ['type' => 'dom-patch', 'operation' => 'text', 'target' => $target, 'text' => $value];
}

$meta = "método {$method} · X-Global-Loader {$globalLoader} · X-Champs-Ajax {$champsAjax}";

switch ($action) {
    // Contador sem fim: só para pelo botão "Parar" (window.Champs.AjaxPoll.stop).
    case 'contador':
        $n = tick('contador');
        response([
            text('#poll-contador-valor', (string) $n),
            text('#poll-contador-meta', $meta),
        ]);

    // Job fake: "processando" nas 2 primeiras consultas; na 3ª o elemento é
    // substituído por um HTML SEM data-champs-ajax-poll -> o polling para sozinho.
    case 'job':
        $n = tick('job');
        if ($n < 3) {
            response([text('#poll-job-status', "Processando… (consulta {$n})")]);
        }
        response([
            [
                'type' => 'dom-patch',
                'operation' => 'replace',
                'target' => '#poll-job',
                'html' => '<div id="poll-job" class="alert alert-success mb-0">Concluído na consulta ' . $n . '.</div>',
            ],
        ]);

    // Erro de servidor (não-JSON): o AjaxPoll é silencioso (sem toast) e continua.
    case 'erro':
        $n = tick('erro');
        if ($n % 2 === 1) {
            http_response_code(500);
            header('Content-Type: text/html; charset=utf-8');
            echo 'Erro fake do servidor';
            exit;
        }
        response([text('#poll-erro-valor', "Resposta ok na consulta {$n}")]);

    // Abre um modal cujo conteúdo tem um elemento com polling: prova que o
    // initCore do ModalManager liga o módulo e que fechar o modal para o polling.
    case 'abrir-modal':
        response([
            [
                'type' => 'modal',
                'html' => '
                <div class="modal fade" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Polling dentro de modal</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="poll-modal"
                                     data-champs-ajax-poll="1000"
                                     data-champs-ajax-route="/tests/api/ajax_poll.php"
                                     data-champs-ajax-field-action="contador-modal">
                                    Consultas: <strong id="poll-modal-valor">0</strong>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>',
            ],
        ]);

    case 'contador-modal':
        $n = tick('contador-modal');
        response([text('#poll-modal-valor', (string) $n)]);

    case 'reset':
        $_SESSION['poll'] = [];
        response([['type' => 'message', 'level' => 'success', 'text' => 'Contadores zerados.', 'target' => '#poll-messages']]);

    default:
        response([['type' => 'message', 'level' => 'error', 'text' => 'Ação de teste inválida.', 'target' => '#poll-messages']]);
}
