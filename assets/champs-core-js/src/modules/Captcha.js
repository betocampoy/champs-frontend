/**
 * Captcha (Champs Core) — Cloudflare Turnstile
 *
 * Trigger:
 *  - [data-champs-captcha][data-sitekey]  -> desenha o widget (template _captcha.html.twig)
 *
 * Opcional (no mesmo elemento):
 *  - data-theme="auto|light|dark"
 *  - data-size="flexible|normal|compact"
 *  - data-language="auto|pt-br|en|es..."
 *  - data-action="..."
 *
 * Comportamento:
 *  - A API da Cloudflare só é carregada se a página tiver um widget (render=explicit).
 *  - O token vai no campo POST "cf-turnstile-response", dentro do próprio widget.
 *  - Token é de uso único: depois de um envio ajax (champs:ajax:end) o widget do form é
 *    reiniciado, senão o segundo envio (ex.: após erro de validação) seria recusado.
 *  - Conteúdo inserido depois (modal, dom-patch) é coberto por initCaptcha(scope).
 *
 * Evento:
 *  - champs:captcha:error (bubbles) — detail: { code } quando o widget não consegue validar
 */

const API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__champsTurnstileOnload';

let _apiPromise = null;

function loadApi() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (_apiPromise) return _apiPromise;

    _apiPromise = new Promise((resolve, reject) => {
        window.__champsTurnstileOnload = () => resolve(window.turnstile);

        const script = document.createElement('script');
        script.src = API_URL;
        script.async = true;
        script.onerror = () => {
            _apiPromise = null;
            reject(new Error('Turnstile indisponível'));
        };
        document.head.appendChild(script);
    });

    return _apiPromise;
}

function renderWidget(turnstile, el) {
    if (el.dataset.champsCaptchaWidgetId) return;

    const options = {
        sitekey: el.dataset.sitekey,
        theme: el.dataset.theme || 'auto',
        size: el.dataset.size || 'flexible',
        language: el.dataset.language || 'auto',
        'error-callback': (code) => {
            el.dispatchEvent(new CustomEvent('champs:captcha:error', { bubbles: true, detail: { code } }));
            // devolve o controle ao Turnstile (ele mostra a mensagem e tenta de novo)
            return false;
        },
    };
    if (el.dataset.action) options.action = el.dataset.action;

    el.dataset.champsCaptchaWidgetId = turnstile.render(el, options);
}

function resetWidgetsIn(container) {
    if (!window.turnstile || !container?.querySelectorAll) return;

    container.querySelectorAll('[data-champs-captcha][data-champs-captcha-widget-id]').forEach((el) => {
        window.turnstile.reset(el.dataset.champsCaptchaWidgetId);
    });
}

export function initCaptcha(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    const pending = Array.from(root.querySelectorAll('[data-champs-captcha][data-sitekey]'))
        .filter((el) => !el.dataset.champsCaptchaWidgetId);

    if (pending.length) {
        loadApi()
            .then((turnstile) => pending.forEach((el) => renderWidget(turnstile, el)))
            .catch((err) => console.error('[Champs] Captcha:', err));
    }

    if (document.documentElement.dataset.champsCaptchaBound === '1') return;
    document.documentElement.dataset.champsCaptchaBound = '1';

    document.addEventListener('champs:ajax:end', (event) => {
        const trigger = event.detail?.triggerEl;
        if (!trigger) return;

        resetWidgetsIn(trigger.tagName === 'FORM' ? trigger : (trigger.form || trigger.closest?.('form')));
    });
}

export default {
    initCaptcha,
};
