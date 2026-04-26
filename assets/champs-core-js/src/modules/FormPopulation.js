/**
 * FormPopulation (Champs Core)
 *
 * Responsável por popular elementos do frontend com base no retorno do backend.
 *
 * Suporta:
 * - select
 * - input / textarea
 * - elementos de texto/html
 * - reset explícito de dependentes
 * - reset em cascata por grupo/nível
 *
 * ------------------------------------------------------------------
 * Formato recomendado:
 *
 * action = {
 *   type: "populate",
 *   target: "#cliente",
 *   kind: "select" | "value" | "text" | "html",
 *   data: ...,
 *   reset: ["#empresa", "#contato"],
 *   options: {
 *     placeholder: "Selecione uma opção",
 *     emptyText: "Nenhum registro encontrado",
 *     clearBefore: true,
 *     enableWhenHasData: true,
 *     preserveValue: false
 *   }
 * }
 *
 * ------------------------------------------------------------------
 * Exemplos:
 *
 * {
 *   target: "#cliente",
 *   kind: "select",
 *   data: [
 *     { id: "1", label: "Cliente A" },
 *     { id: "2", label: "Cliente B", is_selected: true }
 *   ]
 * }
 *
 * {
 *   target: "#documento",
 *   kind: "value",
 *   data: "12345678900"
 * }
 *
 * {
 *   target: "#status",
 *   kind: "text",
 *   data: "Ativo"
 * }
 */

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
}

function resolveElement(target, scope = document) {
    if (!target) return null;
    if (target instanceof Element) return target;

    const root = scope?.querySelector ? scope : document;

    if (typeof target === 'string') {
        if (target.startsWith('#') || target.startsWith('.') || target.startsWith('[')) {
            return root.querySelector(target) || document.querySelector(target);
        }

        return root.getElementById?.(target) || document.getElementById(target);
    }

    return null;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizeSelectItems(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
        return data.map((item) => {
            // objeto estruturado
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                const label =
                    item.label ??
                    item.text ??
                    item.name ??
                    item.descricao ??
                    '';

                if (label === '') {
                    console.warn('[FormPopulation] Item sem label:', item);
                }

                return {
                    id: item.id ?? item.value ?? '',
                    label: String(label),
                    is_selected: Boolean(item.selected ?? item.is_selected),
                    disabled: Boolean(item.disabled),
                    dataset: item.dataset ?? {},
                };
            }

            // valor simples
            return {
                id: item,
                label: String(item ?? ''),
                is_selected: false,
                disabled: false,
                dataset: {},
            };
        });
    }

    // formato { id: label }
    if (typeof data === 'object') {
        return Object.entries(data).map(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const label =
                    value.label ??
                    value.text ??
                    value.name ??
                    value.descricao ??
                    '';

                if (label === '') {
                    console.warn('[FormPopulation] Item sem label:', value);
                }

                return {
                    id: value.id ?? value.value ?? key,
                    label: String(label),
                    is_selected: Boolean(value.selected ?? value.is_selected),
                    disabled: Boolean(value.disabled),
                    dataset: value.dataset ?? {},
                };
            }

            return {
                id: key,
                label: String(value ?? ''),
                is_selected: false,
                disabled: false,
                dataset: {},
            };
        });
    }

    return [];
}

function resetElement(el, config = {}) {
    if (!el) return;

    const tag = el.tagName;
    const emptyText = config.emptyText ?? 'Selecione o campo anterior';
    const disable = config.disable ?? true;

    if (tag === 'SELECT') {
        el.innerHTML = `<option value="" selected>${escapeHtml(emptyText)}</option>`;
        el.disabled = disable;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    if (tag === 'INPUT' || tag === 'TEXTAREA') {
        el.value = '';
        if (disable) el.disabled = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    el.textContent = '';
}

function resetTargets(targets, scope = document, config = {}) {
    toArray(targets).forEach((target) => {
        const el = resolveElement(target, scope);
        resetElement(el, config);
    });
}

function resetCascadeFromElement(sourceEl, scope = document) {
    if (!sourceEl?.dataset) return;

    const group = sourceEl.dataset.champsPopulateGroup;
    const level = parseInt(sourceEl.dataset.champsPopulateLevel || '0', 10);

    if (!group || !level) return;

    const root = scope?.querySelector ? scope : document;
    const siblings = root.querySelectorAll(
        `[data-champs-populate-group="${group}"]`
    );

    siblings.forEach((el) => {
        const elLevel = parseInt(el.dataset.champsPopulateLevel || '0', 10);
        if (elLevel > level) {
            resetElement(el);
        }
    });
}

function updateSelect(selectEl, data, options = {}) {
    const items = normalizeSelectItems(data);
    const placeholder = options.placeholder ?? 'Selecione uma opção';
    const emptyText = options.emptyText ?? 'Nenhum registro encontrado';
    const clearBefore = options.clearBefore !== false;
    const enableWhenHasData = options.enableWhenHasData !== false;
    const preserveValue = options.preserveValue === true;

    const previousValue = preserveValue ? String(selectEl.value ?? '') : null;

    if (clearBefore) {
        selectEl.innerHTML = '';
    }

    if (!items.length) {
        selectEl.innerHTML = `<option value="" selected>${escapeHtml(emptyText)}</option>`;
        selectEl.disabled = true;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    const hasExplicitSelected = items.some((item) => item.is_selected);
    const hasPreservedValue =
        preserveValue &&
        previousValue !== null &&
        items.some((item) => String(item.id) === previousValue);

    const fragments = [];

    if (placeholder !== null) {
        const shouldSelectPlaceholder = !hasExplicitSelected && !hasPreservedValue;

        fragments.push(
            `<option value=""${shouldSelectPlaceholder ? ' selected' : ''}>${escapeHtml(placeholder)}</option>`
        );
    }

    items.forEach((item) => {
        const selected =
            item.is_selected ||
            (preserveValue &&
                previousValue !== null &&
                String(item.id) === previousValue);

        const datasetAttrs = Object.entries(item.dataset || {})
            .map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`)
            .join('');

        fragments.push(
            `<option value="${escapeHtml(item.id)}"${selected ? ' selected' : ''}${item.disabled ? ' disabled' : ''}${datasetAttrs}>${escapeHtml(item.label ?? '')}</option>`
        );
    });

    selectEl.innerHTML = fragments.join('');
    selectEl.disabled = enableWhenHasData ? false : selectEl.disabled;

    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
}

function updateValueField(fieldEl, data) {
    const value =
        typeof data === 'object' && data !== null && 'value' in data
            ? data.value
            : data ?? '';

    if ('value' in fieldEl) {
        fieldEl.value = value;
        fieldEl.dispatchEvent(new Event('input', { bubbles: true }));
        fieldEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function updateText(el, data) {
    el.textContent =
        typeof data === 'object' && data !== null && 'text' in data
            ? data.text
            : String(data ?? '');
}

function updateHtml(el, data) {
    el.innerHTML =
        typeof data === 'object' && data !== null && 'html' in data
            ? data.html
            : String(data ?? '');
}

function inferKind(el, explicitKind) {
    if (explicitKind) return explicitKind;

    const tag = el.tagName;
    if (tag === 'SELECT') return 'select';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return 'value';

    return 'text';
}

export function populateForm(action, scope = document) {
    if (!action) return;

    const root = scope?.querySelector ? scope : document;

    const target = action.target ?? action.selector ?? action.element;
    const targetEl = resolveElement(target, root);

    if (!targetEl) {
        console.warn('[FormPopulation] Target não encontrado.', { target });
        return;
    }

    const kind = inferKind(targetEl, action.kind);
    const data = action.data;
    const options = action.options ?? {};

    if (action.reset) {
        resetTargets(action.reset, root, action.resetOptions ?? {});
    }

    if (action.resetCascade === true) {
        resetCascadeFromElement(targetEl, root);
    }

    switch (kind) {
        case 'select':
            updateSelect(targetEl, data, options);
            break;

        case 'value':
            updateValueField(targetEl, data);
            break;

        case 'html':
            updateHtml(targetEl, data);
            break;

        case 'text':
        default:
            updateText(targetEl, data);
            break;
    }
}

export function populateMany(actions, scope = document) {
    toArray(actions).forEach((action) => {
        populateForm(action, scope);
    });
}

export default {
    populate: populateForm,
    populateMany,
};

export function initFormPopulation(scope = document) {
    return;
}
