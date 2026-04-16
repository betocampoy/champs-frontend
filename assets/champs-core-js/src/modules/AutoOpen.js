function strToBool(v, fallback = false) {
    if (v === undefined || v === null) return fallback;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return fallback;
}

function getDelay(el) {
    const n = parseInt(el.dataset.champsAutoOpenDelay || '0', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getOnceKey(el) {
    return el.dataset.champsAutoOpenKey || el.id || 'champs-auto-open';
}

function hasOpenedOnce(key) {
    try { return localStorage.getItem(`champs:autoopen:${key}`) === '1'; } catch { return false; }
}
function markOpenedOnce(key) {
    try { localStorage.setItem(`champs:autoopen:${key}`, '1'); } catch {}
}

function shouldOpen(el) {
    const mode = (el.dataset.champsAutoOpen || '').trim().toLowerCase();
    if (mode !== 'onload') return false;

    const once = strToBool(el.dataset.champsAutoOpenOnce, false);
    if (!once) return true;

    const key = getOnceKey(el);
    return !hasOpenedOnce(key);
}

function performOpen(el) {
    const once = strToBool(el.dataset.champsAutoOpenOnce, false);
    if (once) markOpenedOnce(getOnceKey(el));

    // clique “de verdade”, para reaproveitar qualquer trigger existente (BS, AjaxForm, etc.)
    el.click();
}

export function initAutoOpen(scope = document) {
    const els = scope.querySelectorAll('[data-champs-auto-open]');
    if (!els.length) return;

    // aguarda o DOM estabilizar
    requestAnimationFrame(() => {
        els.forEach((el) => {
            if (!shouldOpen(el)) return;
            const delay = getDelay(el);
            setTimeout(() => performOpen(el), delay);
        });
    });
}
