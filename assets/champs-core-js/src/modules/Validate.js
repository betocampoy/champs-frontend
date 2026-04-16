import {
    detectCpfCnpjType,
    isValidCPF,
    isValidCNPJ,
    isValidCpfOrCnpj,
    isValidIE,
} from '../utils/brDocuments.js';

function $(sel, root = document) {
    if (!sel) return null;
    try { return root.querySelector(sel); } catch { return null; }
}

function $all(sel, root = document) {
    if (!sel) return [];
    try { return Array.from(root.querySelectorAll(sel)); } catch { return []; }
}

function normalizeTrigger(v) {
    const t = String(v || '').toLowerCase().trim();
    if (t === 'input' || t === 'change' || t === 'blur') return t;
    return 'blur';
}

function setClasses(el, state) {
    // state: 'valid' | 'invalid' | 'neutral'
    el.classList.remove('is-valid', 'is-invalid');
    if (state === 'valid') el.classList.add('is-valid');
    if (state === 'invalid') el.classList.add('is-invalid');
}

function hasBootstrapColClass(el) {
    if (!el?.classList) return false;

    for (const cls of el.classList) {
        if (cls === 'col' || cls.startsWith('col-')) {
            return true;
        }
    }

    return false;
}

function findFeedbackParent(el) {
    if (!el) return null;

    let current = el.parentElement;
    while (current) {
        if (
            current.classList?.contains('form-group') ||
            current.classList?.contains('mb-3') ||
            current.classList?.contains('input-group') ||
            hasBootstrapColClass(current)
        ) {
            return current;
        }
        current = current.parentElement;
    }

    return el.parentElement || null;
}

function ensureFeedbackEl(el, selector) {
    if (selector) {
        const custom = document.querySelector(selector);
        if (custom) return custom;
    }

    const parent = findFeedbackParent(el);
    if (!parent) return null;

    let fb = parent.querySelector(':scope > .invalid-feedback');
    if (!fb) {
        fb = document.createElement('div');
        fb.className = 'invalid-feedback';
        parent.appendChild(fb);
    }

    return fb;
}

function setFeedback(el, message) {
    const fbSel = el.dataset.champsValidateFeedback;
    const fb = ensureFeedbackEl(el, fbSel);
    if (!fb) return;

    fb.textContent = message || '';
    // bootstrap: invalid-feedback só aparece com is-invalid;
    // se neutro/valid, limpamos
}

function dispatchValidated(detail) {
    document.dispatchEvent(new CustomEvent('champs:validated', { detail }));
}

function callValidationErrorHook(el, message, ctx) {
    const fn = window?.Champs?.validationError;
    if (typeof fn === 'function') {
        try { fn(el, message, ctx); } catch {}
    }
}

function readUfFrom(el) {
    const ufFrom = el.dataset.champsValidateUfFrom;
    const ufEl = ufFrom ? $(ufFrom) : null;
    const uf = ufEl ? (ufEl.value || ufEl.textContent || '') : '';
    return String(uf).trim().toUpperCase();
}

function readDocFrom(el) {
    const docFrom = el.dataset.champsValidateDocFrom;
    const docEl = docFrom ? $(docFrom) : null;
    const doc = docEl ? (docEl.value || '') : '';
    return String(doc || '');
}

function getDefaultMessage(type) {
    switch (type) {
        case 'cpf': return 'CPF inválido.';
        case 'cnpj': return 'CNPJ inválido.';
        case 'cpfcnpj': return 'Documento inválido (CPF/CNPJ).';
        case 'ie': return 'Inscrição Estadual inválida.';
        default: return 'Valor inválido.';
    }
}

function validateValueByType(el, type) {
    const raw = String(el.value ?? '');
    const msgCustom = el.dataset.champsValidateMessage;

    // resultado padronizado
    // valid: boolean
    // neutral: boolean (não valida nem invalida; ex.: IE quando doc é CPF)
    // detected: (pra cpfcnpj) 'cpf'|'cnpj'|'unknown'
    // message: string
    // context: extras (uf, requires, docType)
    const res = {
        valid: false,
        neutral: false,
        detected: null,
        message: msgCustom || getDefaultMessage(type),
        context: {},
        value: raw,
        type,
    };

    if (!raw.trim()) {
        // vazio: neutro (não força inválido)
        res.neutral = true;
        res.message = '';
        return res;
    }

    if (type === 'cpf') {
        res.valid = isValidCPF(raw);
        if (!res.valid) res.message = msgCustom || getDefaultMessage(type);
        return res;
    }

    if (type === 'cnpj') {
        res.valid = isValidCNPJ(raw);
        if (!res.valid) res.message = msgCustom || getDefaultMessage(type);
        return res;
    }

    if (type === 'cpfcnpj') {
        res.detected = detectCpfCnpjType(raw);
        res.valid = isValidCpfOrCnpj(raw);
        if (!res.valid) res.message = msgCustom || getDefaultMessage(type);
        return res;
    }

    if (type === 'ie') {
        const uf = readUfFrom(el);
        res.context.uf = uf;

        // requires (ex.: requires="cnpj")
        const requires = String(el.dataset.champsValidateRequires || '').trim().toLowerCase();
        res.context.requires = requires || null;

        if (requires) {
            // doc-from obrigatório para regra requires
            const doc = readDocFrom(el);
            const docType = detectCpfCnpjType(doc);
            res.context.docType = docType;

            if (requires === 'cnpj') {
                if (docType === 'cpf') {
                    // Se doc é CPF -> IE fica neutra (não aplica)
                    res.neutral = true;
                    res.message = '';
                    return res;
                }
                // Se unknown, decide: deixar inválido? melhor neutro até ter doc válido
                if (docType === 'unknown') {
                    res.neutral = true;
                    res.message = '';
                    return res;
                }
            }
        }

        // UF obrigatória para IE (se não tem, inválido ou neutro?)
        // Eu recomendo: se UF vazia, inválido com mensagem específica.
        if (!uf) {
            res.valid = false;
            res.message = msgCustom || 'Selecione a UF para validar a Inscrição Estadual.';
            return res;
        }

        res.valid = isValidIE(raw, uf);
        if (!res.valid) res.message = msgCustom || getDefaultMessage(type);
        return res;
    }

    // type desconhecido => neutro
    res.neutral = true;
    res.message = '';
    return res;
}

function applyValidationUI(el, result) {
    if (result.neutral) {
        setClasses(el, 'neutral');
        setFeedback(el, '');
        return;
    }

    if (result.valid) {
        setClasses(el, 'valid');
        setFeedback(el, '');
        return;
    }

    setClasses(el, 'invalid');
    setFeedback(el, result.message);

    // hook opcional pra “apontar visualmente”
    callValidationErrorHook(el, result.message, {
        code: 'validate',
        type: result.type,
        detected: result.detected,
        context: result.context,
    });
}

function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
    el.setAttribute('aria-disabled', disabled ? 'true' : 'false');

    // se desabilitou, também limpa estado visual
    if (disabled) {
        el.classList.remove('is-valid', 'is-invalid');
        setFeedback(el, '');
    }
}

function updateIeAvailability(ieEl) {
    // Só aplica se for IE e tiver doc-from
    const type = String(ieEl.dataset.champsValidateType || '').trim().toLowerCase();
    if (type !== 'ie') return;

    const docFrom = ieEl.dataset.champsValidateDocFrom;
    if (!docFrom) return;

    const disableUntil = String(ieEl.dataset.champsValidateDisableUntil || '').trim().toLowerCase();
    if (!disableUntil) return; // feature opt-in

    const doc = readDocFrom(ieEl);
    const docType = detectCpfCnpjType(doc);

    // regra: disable até docType bater
    const mustBe = disableUntil; // ex: 'cnpj'
    const shouldEnable = docType === mustBe;

    setDisabled(ieEl, !shouldEnable);
}

function validateElement(el) {

    // NOVO: se for IE com "disable-until", atualiza o disabled antes de validar
    updateIeAvailability(el);

    // se está disabled, não valida (neutro)
    if (el.disabled) {
        setClasses(el, 'neutral');
        setFeedback(el, '');
        dispatchValidated({
            el,
            valid: false,
            neutral: true,
            type: String(el.dataset.champsValidateType || 'unknown'),
            detected: null,
            value: String(el.value ?? ''),
            message: '',
            context: { disabled: true },
        });
        return { valid: false, neutral: true };
    }

    const type = String(el.dataset.champsValidateType || '').trim().toLowerCase() || 'cpfcnpj';
    const result = validateValueByType(el, type);

    applyValidationUI(el, result);

    dispatchValidated({
        el,
        valid: !!result.valid,
        neutral: !!result.neutral,
        type: result.type,
        detected: result.detected,
        value: result.value,
        message: result.message,
        context: result.context,
    });

    return result;
}

function bindTriggers(scope = document) {
    // 1) validação do próprio campo
    const fields = $all('[data-champs-validate]', scope);

    fields.forEach((el) => {
        // se for IE, aplica estado disabled/enabled logo na carga
        updateIeAvailability(el);

        const trig = normalizeTrigger(el.dataset.champsValidateTrigger);

        el.addEventListener(trig, () => validateElement(el));

        // opcional: valida inicial se tiver valor preenchido
        if (String(el.value || '').trim()) validateElement(el);
    });

    // 2) elementos que “disparam revalidação de outros”
    // ex.: UF com data-champs-validate-triggers="#ie"
    const triggerEls = $all('[data-champs-validate-triggers]', scope);

    triggerEls.forEach((src) => {
        const targetsRaw = String(src.dataset.champsValidateTriggers || '').trim();
        if (!targetsRaw) return;

        const targetSelectors = targetsRaw.split(',').map(s => s.trim()).filter(Boolean);

        const trig = normalizeTrigger(src.dataset.champsValidateTrigger || 'change');
        src.addEventListener(trig, () => {
            targetSelectors.forEach((sel) => {
                const target = $(sel);
                if (target && target.hasAttribute('data-champs-validate')) {
                    validateElement(target);
                }
            });
        });
    });
}

export function initValidate(scope = document) {
    bindTriggers(scope);
}
