import { initCore } from '../init.js';

/**
 * Champs Core - ModalManager (V3.6.2 - reinicialização do core em conteúdo dinâmico)
 *
 * ✅ Suporta múltiplos modais (stack) sem conflitar backdrop
 * ✅ NÃO depende de Bootstrap (fallback sempre funciona)
 * ✅ Se vier HTML Bootstrap (.modal) mas NÃO houver BS5 (bootstrap.Modal), converte para modal Champs gerado
 * ✅ Gera IDs únicos automaticamente quando action.id não é informado
 * ✅ Botões dinâmicos:
 *    - actions (pipeline via ctx.executeActions)
 *    - attrs (data-*) aplicados no botão (gatilhos champs)
 *    - data-champs-modal-close-on-action="true" (fecha ANTES da action)
 * ✅ confirm(opts) -> Promise<boolean> (por padrão size="sm")
 * ✅ action.type="modal":
 *    - html parcial => injeta no modal gerado
 *    - html completo + full=true => usa o modal completo enviado pelo backend
 *      quando houver Bootstrap 5 disponível
 * ✅ Botão gatilho do AjaxForm:
 *    - disable por padrão durante a requisição
 *    - reenable por padrão após o retorno
 *
 * ✅ NOVO:
 *    - foco automático ao abrir modal
 *    - confirm() usa modal Bootstrap quando Bootstrap estiver disponível
 *    - confirm() fallback foca no botão Confirmar e não renderiza X
 *    - modais comuns focam no primeiro input visível; se não houver, primeiro botão útil
 *    - histórico de foco com stack
 *    - restauração inteligente do foco ao fechar
 *
 * ✅ CORREÇÃO V3.6.2:
 *    - reinicializa initCore() no conteúdo dinâmico do modal
 *    - RemoteSelect, AjaxForm, ZipcodeSearch, máscaras etc. passam a funcionar em modais injetados
 */

const modalStack = []; // [{ modalEl, backdropEl, action, ctx, escHandler, bsModal }]
const focusHistoryStack = []; // [HTMLElement]

export function openModal(action = {}, ctx = {}) {
    if (action?.html) return openHtmlModal(action, ctx);
    return openGeneratedModal(action, ctx);
}

export function confirm(opts = {}, ctx = {}) {
    return new Promise((resolve) => {
        const Bootstrap = getBootstrap();

        if (Bootstrap?.Modal) {
            const modalId = uniqueId('champs-confirm');
            const size = String(opts.size || 'sm').toLowerCase();
            const modalSizeClass =
                size === 'sm' ? 'modal-sm'
                    : size === 'lg' ? 'modal-lg'
                        : size === 'xl' ? 'modal-xl'
                            : '';

            const html = `
<div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog ${modalSizeClass} modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${opts.title || 'Confirmação'}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        ${opts.body || '<p>Deseja continuar?</p>'}
      </div>
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          data-champs-modal-btn
          data-role="cancel"
        >
          ${opts.cancelText || 'Cancelar'}
        </button>

        <button
          type="button"
          class="btn btn-primary"
          data-champs-modal-btn
          data-role="confirm"
        >
          ${opts.confirmText || 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
</div>`;

            openModal(
                {
                    type: 'modal',
                    id: modalId,
                    html,
                    full: true,
                    confirmMode: true,
                    closeOnBackdrop: opts.closeOnBackdrop ?? true,
                    closeOnEsc: opts.closeOnEsc ?? true,
                    destroyOnClose: true,
                },
                { ...ctx, _resolveConfirm: resolve }
            );

            return;
        }

        const action = {
            type: 'modal',
            id: uniqueId('champs-confirm'),
            title: opts.title || 'Confirmação',
            body: opts.body || '<p>Deseja continuar?</p>',
            size: opts.size || 'sm',
            closeOnBackdrop: opts.closeOnBackdrop ?? true,
            closeOnEsc: opts.closeOnEsc ?? true,
            destroyOnClose: true,
            confirmMode: true,
            hideCloseButton: true,
            buttons: [
                {
                    text: opts.cancelText || 'Cancelar',
                    role: 'cancel',
                    class: opts.cancelClass || 'champs-btn-secondary',
                    closeOnAction: true,
                },
                {
                    text: opts.confirmText || 'Confirmar',
                    role: 'confirm',
                    class: opts.confirmClass || 'champs-btn-primary',
                    closeOnAction: true,
                },
            ],
        };

        openModal(action, { ...ctx, _resolveConfirm: resolve });
    });
}

/* ============================= */
/*  HTML COMPLETO DO BACKEND     */
/* ============================= */

function openHtmlModal(action, ctx) {
    const rawHtml = String(action.html || '').trim();
    if (!rawHtml) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawHtml;

    const first = wrapper.firstElementChild;
    const Bootstrap = getBootstrap();
    const wantsFullHtml = action?.full === true || String(action?.mode || '').toLowerCase() === 'full';

    if (wantsFullHtml && first && first.classList?.contains('modal') && Bootstrap?.Modal) {
        document.body.appendChild(first);
        initCore(first);
        showModal(first, action, ctx);
        return;
    }

    if (first && first.classList?.contains('modal') && Bootstrap?.Modal) {
        document.body.appendChild(first);
        initCore(first);
        showModal(first, action, ctx);
        return;
    }

    const convertedAction = {
        ...action,
        html: null,
        id: action.id || uniqueId('champs-modal'),
        title: action.title || '',
        body: action.body || rawHtml,
        buttons: Array.isArray(action.buttons) ? action.buttons : null,
    };

    openGeneratedModal(convertedAction, ctx);
}

/* ============================= */
/*  MODAL GERADO PELO JS         */
/* ============================= */

function openGeneratedModal(action, ctx) {
    const id = action.id || uniqueId('champs-modal');

    const modalEl = document.createElement('div');
    modalEl.id = id;
    modalEl.className = 'champs-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    const sizeClass = action.size ? `champs-modal-${String(action.size).toLowerCase()}` : '';
    const buttonsHtml = buildButtonsHtml(action.buttons);

    modalEl.innerHTML = `
    <div class="champs-modal-dialog ${sizeClass}">
      <div class="champs-modal-content">
        <div class="champs-modal-header">
          <h5 class="champs-modal-title">${action.title || ''}</h5>
          ${
        action.hideCloseButton
            ? ''
            : '<button type="button" class="champs-modal-x" data-champs-modal-close aria-label="Fechar">&times;</button>'
    }
        </div>

        <div class="champs-modal-body">
          ${action.body || ''}
        </div>

        <div class="champs-modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modalEl);
    initCore(modalEl);
    showModal(modalEl, action, ctx);
}

/* ============================= */
/*  BOTÕES                       */
/* ============================= */

function buildButtonsHtml(buttons) {
    const list = Array.isArray(buttons) ? buttons : null;

    if (!list || list.length === 0) {
        return `
      <button type="button"
              class="champs-btn champs-btn-secondary"
              data-champs-modal-close
              data-role="close">
        Fechar
      </button>
    `;
    }

    return list
        .map((b, i) => {
            const text = b?.text ?? `Botão ${i + 1}`;
            const role = (b?.role ?? 'action').toLowerCase();
            const cls = b?.class ? `champs-btn ${b.class}` : 'champs-btn champs-btn-secondary';

            const actionsJson = b?.actions ? encodeURIComponent(JSON.stringify(b.actions)) : '';
            const actionsAttr = actionsJson ? ` data-actions="${actionsJson}"` : '';

            const dataAttrs = buildDataAttrs(b?.attrs);

            const closeOnAction = b?.closeOnAction === true;
            const closeOnActionAttr = closeOnAction ? ` data-champs-modal-close-on-action="true"` : '';

            return `
        <button
          type="button"
          class="${cls}"
          data-champs-modal-btn
          data-role="${role}"
          ${actionsAttr}
          ${closeOnActionAttr}
          ${dataAttrs}
        >${text}</button>
      `;
        })
        .join('');
}

function buildDataAttrs(attrs) {
    if (!attrs || typeof attrs !== 'object') return '';

    return Object.entries(attrs)
        .map(([k, v]) => {
            const key = String(k).trim();
            if (!key.startsWith('data-')) return '';

            let val = v;
            if (val === true) val = 'true';
            if (val === false) val = 'false';
            if (val === null || val === undefined) val = '';

            return `${key}="${escapeAttr(String(val))}"`;
        })
        .filter(Boolean)
        .join(' ');
}

function escapeAttr(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

/* ============================= */
/*  SHOW                         */
/* ============================= */

function showModal(modalEl, action, ctx) {
    const Bootstrap = getBootstrap();

    if (Bootstrap?.Modal && modalEl.classList.contains('modal')) {
        activateBootstrapModal(modalEl, action, ctx, Bootstrap);
        return;
    }

    activateFallback(modalEl, action, ctx);
}

/* ============================= */
/*  BOOTSTRAP MODAL              */
/* ============================= */

function activateBootstrapModal(modalEl, action, ctx, Bootstrap) {
    const existing = Bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: action.closeOnBackdrop === false ? 'static' : true,
        keyboard: action.closeOnEsc !== false,
        focus: false,
    });

    wireModalButtons(modalEl, action, ctx, 'bootstrap');

    wireBootstrapDismiss(modalEl, action, ctx);

    const previouslyFocusedEl =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

    pushFocusHistory(previouslyFocusedEl);

    if (previouslyFocusedEl) {
        try {
            previouslyFocusedEl.blur();
        } catch {}
    }

    const stackEntry = {
        modalEl,
        backdropEl: null,
        action,
        ctx,
        escHandler: null,
        bsModal: existing,
    };

    modalStack.push(stackEntry);

    const onShown = () => {
        requestAnimationFrame(() => {
            focusModalEntry(modalEl, action);
        });
        modalEl.removeEventListener('shown.bs.modal', onShown);
    };

    existing.show();
    modalEl.addEventListener('shown.bs.modal', onShown);
}

function wireBootstrapDismiss(modalEl, action, ctx) {
    modalEl.querySelectorAll('[data-bs-dismiss="modal"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!isTopModal(modalEl)) return;
            closeTopBootstrap('cancel');
        });
    });
}

function closeTopBootstrap(reason = 'close') {
    return new Promise((resolve) => {
        const top = modalStack[modalStack.length - 1];
        if (!top || !top.bsModal) {
            resolve();
            return;
        }

        const { modalEl, action, ctx, bsModal } = top;

        const onHidden = () => {
            const idx = modalStack.findIndex((item) => item.modalEl === modalEl);
            if (idx >= 0) {
                modalStack.splice(idx, 1);
            }

            modalEl.removeEventListener('hidden.bs.modal', onHidden);

            if (action.destroyOnClose !== false) {
                modalEl.remove();
            }

            if (typeof ctx._resolveConfirm === 'function') {
                if (reason === 'confirm') {
                    ctx._resolveConfirm(true);
                } else {
                    ctx._resolveConfirm(false);
                }
                ctx._resolveConfirm = null;
            }

            restoreBestAvailableFocus();
            resolve();
        };

        modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
        bsModal.hide();
    });
}

function wireModalButtons(modalEl, action, ctx, mode = 'fallback') {
    modalEl.querySelectorAll('[data-champs-modal-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!isTopModal(modalEl)) return;

            if (mode === 'bootstrap') {
                closeTopBootstrap('close');
            } else {
                closeTopFallback('close');
            }
        });
    });

    modalEl.querySelectorAll('[data-champs-modal-btn]').forEach((btn) => {
        btn.addEventListener('click', () => handleModalButtonClick(btn, action, ctx, mode));
    });
}

function isTopModal(modalEl) {
    const top = modalStack[modalStack.length - 1];
    return !!top && top.modalEl === modalEl;
}

/* ============================= */
/*  FALLBACK CSS (auto)          */
/* ============================= */

function ensureModalFallbackStyles() {
    if (document.getElementById('champs-modal-fallback-style')) return;

    const style = document.createElement('style');
    style.id = 'champs-modal-fallback-style';
    style.textContent = `
      .champs-modal-open{ overflow: hidden; }

      .champs-modal-backdrop{
        position: fixed; inset: 0;
        background: rgba(0,0,0,.45);
        opacity: 0;
        transition: opacity .15s ease;
      }
      .champs-modal-backdrop.show{ opacity: 1; }

      .champs-modal{
        position: fixed; inset: 0;
        display: grid;
        place-items: center;
        opacity: 0;
        transition: opacity .15s ease;
        pointer-events: none;
        padding: 18px;
        box-sizing: border-box;
      }
      .champs-modal.show{
        opacity: 1;
        pointer-events: auto;
      }

      .champs-modal-dialog{
        width: clamp(360px, 92vw, 560px);
      }

      .champs-modal-content{
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(0,0,0,.08);
        box-shadow: 0 18px 40px rgba(0,0,0,.18);
        overflow: hidden;
      }
      .champs-modal-header,
      .champs-modal-body,
      .champs-modal-footer{
        padding: 14px 16px;
      }
      .champs-modal-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-bottom: 1px solid rgba(0,0,0,.08);
        gap: 12px;
      }
      .champs-modal-title{
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .champs-modal-footer{
        display:flex;
        gap: 10px;
        justify-content:flex-end;
        border-top: 1px solid rgba(0,0,0,.08);
        flex-wrap: wrap;
      }
      .champs-modal-x{
        border: 0;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        line-height: 1;
        padding: 6px 10px;
        border-radius: 10px;
      }
      .champs-modal-x:hover{
        background: rgba(0,0,0,.06);
      }

      .champs-btn{
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,.12);
        background: #f7f7f7;
        cursor: pointer;
      }
      .champs-btn-primary{
        background: #0d6efd;
        color: #fff;
        border-color: #0d6efd;
      }
      .champs-btn-secondary{
        background: #f7f7f7;
        color: #222;
      }

      .champs-modal-sm .champs-modal-dialog{ width: clamp(320px, 92vw, 420px); }
      .champs-modal-lg .champs-modal-dialog{ width: clamp(520px, 92vw, 920px); }
      .champs-modal-xl .champs-modal-dialog{ width: clamp(520px, 94vw, 1140px); }
    `;
    document.head.appendChild(style);
}

/* ============================= */
/*  FALLBACK STACK               */
/* ============================= */

function activateFallback(modalEl, action, ctx) {
    ensureModalFallbackStyles();

    const previouslyFocusedEl =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

    pushFocusHistory(previouslyFocusedEl);

    if (previouslyFocusedEl) {
        try {
            previouslyFocusedEl.blur();
        } catch {}
    }

    const imp = (el, prop, value) => el.style.setProperty(prop, value, 'important');

    modalEl.classList.add('champs-modal');

    imp(modalEl, 'position', 'fixed');
    imp(modalEl, 'top', '0');
    imp(modalEl, 'right', '0');
    imp(modalEl, 'bottom', '0');
    imp(modalEl, 'left', '0');
    imp(modalEl, 'inset', '0');

    imp(modalEl, 'width', '100%');
    imp(modalEl, 'height', '100%');
    imp(modalEl, 'min-height', '100vh');

    imp(modalEl, 'display', 'grid');
    imp(modalEl, 'place-items', 'center');
    imp(modalEl, 'align-items', 'center');
    imp(modalEl, 'justify-items', 'center');

    imp(modalEl, 'margin', '0');
    imp(modalEl, 'padding', '18px');
    imp(modalEl, 'box-sizing', 'border-box');
    imp(modalEl, 'pointer-events', 'none');

    const dialogEl = modalEl.querySelector('.champs-modal-dialog');
    if (dialogEl) {
        imp(dialogEl, 'position', 'relative');
        imp(dialogEl, 'top', 'auto');
        imp(dialogEl, 'left', 'auto');
        imp(dialogEl, 'right', 'auto');
        imp(dialogEl, 'bottom', 'auto');
        imp(dialogEl, 'transform', 'none');
        imp(dialogEl, 'justify-self', 'center');
        imp(dialogEl, 'align-self', 'center');
        imp(dialogEl, 'margin', '0');

        const size = String(action?.size || '').toLowerCase();
        if (size === 'sm') imp(dialogEl, 'width', 'clamp(320px, 92vw, 420px)');
        if (size === 'lg') imp(dialogEl, 'width', 'clamp(520px, 92vw, 920px)');
        if (size === 'xl') imp(dialogEl, 'width', 'clamp(520px, 94vw, 1140px)');
    }

    const closeOnBackdrop = action.closeOnBackdrop !== false;
    const closeOnEsc = action.closeOnEsc !== false;

    const level = modalStack.length;

    const backdropEl = document.createElement('div');
    backdropEl.className = 'champs-modal-backdrop';
    backdropEl.style.zIndex = String(1040 + level * 20);

    modalEl.style.zIndex = String(1050 + level * 20);

    document.body.appendChild(backdropEl);
    document.body.classList.add('champs-modal-open');

    requestAnimationFrame(() => {
        modalEl.classList.add('show');
        backdropEl.classList.add('show');
        imp(modalEl, 'pointer-events', 'auto');

        requestAnimationFrame(() => {
            focusModalEntry(modalEl, action);
        });
    });

    const escHandler = (e) => {
        if (e.key !== 'Escape') return;
        const top = modalStack[modalStack.length - 1];
        if (!top) return;
        if (top.modalEl !== modalEl) return;
        if (!closeOnEsc) return;

        closeTopFallback('cancel');
    };

    document.addEventListener('keydown', escHandler);

    if (closeOnBackdrop) {
        backdropEl.addEventListener('click', () => {
            const top = modalStack[modalStack.length - 1];
            if (!top) return;
            if (top.modalEl !== modalEl) return;

            closeTopFallback('cancel');
        });
    }

    wireModalButtons(modalEl, action, ctx, 'fallback');

    modalStack.push({ modalEl, backdropEl, action, ctx, escHandler, bsModal: null });
}

async function handleModalButtonClick(btn, action, ctx, mode = 'fallback') {
    const role = (btn.getAttribute('data-role') || 'action').toLowerCase();

    const shouldCloseOnAction =
        (btn.getAttribute('data-champs-modal-close-on-action') || '').toLowerCase() === 'true';

    if (role === 'confirm') {
        if (mode === 'bootstrap') {
            await closeTopBootstrap('confirm');
        } else {
            if (typeof ctx._resolveConfirm === 'function') ctx._resolveConfirm(true);
            await closeTopFallback('confirm');
        }
        return;
    }

    if (role === 'cancel') {
        if (mode === 'bootstrap') {
            await closeTopBootstrap('cancel');
        } else {
            if (typeof ctx._resolveConfirm === 'function') ctx._resolveConfirm(false);
            await closeTopFallback('cancel');
        }
        return;
    }

    if (role === 'close') {
        if (mode === 'bootstrap') {
            await closeTopBootstrap('close');
        } else {
            await closeTopFallback('close');
        }
        return;
    }

    const encoded = btn.getAttribute('data-actions') || '';

    if (shouldCloseOnAction) {
        if (mode === 'bootstrap') {
            await closeTopBootstrap('action');
        } else {
            await closeTopFallback('action');
        }
    }

    if (encoded && typeof ctx.executeActions === 'function') {
        try {
            const actionsList = JSON.parse(decodeURIComponent(encoded));
            if (Array.isArray(actionsList) && actionsList.length) {
                await ctx.executeActions(actionsList);
            }
        } catch (e) {
            console.warn('[ModalManager] actions inválidas no botão', e);
        }
    }
}

function closeTopFallback(reason = 'close') {
    return new Promise((resolve) => {
        const top = modalStack.pop();
        if (!top) {
            resolve();
            return;
        }

        const { modalEl, backdropEl, action, ctx, escHandler } = top;

        modalEl.style.pointerEvents = 'none';
        modalEl.style.opacity = '0';
        backdropEl.style.opacity = '0';

        modalEl.classList.remove('show');
        backdropEl.classList.remove('show');

        document.removeEventListener('keydown', escHandler);

        setTimeout(() => {
            backdropEl.remove();

            if (action.destroyOnClose !== false) {
                modalEl.remove();
            }

            if (modalStack.length === 0) {
                document.body.classList.remove('champs-modal-open');
            }

            if (typeof ctx._resolveConfirm === 'function' && reason !== 'confirm') {
                ctx._resolveConfirm(false);
                ctx._resolveConfirm = null;
            }

            restoreBestAvailableFocus();
            resolve();
        }, 200);
    });
}

/* ============================= */
/*  BOOTSTRAP DETECTION          */
/* ============================= */

function getBootstrap() {
    if (globalThis.bootstrap?.Modal) return globalThis.bootstrap;
    if (globalThis.Bootstrap?.Modal) return globalThis.Bootstrap;
    return null;
}

/* ============================= */
/*  FOCUS                        */
/* ============================= */

function canReceiveFocus(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (!document.contains(el)) return false;
    if (el.hidden) return false;
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;

    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;

    return true;
}

function pushFocusHistory(el) {
    if (!canReceiveFocus(el)) return;

    const last = focusHistoryStack[focusHistoryStack.length - 1];
    if (last === el) return;

    focusHistoryStack.push(el);
}

function restoreFocusFromHistory() {
    while (focusHistoryStack.length > 0) {
        const candidate = focusHistoryStack.pop();
        if (!canReceiveFocus(candidate)) continue;

        try {
            candidate.focus();
            return true;
        } catch {}
    }

    return false;
}

function getFocusableElements(container) {
    if (!container) return [];

    const selector = [
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'button:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll(selector)).filter(canReceiveFocus);
}

function focusModalEntry(modalEl, action = {}) {
    if (!modalEl) return;

    const preferConfirm = action?.confirmMode === true || action?.preferConfirmFocus === true;

    if (preferConfirm) {
        const confirmBtn = modalEl.querySelector('[data-role="confirm"]');
        if (canReceiveFocus(confirmBtn)) {
            try {
                confirmBtn.focus();
                return;
            } catch {}
        }

        const cancelBtn = modalEl.querySelector('[data-role="cancel"]');
        if (canReceiveFocus(cancelBtn)) {
            try {
                cancelBtn.focus();
                return;
            } catch {}
        }
    }

    const focusables = getFocusableElements(modalEl);

    const firstField = focusables.find((el) =>
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
    );

    if (firstField) {
        try {
            firstField.focus();
            return;
        } catch {}
    }

    const firstActionButton = focusables.find((el) => {
        if (el.tagName !== 'BUTTON') return false;
        if (el.hasAttribute('data-champs-modal-close')) return false;
        if (el.classList.contains('btn-close')) return false;
        return true;
    });

    if (firstActionButton) {
        try {
            firstActionButton.focus();
            return;
        } catch {}
    }

    const firstFocusable = focusables[0];
    if (firstFocusable) {
        try {
            firstFocusable.focus();
            return;
        } catch {}
    }

    if (!modalEl.hasAttribute('tabindex')) {
        modalEl.setAttribute('tabindex', '-1');
    }

    try {
        modalEl.focus();
    } catch {}
}

function restoreBestAvailableFocus() {
    const nextTop = modalStack[modalStack.length - 1];

    if (nextTop?.modalEl) {
        requestAnimationFrame(() => {
            focusModalEntry(nextTop.modalEl, nextTop.action);
        });
        return;
    }

    restoreFocusFromHistory();
}

/* ============================= */
/*  UTIL                         */
/* ============================= */

function uniqueId(prefix = 'champs') {
    const rand =
        (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${rand}`;
}

export default { openModal, confirm };