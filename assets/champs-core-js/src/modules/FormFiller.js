/**
 * FormFiller (Champs Core)
 *
 * Preenche elementos na tela a partir de um objeto (mapa).
 *
 * Resolução semântica da chave:
 * - "campo"              => procura por [name="campo"]
 * - "#campo"             => procura por id
 * - ".campo"             => procura por classe
 * - "[data-x='y']"       => usa seletor CSS direto
 * - "div .campo"         => usa seletor CSS direto
 *
 * Suporte ao formato de retorno do backend:
 * - value pode vir como { counter, data } e usa o 1º valor do data
 *
 * Importante:
 * - jsCustomFunction/customFunction FOI REMOVIDO do módulo.
 *   Use action { type: "custom", function: "minhaFuncao", data: {...} } no pipeline.
 */

function unwrapValue(value) {
    if (
        value &&
        typeof value === 'object' &&
        value.counter !== undefined &&
        value.data !== undefined
    ) {
        const values = Object.values(value.data || {});
        return values.length > 0 ? values[0] : '';
    }

    if (value === null || value === undefined) {
        return '';
    }

    return value;
}

function safeCssEscape(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
        return globalThis.CSS.escape(String(value));
    }

    return String(value).replace(/"/g, '\\"');
}

function isExplicitCssSelector(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }

    const trimmed = key.trim();

    if (!trimmed) {
        return false;
    }

    return (
        trimmed.startsWith('#') ||
        trimmed.startsWith('.') ||
        trimmed.startsWith('[') ||
        trimmed.includes(' ') ||
        trimmed.includes('>') ||
        trimmed.includes('+') ||
        trimmed.includes('~') ||
        trimmed.includes(':')
    );
}

function resolveSelector(key) {
    const normalizedKey = String(key || '').trim();

    if (!normalizedKey) {
        return '';
    }

    if (isExplicitCssSelector(normalizedKey)) {
        return normalizedKey;
    }

    return `[name="${safeCssEscape(normalizedKey)}"]`;
}

function fillElements(elements, value) {
    elements.forEach((el) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
            const type = (el.type || '').toLowerCase();

            if (type === 'checkbox' || type === 'radio') {
                const normalizedValue = String(value ?? '');

                if (Array.isArray(value)) {
                    el.checked = value.map(String).includes(String(el.value));
                } else if (normalizedValue === '1' || normalizedValue === 'true') {
                    el.checked = true;
                } else if (normalizedValue === '0' || normalizedValue === 'false' || normalizedValue === '') {
                    el.checked = false;
                } else {
                    el.checked = String(el.value) === normalizedValue;
                }

                el.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        el.innerHTML = value;
    });
}

export function fillForm(data, scope = document) {
    if (!data || typeof data !== 'object') {
        return;
    }

    const root = scope?.querySelectorAll ? scope : document;

    if (data.jsCustomFunction || data.customFunction) {
        console.warn(
            '[FormFiller] jsCustomFunction/customFunction foi removido. Use action {type:"custom"} no pipeline.'
        );
    }

    for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
            continue;
        }

        const selector = resolveSelector(key);

        if (!selector) {
            continue;
        }

        let elements = [];

        try {
            elements = root.querySelectorAll(selector);
        } catch (error) {
            console.warn('[FormFiller] seletor inválido:', selector, error);
            continue;
        }

        if (!elements.length) {
            continue;
        }

        const value = unwrapValue(data[key]);
        fillElements(elements, value);
    }
}

export default {
    fill: fillForm,
};

// padrão do projeto
export function initFormFiller(scope = document) {
    return;
}