import Loader, { showLoaderFromEl, hideLoaderFromEl, showLoader, hideLoader } from './Loader.js';

let _bound = false;
let _fetchWrapped = false;

let overlayVisible = false;
let showTimer = null;

// contador para múltiplas requisições/navegações simultâneas
let activeCount = 0;

const SHOW_DELAY_MS = 120;
// usado só como "sinal" para BFCache/restore (não é estado definitivo)
const SS_KEY = 'champs_loader_visible';

function nextPaint(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
}

function forceHideAll() {
    try {
        document.querySelectorAll('.champs-loader-overlay').forEach((n) => n.remove());
        document.querySelectorAll('.champs-loader').forEach((n) => n.remove());
    } catch {}
}

function resetState() {
    clearTimeout(showTimer);
    showTimer = null;
    overlayVisible = false;
    activeCount = 0;
    try { sessionStorage.removeItem(SS_KEY); } catch {}
    Loader.hide();
    forceHideAll();
}

/**
 * acquire()
 * Incrementa o contador e mostra o loader (com delay) quando necessário.
 */
function acquire() {
    activeCount += 1;

    if (overlayVisible) {
        try { sessionStorage.setItem(SS_KEY, '1'); } catch {}
        return;
    }

    clearTimeout(showTimer);
    showTimer = setTimeout(() => {
        if (activeCount <= 0) return;

        overlayVisible = true;
        try { sessionStorage.setItem(SS_KEY, '1'); } catch {}
        Loader.show(); // global overlay
    }, SHOW_DELAY_MS);
}

/**
 * release()
 * Decrementa o contador e esconde o loader quando chega em 0.
 */
function release() {
    activeCount -= 1;
    if (activeCount < 0) activeCount = 0;

    if (activeCount > 0) return;

    clearTimeout(showTimer);
    showTimer = null;

    overlayVisible = false;
    try { sessionStorage.removeItem(SS_KEY); } catch {}

    Loader.hide();
    forceHideAll();
}

function shouldBypassForActiveElement() {
    const el = document.activeElement;
    return !!el?.closest?.('[data-champs-no-loader]');
}

function shouldBypassForLinkClick(event) {
    const a = event.target?.closest?.('a[href]');
    if (!a) return false;

    if (
        a.closest('[data-champs-no-loader]') ||
        a.target === '_blank' ||
        a.hasAttribute('download') ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    ) return true;

    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('javascript:')) return true;

    return false;
}

function shouldBypassForFormSubmit(formEl) {
    if (!formEl) return false;
    return !!formEl.closest?.('[data-champs-no-loader]');
}

// === Ajax loader targeting ===
let ajaxLocalTargetEl = null;
let ajaxUsedGlobal = false;
// quando o gatilho pede template global (sem usar acquire/release)
let ajaxDirectGlobal = false;

function resolveAjaxTarget(triggerEl) {
    if (!triggerEl) return null;

    const sel = triggerEl.dataset?.champsLoaderTarget;
    if (sel) {
        const s = String(sel).trim().toLowerCase();

        // "body" e "html" são especiais: queremos overlay GLOBAL (fixed)
        if (s === 'body' || s === 'html' || s === 'document' || s === 'window') {
            return { kind: 'global', el: null };
        }

        const found = document.querySelector(sel);
        if (found) return { kind: 'local', el: found };

        return null;
    }

    // o próprio gatilho vira o target se tiver data-champs-loader
    if (triggerEl.hasAttribute?.('data-champs-loader')) {
        return { kind: 'local', el: triggerEl };
    }

    return null;
}

/**
 * Copia as configs do gatilho para o target (sem exigir JS local)
 * Assim: data-champs-loader-template no BOTÃO funciona mesmo com target em outro elemento.
 */
function applyTriggerLoaderConfigToTarget(triggerEl, targetEl) {
    if (!triggerEl || !targetEl) return;

    const tpl = triggerEl.dataset?.champsLoaderTemplate;
    const mode = triggerEl.dataset?.champsLoaderMode;
    const block = triggerEl.dataset?.champsLoaderBlock;

    // Só aplica se o gatilho informou.
    if (tpl !== undefined) targetEl.dataset.champsLoaderTemplate = tpl;
    if (mode !== undefined) targetEl.dataset.champsLoaderMode = mode;
    if (block !== undefined) targetEl.dataset.champsLoaderBlock = block;
}

export function initNavLoader(_scope = document) {
    if (_bound) return;
    _bound = true;

    // sempre zera qualquer estado visual ao inicializar
    resetState();

    // ✅ FIX de usabilidade (mobile back / BFCache)
    window.addEventListener('pageshow', () => {
        nextPaint(resetState);
    });

    window.addEventListener('beforeunload', () => {
        if (shouldBypassForActiveElement()) return;
        acquire();
        try { sessionStorage.setItem(SS_KEY, '1'); } catch {}
    });

    window.addEventListener('load', resetState);
    window.addEventListener('pagehide', resetState);
    window.addEventListener('unload', resetState);

    document.addEventListener('click', (event) => {
        if (shouldBypassForLinkClick(event)) return;

        const a = event.target?.closest?.('a[href]');
        if (!a) return;

        if (!shouldBypassForActiveElement()) acquire();
    });

    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (shouldBypassForFormSubmit(form)) return;
        if (!shouldBypassForActiveElement()) acquire();
    });

    // Turbo (se estiver presente)
    window.addEventListener('turbo:visit', () => acquire());
    window.addEventListener('turbo:load', resetState);
    window.addEventListener('turbo:render', resetState);

    window.addEventListener('popstate', resetState);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') resetState();
    });

    // ✅ Integração com AjaxForm via eventos
    document.addEventListener('champs:ajax:start', (ev) => {
        if (shouldBypassForActiveElement()) return;

        const triggerEl = ev.detail?.triggerEl || null;
        const targetInfo = resolveAjaxTarget(triggerEl);

        ajaxLocalTargetEl = null;
        ajaxUsedGlobal = false;
        ajaxDirectGlobal = false;

        // Caso 1: target explícito (local ou "global via body/html")
        if (targetInfo) {
            if (targetInfo.kind === 'global') {
                const tpl = triggerEl?.dataset?.champsLoaderTemplate;
                if (tpl) {
                    ajaxDirectGlobal = true;
                    showLoader(null, { template: tpl });
                    return;
                }

                ajaxUsedGlobal = true;
                acquire();
                return;
            }

            // local real
            const targetEl = targetInfo.el;
            if (targetEl) {
                applyTriggerLoaderConfigToTarget(triggerEl, targetEl);

                ajaxLocalTargetEl = targetEl;
                showLoaderFromEl(targetEl);
                return;
            }
        }

        // Caso 2: sem target (fallback global)
        const tpl = triggerEl?.dataset?.champsLoaderTemplate;
        if (tpl) {
            ajaxDirectGlobal = true;
            showLoader(null, { template: tpl });
            return;
        }

        ajaxUsedGlobal = true;
        acquire();
    });

    document.addEventListener('champs:ajax:end', () => {
        nextPaint(() => {
            if (ajaxLocalTargetEl) {
                hideLoaderFromEl(ajaxLocalTargetEl);
                ajaxLocalTargetEl = null;
                return;
            }

            if (ajaxDirectGlobal) {
                ajaxDirectGlobal = false;
                hideLoader();
                forceHideAll();
                return;
            }

            if (ajaxUsedGlobal) {
                ajaxUsedGlobal = false;
                release();
            }
        });
    });

    // fetch opcional: header X-Global-Loader: 1
    if (!_fetchWrapped) {
        _fetchWrapped = true;

        const origFetch = window.fetch;
        window.fetch = async (...args) => {
            let tracked = false;

            try {
                const req = args[0];
                const mark = (typeof req === 'string' ? null : req) || null;

                const wantsGlobal =
                    mark?.headers?.get?.('X-Global-Loader') === '1' ||
                    (mark?.headers && mark.headers['X-Global-Loader'] === '1');

                if (wantsGlobal) {
                    if (!shouldBypassForActiveElement()) acquire();
                    tracked = true;
                }
            } catch {}

            try {
                return await origFetch(...args);
            } finally {
                if (tracked) {
                    nextPaint(() => release());
                }
            }
        };
    }

    try {
        if (sessionStorage.getItem(SS_KEY) === '1') resetState();
    } catch {}
}