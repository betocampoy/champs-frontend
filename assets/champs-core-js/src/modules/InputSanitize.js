/**
 * Champs Core - InputSanitize
 *
 * Atributos:
 *  - data-champs-sanitize
 *  - data-champs-sanitize-trim
 *  - data-champs-sanitize-collapse-spaces
 *  - data-champs-sanitize-no-spaces
 *  - data-champs-sanitize-normalize
 *  - data-champs-sanitize-upper
 *  - data-champs-sanitize-lower
 *  - data-champs-sanitize-max="N"
 *
 * NOVOS:
 *  - data-champs-sanitize-allowed-pattern="[^0-9xX]"
 *      Remove tudo que bater com o pattern informado.
 *
 *  - data-champs-sanitize-document
 *      Alias semântico para documentos que aceitam apenas números e X.
 *      Equivale a: remove tudo que não for [0-9xX] + upper.
 *
 * Eventos:
 *  - champs:sanitized (bubbles) detail: options efetivas aplicadas
 */

// Remove acentos usando Unicode normalization (NFD) + remoção de diacríticos
export function normalizeAccents(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function applyAllowedPattern(value, pattern) {
    if (!pattern) return value;

    try {
        const regex = new RegExp(pattern, 'g');
        return value.replace(regex, '');
    } catch (e) {
        console.warn('[InputSanitize] allowed-pattern inválido:', pattern, e);
        return value;
    }
}

export function sanitize(value, options = {}) {
    let v = String(value ?? '');

    // Alias semântico: documento => só números e X + upper
    if (options.document) {
        v = v.replace(/[^0-9xX]/g, '');
        options.upper = true;
    }

    // Pattern customizável
    if (options.allowedPattern) {
        v = applyAllowedPattern(v, options.allowedPattern);
    }

    // Normaliza NBSP (copiado de Word/WhatsApp, etc.) para espaço normal
    v = v.replace(/\u00A0/g, ' ');

    // Espaços: prioridade é "noSpaces" (remove tudo). Senão, pode colapsar.
    if (options.noSpaces) {
        v = v.replace(/\s+/g, '');
    } else if (options.collapseSpaces) {
        v = v.replace(/\s+/g, ' ');
    }

    if (options.trim) {
        v = v.trim();
    }

    if (options.normalize) {
        v = normalizeAccents(v);
    }

    // Se upper e lower vierem juntos, upper vence
    if (options.lower && !options.upper) {
        v = v.toLowerCase();
    }
    if (options.upper) {
        v = v.toUpperCase();
    }

    if (options.max != null && options.max !== '') {
        const max = Number(options.max);
        if (!Number.isNaN(max) && max >= 0) {
            v = v.substring(0, max);
        }
    }

    return v;
}

export function extractSanitizeOptions(el) {
    return {
        upper: el.hasAttribute('data-champs-sanitize-upper'),
        lower: el.hasAttribute('data-champs-sanitize-lower'),
        trim: el.hasAttribute('data-champs-sanitize-trim'),
        normalize: el.hasAttribute('data-champs-sanitize-normalize'),
        max: el.getAttribute('data-champs-sanitize-max'),
        noSpaces: el.hasAttribute('data-champs-sanitize-no-spaces'),
        collapseSpaces: el.hasAttribute('data-champs-sanitize-collapse-spaces'),

        // novos
        allowedPattern: el.getAttribute('data-champs-sanitize-allowed-pattern'),
        document: el.hasAttribute('data-champs-sanitize-document'),
    };
}

/**
 * Delegação global:
 * - escuta input e blur no document
 * - funciona para campos adicionados dinamicamente (modais, ajax, etc.)
 * - aplica regras "suaves" no input
 * - aplica trim/collapseSpaces no blur
 */
export function initInputSanitize(_scope = document) {
    if (document.documentElement.dataset.champsSanitizeBound === '1') {
        return;
    }

    document.documentElement.dataset.champsSanitizeBound = '1';

    const handler = (e) => {
        const el = e.target;
        if (!el || el.tagName !== 'INPUT') return;
        if (!el.hasAttribute('data-champs-sanitize')) return;

        const options = extractSanitizeOptions(el);
        const isBlur = e.type === 'blur';

        const effectiveOptions = {
            ...options,
            trim: isBlur ? options.trim : false,
            collapseSpaces: isBlur ? options.collapseSpaces : false,
        };

        const original = el.value;
        const sanitized = sanitize(original, effectiveOptions);

        if (sanitized !== original) {
            el.value = sanitized;

            el.dispatchEvent(new CustomEvent('champs:sanitized', {
                bubbles: true,
                detail: effectiveOptions,
            }));
        }
    };

    document.addEventListener('input', handler, true);
    document.addEventListener('blur', handler, true);
}