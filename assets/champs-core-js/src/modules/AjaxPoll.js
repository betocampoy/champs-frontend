import { handleAjax } from './AjaxForm.js';

/**
 * AjaxPoll (Champs Core)
 *
 * Atualização automática declarativa: repete uma requisição do AjaxForm em
 * intervalo fixo e executa as actions da resposta (dom-patch, message, ...).
 * Serve pra telas que acompanham algo que muda no servidor sem ação do
 * usuário: status "processando" de um job assíncrono, QR code aguardando
 * leitura, caixa de entrada, painel ao vivo.
 *
 * Ativação (no elemento que representa "o que está sendo acompanhado"):
 *  - data-champs-ajax-poll="3000"             intervalo em ms (mínimo 1000)
 *  - data-champs-ajax-route="/rota/status"    URL (mesmo atributo do AjaxForm)
 *
 * Opcionais:
 *  - data-champs-ajax-method="GET"            padrão GET (o AjaxForm usaria POST)
 *  - data-champs-ajax-field-*                 campos extras, como no AjaxForm
 *  - data-champs-ajax-poll-immediate="true"   primeira requisição já no início
 *                                             (padrão: só depois do 1º intervalo)
 *  - data-champs-ajax-poll-max="N"            para depois de N requisições
 *  - data-champs-ajax-poll-pause-hidden="false"  continua com a aba em segundo
 *                                             plano (padrão: pausa)
 *
 * Comportamento:
 *  - usa handleAjax(el, { silent: true }): sem loader global, sem toast de erro,
 *    sem desabilitar o elemento. Eventos champs:ajax:* continuam disparando
 *  - nunca sobrepõe requisições: a próxima só é agendada quando a anterior
 *    termina (setTimeout encadeado, não setInterval)
 *  - erro de rede não para o polling (a próxima tentativa segue normalmente)
 *  - aba em segundo plano pausa; ao voltar, dispara na hora e retoma
 *
 * Como parar:
 *  - o elemento sai do DOM (ex.: modal fechado, dom-patch replace/remove)
 *  - o atributo data-champs-ajax-poll é removido (ex.: dom-patch "attr")
 *  - atingiu data-champs-ajax-poll-max
 *  - JS: stopAjaxPoll(el) ou window.Champs.AjaxPoll.stop(el)
 *
 *  O backend encerra o polling devolvendo, na resposta, um dom-patch que
 *  substitui o elemento por um HTML sem data-champs-ajax-poll (ex.: o card
 *  "Conectado" no lugar do card do QR).
 *
 * Eventos:
 *  - champs:ajax:poll:start  detail: { el, interval }
 *  - champs:ajax:poll:stop   detail: { el, reason: 'removed'|'attribute-removed'|'max'|'manual' }
 *
 * Reinicialização: initCore(scope) liga elementos novos (o DomPatch e o
 * ModalManager já chamam initCore no conteúdo inserido). Um elemento nunca é
 * ligado duas vezes.
 */

const MIN_INTERVAL_MS = 1000;

const _polls = new Map(); // Element -> { interval, timer, inFlight, count, max, pauseHidden }
let _visibilityBound = false;

function parseBool(v, fallback = false) {
    if (v === undefined || v === null || v === '') return fallback;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return fallback;
}

function parseInterval(el) {
    const n = parseInt(el.getAttribute('data-champs-ajax-poll') || '', 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.max(MIN_INTERVAL_MS, n);
}

function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

function isPageHidden() {
    return document.visibilityState === 'hidden';
}

function stopReason(el) {
    if (!el.isConnected) return 'removed';
    if (!el.hasAttribute('data-champs-ajax-poll')) return 'attribute-removed';
    return null;
}

function finish(el, reason) {
    const state = _polls.get(el);
    if (!state) return;

    clearTimeout(state.timer);
    _polls.delete(el);
    dispatch('champs:ajax:poll:stop', { el, reason });
}

function schedule(el, delay) {
    const state = _polls.get(el);
    if (!state) return;

    clearTimeout(state.timer);
    state.timer = setTimeout(() => tick(el), delay);
}

async function tick(el) {
    const state = _polls.get(el);
    if (!state || state.inFlight) return;

    const reason = stopReason(el);
    if (reason) {
        finish(el, reason);
        return;
    }

    // aba escondida: não faz nada agora; o visibilitychange retoma depois
    if (state.pauseHidden && isPageHidden()) return;

    state.inFlight = true;
    try {
        await handleAjax(el, { silent: true });
    } catch (e) {
        console.warn('[AjaxPoll] Erro na requisição:', e);
    } finally {
        state.inFlight = false;
    }

    state.count += 1;

    // a própria resposta pode ter removido/substituído o elemento
    const after = stopReason(el);
    if (after) {
        finish(el, after);
        return;
    }

    if (state.max > 0 && state.count >= state.max) {
        finish(el, 'max');
        return;
    }

    schedule(el, state.interval);
}

function bindVisibilityOnce() {
    if (_visibilityBound) return;
    _visibilityBound = true;

    document.addEventListener('visibilitychange', () => {
        if (isPageHidden()) {
            _polls.forEach((state) => {
                if (state.pauseHidden) clearTimeout(state.timer);
            });
            return;
        }

        // voltou: atualiza na hora os que estavam pausados
        _polls.forEach((state, el) => {
            if (state.pauseHidden && !state.inFlight) schedule(el, 0);
        });
    });
}

export function startAjaxPoll(el) {
    if (!el || _polls.has(el)) return;

    const interval = parseInterval(el);
    if (!interval) {
        console.warn('[AjaxPoll] data-champs-ajax-poll inválido (use o intervalo em ms):', el);
        return;
    }

    if (!el.getAttribute('data-champs-ajax-route')) {
        console.warn('[AjaxPoll] data-champs-ajax-route não informado.', el);
        return;
    }

    // polling é leitura: GET por padrão (o AjaxForm usaria POST)
    if (!el.hasAttribute('data-champs-ajax-method')) {
        el.setAttribute('data-champs-ajax-method', 'GET');
    }

    const maxRaw = parseInt(el.getAttribute('data-champs-ajax-poll-max') || '0', 10);

    _polls.set(el, {
        interval,
        timer: null,
        inFlight: false,
        count: 0,
        max: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 0,
        pauseHidden: parseBool(el.getAttribute('data-champs-ajax-poll-pause-hidden'), true),
    });

    bindVisibilityOnce();
    dispatch('champs:ajax:poll:start', { el, interval });

    const immediate = parseBool(el.getAttribute('data-champs-ajax-poll-immediate'), false);
    schedule(el, immediate ? 0 : interval);
}

export function stopAjaxPoll(el) {
    finish(el, 'manual');
}

export function stopAllAjaxPolls() {
    Array.from(_polls.keys()).forEach((el) => finish(el, 'manual'));
}

export function initAjaxPoll(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    const els = [];
    if (root instanceof Element && root.hasAttribute('data-champs-ajax-poll')) {
        els.push(root);
    }
    root.querySelectorAll('[data-champs-ajax-poll]').forEach((el) => els.push(el));

    els.forEach((el) => startAjaxPoll(el));

    window.Champs = window.Champs || {};
    window.Champs.AjaxPoll = {
        start: startAjaxPoll,
        stop: stopAjaxPoll,
        stopAll: stopAllAjaxPolls,
    };
}
