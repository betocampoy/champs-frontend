/**
 * Message (Champs Core)
 *
 * Responsável por exibir mensagens globais (alertas/notificações)
 * no topo da página, com suporte a contexto local (ex.: modal atual)
 * e broadcast opcional.
 *
 * Mantém compatibilidade com o CSS atual:
 *
 * - Container: .champs_post_response
 * - Mensagem:  .champs_message + champs_{type}
 * - Barra tempo: .champs_message_time
 *
 * Tipos esperados:
 * - success
 * - error
 * - warning
 * - info
 *
 * API:
 *
 * Message.show(textOrHtml, type?, options?)
 * Message.clear(container?)
 *
 * -------------------------------------------------------------------
 *
 * Segurança:
 * - Por padrão, o conteúdo é tratado como TEXTO (textContent).
 * - HTML só é renderizado se { rawHtml: true } for informado.
 *
 * -------------------------------------------------------------------
 *
 * Opções disponíveis:
 *
 * {
 *   seconds?: number
 *   persist?: boolean
 *   clearBefore?: boolean
 *   container?: Element
 *   rawHtml?: boolean
 *
 *   target?: string
 *   scopeEl?: Element
 *   broadcast?: boolean
 * }
 */

export default class Message {
    static messageContainerClass = 'champs_post_response';
    static messageClass = 'champs_message';
    static timeBarClass = 'champs_message_time';
    static closeButtonClass = 'champs_message_close';
    static contentClass = 'champs_message_content';
    static defaultSecondsToFadeout = 5;
    static baseStyleId = 'champs-message-base-styles';
    static exitAnimationMs = 180;

    /**
     * Exibe uma mensagem.
     *
     * @param {string} textOrHtml
     * @param {'success'|'error'|'warning'|'info'|string} type
     * @param {Object} options
     */
    static show(textOrHtml, type = 'success', options = {}) {
        const {
            seconds,
            persist,
            clearBefore = true,
            container = null,
            rawHtml = false,

            target = null,
            scopeEl = null,
            broadcast = false,
        } = options || {};

        Message.ensureBaseStyles();

        const targets = Message.resolveContainers({
            container,
            target,
            scopeEl,
            broadcast,
        });

        const normalizedType = Message.normalizeType(type);
        const shouldPersist = persist === true || seconds === 0;

        const created = [];

        targets.forEach((currentTarget) => {
            if (!currentTarget) return;

            if (clearBefore) {
                Message.clear(currentTarget);
            }

            const el = document.createElement('div');
            el.className = `${Message.messageClass} champs_${normalizedType}`;
            el.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');
            el.setAttribute('aria-live', normalizedType === 'error' ? 'assertive' : 'polite');

            const content = document.createElement('div');
            content.className = Message.contentClass;

            if (rawHtml === true) {
                content.innerHTML = textOrHtml;
            } else {
                content.textContent = textOrHtml;
            }

            el.appendChild(content);

            if (shouldPersist) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = Message.closeButtonClass;
                closeBtn.setAttribute('aria-label', 'Fechar mensagem');
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', () => {
                    Message.remove(el);
                });
                el.appendChild(closeBtn);
            } else {
                const bar = document.createElement('div');
                bar.className = Message.timeBarClass;
                el.appendChild(bar);
            }

            currentTarget.appendChild(el);

            requestAnimationFrame(() => {
                el.classList.add('is-visible');
            });

            if (!shouldPersist) {
                const s = Number.isFinite(seconds)
                    ? Number(seconds)
                    : Message.defaultSecondsToFadeout;

                Message.animate(el, s);
            }

            created.push(el);
        });

        return broadcast ? created : (created[0] || null);
    }

    /**
     * Resolve os containers de mensagem com prioridade contextual.
     * Agora ignora scopes invisíveis/ocultos.
     */
    static resolveContainers({ container = null, target = null, scopeEl = null, broadcast = false } = {}) {
        if (container instanceof Element) {
            return [container];
        }

        if (!target) {
            return [Message.ensureContainer()];
        }

        const pushUnique = (results, unique, list) => {
            (list || []).forEach((el) => {
                if (!(el instanceof Element)) return;
                if (!Message.isElementVisible(el)) return;
                if (unique.has(el)) return;
                unique.add(el);
                results.push(el);
            });
        };

        // 1) tenta escopo visível mais próximo e semântico
        const closestScope = Message.findClosestVisibleScope(scopeEl);

        if (closestScope) {
            const localMatches = Array.from(closestScope.querySelectorAll(target))
                .filter((el) => el instanceof Element && Message.isElementVisible(el));

            if (localMatches.length) {
                if (broadcast) return localMatches;
                return [localMatches[0]];
            }
        }

        // 2) fallback global visível
        const globalMatches = Array.from(document.querySelectorAll(target))
            .filter((el) => el instanceof Element && Message.isElementVisible(el));

        if (globalMatches.length) {
            if (broadcast) {
                const results = [];
                const unique = new Set();
                pushUnique(results, unique, globalMatches);
                return results;
            }
            return [globalMatches[0]];
        }

        // 3) fallback final
        return [Message.ensureContainer()];
    }

    /**
     * Procura o scope visível mais próximo.
     */
    static findClosestVisibleScope(scopeEl) {
        if (!(scopeEl instanceof Element)) return null;

        const selectors = [
            '[data-champs-message-scope]',
            '.modal',
            '.offcanvas',
            '.tab-pane',
            '.card',
            'form',
        ].join(', ');

        let el = scopeEl;

        while (el && el !== document.body) {
            if (el.matches?.(selectors) && Message.isElementVisible(el)) {
                return el;
            }
            el = el.parentElement;
        }

        return null;
    }

    /**
     * Verifica visibilidade real do elemento.
     */
    static isElementVisible(el) {
        if (!(el instanceof Element)) return false;

        if (el === document.body || el === document.documentElement) {
            return true;
        }

        // Modal Bootstrap: só conta se estiver aberto
        if (el.classList.contains('modal')) {
            return el.classList.contains('show');
        }

        // Offcanvas Bootstrap: só conta se estiver aberto
        if (el.classList.contains('offcanvas')) {
            return el.classList.contains('show');
        }

        // Tab pane: se tiver .tab-pane e não estiver ativa, ignora
        if (el.classList.contains('tab-pane')) {
            if (!el.classList.contains('active') && !el.classList.contains('show')) {
                return false;
            }
        }

        if (el.getAttribute('aria-hidden') === 'true') {
            return false;
        }

        const style = window.getComputedStyle(el);

        if (
            style.display === 'none' ||
            style.visibility === 'hidden'
        ) {
            return false;
        }

        // opacity 0 puro não necessariamente significa invisível funcional,
        // então não vamos bloquear por isso para evitar falso negativo.
        if (el.offsetParent === null && style.position !== 'fixed') {
            return false;
        }

        return true;
    }

    /**
     * Normaliza tipos para evitar variações inesperadas.
     */
    static normalizeType(type) {
        const value = String(type || 'info').toLowerCase().trim();

        if (['success', 'error', 'warning', 'info'].includes(value)) {
            return value;
        }

        return 'info';
    }

    /**
     * Anima barra de tempo e agenda remoção segura.
     */
    static animate(el, seconds) {
        const bar = el.querySelector(`.${Message.timeBarClass}`);
        const ms = Math.max(0, Number(seconds) || 0) * 1000;

        if (bar && ms > 0) {
            bar.animate(
                [{ width: '100%' }, { width: '0%' }],
                {
                    duration: ms,
                    easing: 'linear',
                    fill: 'forwards',
                }
            );
        }

        if (ms <= 0) return;

        Message.clearTimers(el);

        const timer = setTimeout(() => {
            Message.remove(el);
        }, ms);

        el._champsMessageTimer = timer;
    }

    /**
     * Remove com animação de saída, limpando timers.
     */
    static remove(el) {
        if (!el || !el.isConnected) return;

        Message.clearTimers(el);

        el.classList.remove('is-visible');

        const exitTimer = setTimeout(() => {
            if (el && el.isConnected) {
                el.remove();
            }
        }, Message.exitAnimationMs);

        el._champsMessageExitTimer = exitTimer;
    }

    /**
     * Limpa timers associados ao elemento.
     */
    static clearTimers(el) {
        if (!el) return;

        if (el._champsMessageTimer) {
            clearTimeout(el._champsMessageTimer);
            el._champsMessageTimer = null;
        }

        if (el._champsMessageExitTimer) {
            clearTimeout(el._champsMessageExitTimer);
            el._champsMessageExitTimer = null;
        }
    }

    /**
     * Remove todas as mensagens do container.
     */
    static clear(container) {
        const root =
            container ||
            document.querySelector(`.${Message.messageContainerClass}`);

        if (!root) return;

        root
            .querySelectorAll(`.${Message.messageClass}`)
            .forEach((el) => {
                Message.clearTimers(el);
                el.remove();
            });
    }

    /**
     * Garante existência do container global.
     */
    static ensureContainer() {
        let container = document.querySelector(
            `.${Message.messageContainerClass}`
        );

        if (!container) {
            container = document.createElement('div');
            container.className = Message.messageContainerClass;
            document.body.insertBefore(container, document.body.firstChild);
        }

        return container;
    }

    /**
     * Injeta CSS base padrão do champs-core.
     * O projeto pode sobrescrever essas classes no seu próprio CSS.
     */
    static ensureBaseStyles() {
        if (document.getElementById(Message.baseStyleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = Message.baseStyleId;
        style.textContent = `
            .${Message.messageContainerClass}{
                position:sticky;
                top:0;
                z-index:1040;
                display:flex;
                flex-direction:column;
                gap:.75rem;
                padding:.75rem;
                pointer-events:none;
            }

            .${Message.messageClass}{
                position:relative;
                pointer-events:auto;
                width:min(100%, 960px);
                margin:0 auto;
                padding:.875rem 2.75rem 1rem 1rem;
                border:1px solid transparent;
                border-radius:.75rem;
                box-shadow:0 8px 24px rgba(0,0,0,.08);
                font-size:.95rem;
                line-height:1.45;
                background:#fff;
                overflow:hidden;
                opacity:0;
                transform:translateY(-8px) scale(.985);
                transition:
                    opacity .18s ease,
                    transform .18s ease,
                    box-shadow .18s ease;
                will-change:opacity, transform;
            }

            .${Message.messageClass}.is-visible{
                opacity:1;
                transform:translateY(0) scale(1);
            }

            .${Message.messageClass}:hover{
                box-shadow:0 10px 28px rgba(0,0,0,.10);
            }

            .${Message.contentClass}{
                display:block;
                word-break:break-word;
            }

            .${Message.closeButtonClass}{
                position:absolute;
                top:.45rem;
                right:.55rem;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                width:2rem;
                height:2rem;
                padding:0;
                border:0;
                border-radius:.5rem;
                background:transparent;
                color:currentColor;
                font-size:1.35rem;
                line-height:1;
                cursor:pointer;
                opacity:.7;
                transition:opacity .15s ease, background .15s ease, transform .15s ease;
            }

            .${Message.closeButtonClass}:hover{
                opacity:1;
                background:rgba(0,0,0,.06);
                transform:scale(1.03);
            }

            .${Message.closeButtonClass}:focus-visible{
                outline:2px solid currentColor;
                outline-offset:2px;
                opacity:1;
            }

            .${Message.timeBarClass}{
                position:absolute;
                left:0;
                bottom:0;
                height:3px;
                width:100%;
                opacity:.9;
                background:currentColor;
                transform-origin:left center;
            }

            .${Message.messageClass}.champs_success{
                color:#0f5132;
                background:#d1e7dd;
                border-color:#badbcc;
            }

            .${Message.messageClass}.champs_error{
                color:#842029;
                background:#f8d7da;
                border-color:#f5c2c7;
            }

            .${Message.messageClass}.champs_warning{
                color:#664d03;
                background:#fff3cd;
                border-color:#ffecb5;
            }

            .${Message.messageClass}.champs_info{
                color:#055160;
                background:#cff4fc;
                border-color:#b6effb;
            }

            @media (max-width: 576px){
                .${Message.messageContainerClass}{
                    padding:.5rem;
                    gap:.5rem;
                }

                .${Message.messageClass}{
                    width:100%;
                    padding:.8rem 2.5rem .95rem .9rem;
                    border-radius:.625rem;
                    font-size:.92rem;
                }
            }

            @media (prefers-reduced-motion: reduce){
                .${Message.messageClass}{
                    transition:none;
                }

                .${Message.closeButtonClass}{
                    transition:none;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

/**
 * initMessage
 *
 * Mantido para padronização dos módulos Champs.
 * Agora também garante a injeção do CSS base.
 */
export function initMessage(scope = document) {
    Message.ensureBaseStyles();
}