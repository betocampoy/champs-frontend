/**
 * FormFiller (Champs Core)
 *
 * Preenche elementos na tela a partir de um objeto (mapa).
 *
 * Padrão:
 * - Para cada key do objeto: procura elementos pela classe ".{key}"
 *   Ex.: { nome: "Beto" } => preenche todos ".nome"
 *
 * Suporte ao formato de retorno do backend (mantido):
 * - value pode vir como { counter, data } e usa o 1º valor do data
 *
 * Importante:
 * - jsCustomFunction/customFunction FOI REMOVIDO do módulo.
 *   Use action { type: "custom", function: "minhaFuncao", data: {...} } no pipeline.
 */

function unwrapValue(value) {
    // Suporte ao formato { counter, data }
    if (
        value &&
        typeof value === 'object' &&
        value.counter !== undefined &&
        value.data !== undefined
    ) {
        const values = Object.values(value.data || {});
        return values.length > 0 ? values[0] : '';
    }

    if (value === null || value === undefined) return '';
    return value;
}

function fillElements(elements, value) {
    elements.forEach((el) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
            el.value = value;
        } else {
            el.innerHTML = value;
        }
    });
}

export function fillForm(data, scope = document) {
    if (!data || typeof data !== 'object') return;

    const root = scope?.querySelectorAll ? scope : document;

    // warning (para ajudar na migração)
    if (data.jsCustomFunction || data.customFunction) {
        console.warn(
            '[FormFiller] jsCustomFunction/customFunction foi removido. Use action {type:"custom"} no pipeline.'
        );
    }

    for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

        const selector = `.${key}`;
        const elements = root.querySelectorAll(selector);
        if (!elements.length) continue;

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
