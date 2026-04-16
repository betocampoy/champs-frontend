/**
 * ValidationError (Champs Core)
 *
 * Aplica erros de validação em campos de formulário.
 *
 * action esperado:
 * {
 *   type: "validation-error",
 *   message?: string,
 *   fields?: { [fieldName]: string | string[] }
 * }
 *
 * Observação:
 * - fields é opcional.
 *   - se não existir (ou estiver vazio), NÃO marca campos (fica só a mensagem).
 */

function toArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return [v];
    return [];
}

function findFieldEl(root, fieldName) {
    if (!fieldName) return null;

    // 1) por name (preferencial)
    const byName = root.querySelector(`[name="${CSS.escape(fieldName)}"]`);
    if (byName) return byName;

    // 2) fallback por id
    const byId = root.querySelector(`#${CSS.escape(fieldName)}`);
    if (byId) return byId;

    return null;
}

function getScopeRoot(triggerEl) {
    const form = triggerEl?.closest?.('form');
    return form || document;
}

export function clearValidationErrors(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    root.querySelectorAll('.champs-invalid, .is-invalid').forEach((el) => {
        el.classList.remove('champs-invalid');
        el.classList.remove('is-invalid');
    });

    root.querySelectorAll('.champs-validation-feedback').forEach((el) => el.remove());
}

/**
 * Aplica validação por campos (se existirem).
 * Se fields não existir ou estiver vazio, não faz highlight.
 */
export function applyValidationError(action, triggerEl = null) {
    const root = triggerEl ? getScopeRoot(triggerEl) : document;

    const fields = action?.fields;
    const hasFields = fields && typeof fields === 'object' && Object.keys(fields).length > 0;

    if (!hasFields) return;

    clearValidationErrors(root);

    let firstInvalid = null;

    Object.keys(fields).forEach((fieldName) => {
        const input = findFieldEl(root, fieldName);
        if (!input) return;

        if (!firstInvalid) firstInvalid = input;

        input.classList.add('champs-invalid', 'is-invalid');

        const messages = toArray(fields[fieldName]);
        const text = messages.filter(Boolean).join('<br>') || 'Campo inválido.';

        // feedback existente?
        let feedback = input.nextElementSibling;
        const hasFeedback =
            feedback &&
            feedback.classList &&
            (feedback.classList.contains('invalid-feedback') ||
                feedback.classList.contains('champs-validation-feedback'));

        if (!hasFeedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback champs-validation-feedback';
            input.insertAdjacentElement('afterend', feedback);
        }

        feedback.innerHTML = text;
    });

    // foco no primeiro campo inválido
    if (firstInvalid?.focus) firstInvalid.focus();
}
