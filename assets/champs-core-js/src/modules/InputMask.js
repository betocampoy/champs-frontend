/**
 * Champs Input Mask (JS puro)
 * Tokens:
 *  9 => dígito [0-9]
 *  A => letra [a-zA-Z]
 *  * => alfanumérico [a-zA-Z0-9]
 *
 * Uso:
 *  <input data-champs-mask="(99) 99999-9999">
 *  <input data-champs-mask="999.999.999-99">
 */

function isDigit(ch) {
    return ch >= '0' && ch <= '9';
}
function isAlpha(ch) {
    const code = ch.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}
function isAlnum(ch) {
    return isDigit(ch) || isAlpha(ch);
}

function tokenAccepts(token, ch) {
    if (token === '9') return isDigit(ch);
    if (token === 'A') return isAlpha(ch);
    if (token === '*') return isAlnum(ch);
    return false;
}

/**
 * Aplica máscara a um valor "cru" (raw), retornando o valor mascarado.
 * - Não tenta ser "inteligente" com cursor ainda (primeira versão).
 */
export function applyMask(rawValue, mask) {
    if (!mask) return rawValue ?? '';

    const raw = String(rawValue ?? '');
    let out = '';
    let ri = 0; // raw index

    for (let mi = 0; mi < mask.length; mi++) {
        const m = mask[mi];

        // token
        if (m === '9' || m === 'A' || m === '*') {
            // avança no raw até achar um char que sirva
            while (ri < raw.length && !tokenAccepts(m, raw[ri])) {
                ri++;
            }
            if (ri >= raw.length) break;

            out += raw[ri];
            ri++;
            continue;
        }

        // literal
        out += m;
    }

    return out;
}

/**
 * Pega somente caracteres "candidatos" (remove literais),
 * mas mantém letras/dígitos (o applyMask filtra de novo).
 */
export function stripMaskLiterals(value) {
    return String(value ?? '').replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Inicializa masks em um escopo (default document)
 * Delegação global: escuta input/blur e aplica em qualquer element com data-champs-mask.
 */
export function initInputMask(scope = document) {
    // evita múltiplos binds se initInputMask for chamado várias vezes
    if (scope === document && document.documentElement.dataset.champsInputMaskBound === '1') {
        return;
    }
    if (scope === document) {
        document.documentElement.dataset.champsInputMaskBound = '1';
    }

    const handler = (e) => {
        const el = e.target;
        if (!el || el.tagName !== 'INPUT') return;

        const mask = el.getAttribute('data-champs-mask');
        if (!mask) return;

        const raw = stripMaskLiterals(el.value);
        const masked = applyMask(raw, mask);

        if (masked !== el.value) {
            el.value = masked;
            el.dispatchEvent(new CustomEvent('champs:masked', { bubbles: true, detail: { mask } }));
        }
    };

    // input para “moldar” enquanto digita
    scope.addEventListener('input', handler, true);
    // blur para garantir limpeza final
    scope.addEventListener('blur', handler, true);
}
