/**
 * ZipcodeSearch (Champs Core)
 *
 * Dispara busca no ViaCEP e preenche campos relacionados via data-attributes.
 *
 * CEP input:
 *  - data-champs-zipcode
 *  - data-champs-zipcode-group="endereco1" (recomendado)
 *  - data-champs-zipcode-trigger="change|blur|input" (opcional; default change)
 *
 * Comportamento em erro:
 *  - data-champs-zipcode-refocus-on-error="true|false" (default: false)
 *  - data-champs-zipcode-clear-on-error="true|false" (default: false)
 *  - data-champs-zipcode-invalid-message="..."
 *  - data-champs-zipcode-not-found-message="..."
 *
 * Campos de destino:
 *  - data-champs-zipcode-field="street|neighborhood|city|city_code|state|gia|siafi|unit|complement|stateName|region|ddd|error|json"
 *  - data-champs-zipcode-group="endereco1" (se usar grupos)
 *
 * Evento:
 *  - champs:zipcode (bubbles) detail: { zip, data?, error? }
 */

const VIA_CEP_URL = 'https://viacep.com.br/ws';

function getTrigger(el) {
    return el.getAttribute('data-champs-zipcode-trigger') || 'change';
}

function getGroup(el) {
    return el.getAttribute('data-champs-zipcode-group') || '';
}

function normalizeZip(value) {
    return String(value ?? '').replace(/\D/g, '');
}

function isValidZip(zip) {
    return /^[0-9]{8}$/.test(zip);
}

function parseBool(value, defaultValue = false) {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return defaultValue;
}

function shouldRefocusOnError(el) {
    return parseBool(el.getAttribute('data-champs-zipcode-refocus-on-error'), false);
}

function shouldClearOnError(el) {
    return parseBool(el.getAttribute('data-champs-zipcode-clear-on-error'), false);
}

function getInvalidMessage(el) {
    return el.getAttribute('data-champs-zipcode-invalid-message')
        || 'CEP inválido. Digite 8 números.';
}

function getNotFoundMessage(el) {
    return el.getAttribute('data-champs-zipcode-not-found-message')
        || 'CEP não encontrado. Continue o preenchimento manual.';
}

function findFieldTargets(root, group, field) {
    const selector = group
        ? `[data-champs-zipcode-field="${field}"][data-champs-zipcode-group="${group}"]`
        : `[data-champs-zipcode-field="${field}"]:not([data-champs-zipcode-group])`;

    return root.querySelectorAll(selector);
}

function fillElements(elements, value) {
    if (!elements || elements.length === 0) return;

    elements.forEach((el) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            el.textContent = value;
        }
    });
}

function clearField(root, group, field) {
    fillElements(findFieldTargets(root, group, field), '');
}

function clearAddressFields(root, group) {
    const fields = [
        'street',
        'neighborhood',
        'city',
        'city_code',
        'state',
        'gia',
        'siafi',
        'unit',
        'complement',
        'stateName',
        'region',
        'ddd',
        'json',
    ];

    fields.forEach((field) => {
        clearField(root, group, field);
    });
}

function clearAllFields(root, group) {
    const fields = [
        'street',
        'neighborhood',
        'city',
        'city_code',
        'state',
        'gia',
        'siafi',
        'unit',
        'complement',
        'stateName',
        'region',
        'ddd',
        'error',
        'json',
    ];

    fields.forEach((field) => {
        clearField(root, group, field);
    });
}

function setErrorMessage(root, group, message) {
    fillElements(findFieldTargets(root, group, 'error'), message);
}

function clearErrorMessage(root, group) {
    clearField(root, group, 'error');
}

async function fetchViaCep(zip) {
    const res = await fetch(`${VIA_CEP_URL}/${zip}/json/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data?.erro) {
        throw new Error('CEP não encontrado');
    }

    return data;
}

function handleErrorBehavior(zipInput, root, group, message) {
    if (shouldClearOnError(zipInput)) {
        clearAddressFields(root, group);
    }

    setErrorMessage(root, group, message);

    if (shouldRefocusOnError(zipInput)) {
        zipInput.focus();
    }
}

export async function handleZipcode(zipInput, scope = document) {
    const root = scope?.querySelectorAll ? scope : document;
    const group = getGroup(zipInput);
    const raw = normalizeZip(zipInput.value);

    clearErrorMessage(root, group);

    if (!isValidZip(raw)) {
        handleErrorBehavior(zipInput, root, group, getInvalidMessage(zipInput));

        zipInput.dispatchEvent(new CustomEvent('champs:zipcode', {
            bubbles: true,
            detail: { zip: raw, error: 'invalid_zip' },
        }));

        return;
    }

    try {
        const data = await fetchViaCep(raw);

        clearAllFields(root, group);

        fillElements(findFieldTargets(root, group, 'street'), data.logradouro || '');
        fillElements(findFieldTargets(root, group, 'neighborhood'), data.bairro || '');
        fillElements(findFieldTargets(root, group, 'city'), data.localidade || '');
        fillElements(findFieldTargets(root, group, 'city_code'), data.ibge || '');
        fillElements(findFieldTargets(root, group, 'state'), data.uf || '');
        fillElements(findFieldTargets(root, group, 'complement'), data.complemento || '');

        fillElements(findFieldTargets(root, group, 'stateName'), data.estado || '');
        fillElements(findFieldTargets(root, group, 'region'), data.regiao || '');
        fillElements(findFieldTargets(root, group, 'ddd'), data.ddd || '');

        fillElements(findFieldTargets(root, group, 'gia'), data.gia || '');
        fillElements(findFieldTargets(root, group, 'siafi'), data.siafi || '');
        fillElements(findFieldTargets(root, group, 'unit'), data.unidade || '');

        fillElements(findFieldTargets(root, group, 'json'), JSON.stringify(data, null, 2));
        clearErrorMessage(root, group);

        zipInput.dispatchEvent(new CustomEvent('champs:zipcode', {
            bubbles: true,
            detail: { zip: raw, data },
        }));
    } catch (e) {
        console.warn('[ZipcodeSearch] Erro ao buscar CEP:', e);

        handleErrorBehavior(zipInput, root, group, getNotFoundMessage(zipInput));

        zipInput.dispatchEvent(new CustomEvent('champs:zipcode', {
            bubbles: true,
            detail: { zip: raw, error: 'not_found' },
        }));
    }
}

export function initZipcodeSearch(_scope = document) {
    if (document.documentElement.dataset.champsZipcodeBound === '1') {
        return;
    }

    document.documentElement.dataset.champsZipcodeBound = '1';

    const handler = (event) => {
        const el = event.target;
        if (!el || el.tagName !== 'INPUT') return;
        if (!el.hasAttribute('data-champs-zipcode')) return;

        const trigger = getTrigger(el);
        if (event.type !== trigger) return;

        handleZipcode(el, document);
    };

    document.addEventListener('change', handler, true);
    document.addEventListener('blur', handler, true);
    document.addEventListener('input', handler, true);
}
