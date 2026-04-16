/**
 * CopyText (Champs Core)
 *
 * Triggers suportados (prioridade):
 *  1) data-champs-copy-text="..."        -> copia texto direto
 *  2) data-champs-copy-from="#seletor"   -> copia do elemento alvo
 *  3) data-champs-copy                   -> copia do próprio trigger
 *
 * Opcional:
 *  - data-champs-check="#checkbox"       -> marca checkbox após copiar
 *  - data-champs-copied-text="..."       -> texto do feedback (default: Copiado!)
 *
 * Evento:
 *  - champs:copied (bubbles)
 */

function htmlToPlainText(node) {
    if (!node) return '';

    // Inputs / textareas / selects
    if (typeof node.value === 'string') {
        return node.value;
    }

    // Clona para não mexer no DOM real
    const clone = node.cloneNode(true);

    // Converte <br> em quebra de linha
    clone.querySelectorAll('br').forEach((br) => {
        br.replaceWith('\n');
    });

    // Adiciona quebra após elementos de bloco relevantes
    clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach((el) => {
        el.append('\n');
    });

    // textContent fica mais previsível depois da conversão
    return (clone.textContent || '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .trim();
}

async function writeToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!ok) throw new Error('Clipboard indisponível');
}

function dispatchCopied(triggerEl, detail) {
    triggerEl.dispatchEvent(
        new CustomEvent('champs:copied', {
            bubbles: true,
            detail,
        })
    );
}

function markCheckbox(triggerEl, root) {
    const selector = triggerEl.getAttribute('data-champs-check');
    if (!selector) return;

    const checkbox = root.querySelector(selector);
    if (checkbox && checkbox.type === 'checkbox') {
        checkbox.checked = true;
    }
}

function applyFeedback(triggerEl, targetEl = null) {
    const text = triggerEl.getAttribute('data-champs-copied-text') || 'Copiado!';

    // Sempre marca o trigger
    triggerEl.classList.add('champs-copied');
    triggerEl.setAttribute('data-champs-copied-text', text);
    triggerEl.setAttribute('data-champs-copied', '1');

    // Opcionalmente marca também o alvo
    if (targetEl && targetEl !== triggerEl) {
        targetEl.classList.add('champs-copied');
    }

    setTimeout(() => {
        triggerEl.classList.remove('champs-copied');
        triggerEl.removeAttribute('data-champs-copied');

        if (targetEl && targetEl !== triggerEl) {
            targetEl.classList.remove('champs-copied');
        }
    }, 1500);
}

export async function handleCopyText(triggerEl, scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    let text = '';
    let source = '';
    let targetEl = null;

    const direct = triggerEl.getAttribute('data-champs-copy-text');

    if (direct !== null) {
        text = String(direct).trim();
        source = 'direct';
    } else {
        const targetSelector = triggerEl.getAttribute('data-champs-copy-from');

        if (targetSelector) {
            targetEl = root.querySelector(targetSelector);

            if (!targetEl) {
                dispatchCopied(triggerEl, { source: 'from', ok: false });
                return;
            }

            text = htmlToPlainText(targetEl);
            source = 'from';
        } else if (triggerEl.hasAttribute('data-champs-copy')) {
            text = htmlToPlainText(triggerEl);
            source = 'self';
        } else {
            return;
        }
    }

    try {
        await writeToClipboard(text);
        markCheckbox(triggerEl, root);
        applyFeedback(triggerEl, targetEl);

        dispatchCopied(triggerEl, { source, text, ok: true });
    } catch (err) {
        console.error('[Champs] Erro ao copiar:', err);
        dispatchCopied(triggerEl, { source, text, ok: false });
    }
}

export function initCopyText(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    if (root === document && document.documentElement.dataset.champsCopyTextBound === '1') return;
    if (root === document) document.documentElement.dataset.champsCopyTextBound = '1';

    document.addEventListener(
        'click',
        (event) => {
            const trigger = event.target.closest(
                '[data-champs-copy-from], [data-champs-copy-text], [data-champs-copy]'
            );
            if (!trigger) return;

            handleCopyText(trigger, document);
        },
        true
    );
}

export default {
    handleCopyText,
    initCopyText,
};