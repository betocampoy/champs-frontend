// assets/js/modules/Calc.js

/**
 * Calc (Champs Core)
 *
 * Objetivo:
 * - cálculos reativos no frontend, sem submit
 * - suporte a fórmulas por linha
 * - suporte a agregações por container
 * - feedback visual de limite / aproximação de limite
 * - integração natural com initCore/domPatch
 *
 * Convenções:
 *
 * Container:
 *   [data-champs-calc]
 *
 * Linha:
 *   [data-champs-calc-row]
 *
 * Campo:
 *   [data-champs-calc-field="qtd"]
 *
 * Fórmula por linha:
 *   [data-champs-calc-formula="round(qtd * valor, 2)"]
 *
 * Agregador legado:
 *   [data-champs-calc-aggregate="sum|count-rows|count-filled"]
 *   [data-champs-calc-source="qtd|total"]
 *
 * Agregador estilo Excel:
 *   [data-champs-calc-aggregate-formula="sum(total)"]
 *   [data-champs-calc-aggregate-formula="sum(qtd * valor)"]
 *   [data-champs-calc-aggregate-formula="avg(total)"]
 *   [data-champs-calc-aggregate-formula="min(total)"]
 *   [data-champs-calc-aggregate-formula="max(total)"]
 *   [data-champs-calc-aggregate-formula="countRows()"]
 *   [data-champs-calc-aggregate-formula="countFilled(qtd)"]
 *
 * Formatação:
 *   [data-champs-calc-decimals="2"]
 *
 * Trigger:
 *   padrão => change blur
 *   opcional => data-champs-calc-trigger="input"
 *   opcional => data-champs-calc-trigger="input change"
 *
 * Feedback / Limites:
 *   data-champs-calc-limit-max="1000"
 *   data-champs-calc-limit-warning="900"
 *   data-champs-calc-limit-warning-offset="100"
 *   data-champs-calc-feedback-target="#meu-feedback"
 *   data-champs-calc-feedback-over="Limite de {limit} extrapolado!"
 *   data-champs-calc-feedback-near="Faltam {remaining} para extrapolar."
 *   data-champs-calc-feedback-ok="Dentro do limite."
 *   data-champs-calc-feedback-over-class="text-danger"
 *   data-champs-calc-feedback-near-class="text-warning"
 *   data-champs-calc-feedback-ok-class="text-success"
 *   data-champs-calc-feedback-mark-field="true"
 */

let calcInitialized = false;

const CALC_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const RESERVED_HELPER_NAMES = new Set([
    'round',
    'ceil',
    'floor',
    'abs',
    'min',
    'max'
]);

const DEFAULT_FEEDBACK_CLASSES = {
    over: 'text-danger',
    near: 'text-warning',
    ok: 'text-success'
};

const FIELD_STATE_CLASSES = {
    over: 'is-invalid',
    near: 'border-warning',
    ok: 'is-valid'
};

export function initCalc(scope = document) {
    if (!calcInitialized) {
        document.addEventListener('input', handleCalcEvent);
        document.addEventListener('change', handleCalcEvent);
        document.addEventListener('focusout', handleCalcEvent);
        calcInitialized = true;
    }

    refreshCalc(scope);
}

export function refreshCalc(root = document) {
    const containers = collectCalcContainers(root);

    containers.forEach((container) => {
        recalcContainer(container);
    });
}

function handleCalcEvent(event) {
    const target = event.target;

    if (!(target instanceof Element)) return;
    if (!target.matches('[data-champs-calc-field]')) return;

    const container = target.closest('[data-champs-calc]');
    if (!container) return;

    if (!shouldProcessEvent(target, container, event.type)) {
        return;
    }

    recalcContainer(container);
}

function shouldProcessEvent(field, container, eventType) {
    const triggers = resolveCalcTriggers(field, container);

    if (eventType === 'focusout') {
        return triggers.has('blur') || triggers.has('focusout');
    }

    return triggers.has(eventType);
}

function resolveCalcTriggers(field, container) {
    const fieldTriggers = normalizeTriggerList(field.dataset.champsCalcTrigger);
    if (fieldTriggers.size) return fieldTriggers;

    const row = field.closest('[data-champs-calc-row]');
    const rowTriggers = row ? normalizeTriggerList(row.dataset.champsCalcTrigger) : new Set();
    if (rowTriggers.size) return rowTriggers;

    const containerTriggers = normalizeTriggerList(container.dataset.champsCalcTrigger);
    if (containerTriggers.size) return containerTriggers;

    return new Set(['change', 'blur']);
}

function normalizeTriggerList(value) {
    const set = new Set();

    if (!value) return set;

    String(value)
        .split(/[,\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .forEach((item) => {
            if (item === 'focusout') {
                set.add('blur');
                return;
            }

            set.add(item);
        });

    return set;
}

function collectCalcContainers(root) {
    const containers = new Set();

    if (root instanceof Element && root.matches('[data-champs-calc]')) {
        containers.add(root);
    }

    if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
        root.querySelectorAll?.('[data-champs-calc]').forEach((container) => {
            containers.add(container);
        });
    }

    return Array.from(containers);
}

function recalcContainer(container) {
    recalcRows(container);
    recalcAggregates(container);
    applyContainerFeedback(container);

    container.dispatchEvent(new CustomEvent('champs:calc:updated', {
        bubbles: true,
        detail: { container }
    }));
}

function recalcRows(container) {
    const rows = getCalcRows(container);

    if (!rows.length) {
        recalcFormulaTargets(container, container);
        return;
    }

    rows.forEach((row) => {
        recalcFormulaTargets(row, container);
    });
}

function recalcFormulaTargets(scope, container) {
    const formulaTargets = scope.querySelectorAll('[data-champs-calc-formula]');

    formulaTargets.forEach((target) => {
        const formula = target.dataset.champsCalcFormula?.trim();
        if (!formula) return;

        const context = buildRowContext(scope, container);
        const result = evaluateExpression(formula, context);

        writeCalcValue(target, result);
    });
}

function recalcAggregates(container) {
    const aggregateTargets = container.querySelectorAll(
        '[data-champs-calc-aggregate], [data-champs-calc-aggregate-formula]'
    );

    aggregateTargets.forEach((target) => {
        let result = 0;

        const aggregateFormula = (target.dataset.champsCalcAggregateFormula || '').trim();

        if (aggregateFormula) {
            result = evaluateAggregateFormula(container, aggregateFormula);
            writeCalcValue(target, result);
            return;
        }

        const aggregate = (target.dataset.champsCalcAggregate || '').trim();
        const source = (target.dataset.champsCalcSource || '').trim();

        switch (aggregate) {
            case 'sum':
                result = aggregateByExpression(container, 'sum', source);
                break;

            case 'count-rows':
                result = aggregateCountRows(container);
                break;

            case 'count-filled':
                result = aggregateCountFilled(container, source);
                break;

            default:
                result = 0;
                break;
        }

        writeCalcValue(target, result);
    });
}

function evaluateAggregateFormula(container, formula) {
    const parsed = parseAggregateFormula(formula);

    if (!parsed) {
        console.warn('[Champs Calc] aggregate formula inválida:', formula);
        return 0;
    }

    const { fn, arg } = parsed;

    switch (fn) {
        case 'sum':
            return aggregateByExpression(container, 'sum', arg);

        case 'avg':
            return aggregateByExpression(container, 'avg', arg);

        case 'min':
            return aggregateByExpression(container, 'min', arg);

        case 'max':
            return aggregateByExpression(container, 'max', arg);

        case 'countrows':
            return aggregateCountRows(container);

        case 'countfilled':
            return aggregateCountFilled(container, arg);

        default:
            console.warn('[Champs Calc] função agregadora não suportada:', fn);
            return 0;
    }
}

function parseAggregateFormula(formula) {
    const normalized = String(formula || '').trim();
    if (!normalized) return null;

    const match = normalized.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (!match) return null;

    return {
        fn: match[1].trim().toLowerCase(),
        arg: match[2].trim()
    };
}

function aggregateByExpression(container, type, expression) {
    const rows = getAggregateScopes(container);

    if (!expression) {
        return 0;
    }

    const values = rows
        .map((scope) => {
            const context = buildRowContext(scope, container);
            return evaluateExpression(expression, context);
        })
        .filter((value) => Number.isFinite(value));

    if (!values.length) {
        return 0;
    }

    switch (type) {
        case 'sum':
            return values.reduce((total, value) => total + value, 0);

        case 'avg':
            return values.reduce((total, value) => total + value, 0) / values.length;

        case 'min':
            return Math.min(...values);

        case 'max':
            return Math.max(...values);

        default:
            return 0;
    }
}

function aggregateCountRows(container) {
    return getAggregateScopes(container).length;
}

function aggregateCountFilled(container, expression) {
    const rows = getAggregateScopes(container);

    if (!expression) return 0;

    const isSimpleField = isSimpleIdentifier(expression);

    return rows.reduce((count, scope) => {
        if (isSimpleField) {
            const field = findFieldInScope(scope, expression);

            if (!field) return count;

            const raw = getElementRawValue(field).trim();
            if (raw === '') return count;

            return count + 1;
        }

        const context = buildRowContext(scope, container);
        const value = evaluateExpression(expression, context);

        if (!Number.isFinite(value)) return count;
        if (value === 0) return count;

        return count + 1;
    }, 0);
}

function getCalcRows(container) {
    return Array.from(container.querySelectorAll('[data-champs-calc-row]'));
}

function getAggregateScopes(container) {
    const rows = getCalcRows(container);

    if (rows.length) {
        return rows;
    }

    return [container];
}

function buildRowContext(scope, container) {
    const context = {};

    const localFields = getFieldsForScope(scope);

    localFields.forEach((field) => {
        const key = String(field.dataset.champsCalcField || '').trim();
        if (!key) return;
        if (!isSafeIdentifier(key)) return;
        if (RESERVED_HELPER_NAMES.has(key)) return;

        context[key] = readCalcValue(field);
    });

    const aggregateTargets = container.querySelectorAll(
        '[data-champs-calc-aggregate][data-champs-calc-field], [data-champs-calc-aggregate-formula][data-champs-calc-field]'
    );

    aggregateTargets.forEach((field) => {
        const key = String(field.dataset.champsCalcField || '').trim();
        if (!key) return;
        if (key in context) return;
        if (!isSafeIdentifier(key)) return;
        if (RESERVED_HELPER_NAMES.has(key)) return;

        context[key] = readCalcValue(field);
    });

    return context;
}

function getFieldsForScope(scope) {
    const fields = Array.from(scope.querySelectorAll('[data-champs-calc-field]'));

    if (!(scope instanceof Element) || !scope.matches('[data-champs-calc-row]')) {
        return fields.filter((field) => {
            const row = field.closest('[data-champs-calc-row]');
            return !row || row === scope;
        });
    }

    return fields;
}

function findFieldInScope(scope, fieldName) {
    const escaped = cssEscape(fieldName);

    if (scope instanceof Element && scope.matches('[data-champs-calc-row]')) {
        return scope.querySelector(`[data-champs-calc-field="${escaped}"]`);
    }

    const candidates = getFieldsForScope(scope);
    return candidates.find((field) => field.dataset.champsCalcField === fieldName) || null;
}

function isSimpleIdentifier(value) {
    return CALC_IDENTIFIER_REGEX.test(String(value || '').trim());
}

function isSafeIdentifier(value) {
    return CALC_IDENTIFIER_REGEX.test(String(value || '').trim());
}

function evaluateExpression(expression, context) {
    const helpers = {
        round(value, decimals = 2) {
            const factor = 10 ** decimals;
            return Math.round((Number(value) || 0) * factor) / factor;
        },
        ceil(value) {
            return Math.ceil(Number(value) || 0);
        },
        floor(value) {
            return Math.floor(Number(value) || 0);
        },
        abs(value) {
            return Math.abs(Number(value) || 0);
        },
        min(...values) {
            return Math.min(...values.map((v) => Number(v) || 0));
        },
        max(...values) {
            return Math.max(...values.map((v) => Number(v) || 0));
        }
    };

    const argNames = [...Object.keys(context), ...Object.keys(helpers)];
    const argValues = [...Object.values(context), ...Object.values(helpers)];

    try {
        const fn = new Function(
            ...argNames,
            `"use strict"; return (${expression});`
        );

        const result = fn(...argValues);

        if (!Number.isFinite(Number(result))) {
            return 0;
        }

        return Number(result);
    } catch (error) {
        console.warn('[Champs Calc] erro ao avaliar expressão:', expression, error);
        return 0;
    }
}

function readCalcValue(el) {
    const raw = getElementRawValue(el);

    if (raw === '') return 0;

    const normalized = raw
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const value = Number(normalized);

    return Number.isFinite(value) ? value : 0;
}

function getElementRawValue(el) {
    if ('value' in el) {
        return String(el.value ?? '');
    }

    return String(el.textContent ?? '');
}

function writeCalcValue(el, value) {
    const decimalsAttr = el.dataset.champsCalcDecimals;
    const decimals = decimalsAttr !== undefined
        ? parseInt(decimalsAttr, 10)
        : null;

    let finalValue = value;

    if (decimals !== null && Number.isFinite(decimals)) {
        finalValue = Number(value).toFixed(decimals);
    }

    if ('value' in el) {
        el.value = String(finalValue);
    } else {
        el.textContent = String(finalValue);
    }

    el.dispatchEvent(new CustomEvent('champs:calc:field-updated', {
        bubbles: true,
        detail: {
            element: el,
            value: finalValue
        }
    }));
}

/* =========================================================
 * Feedback / Threshold
 * ======================================================= */

function applyContainerFeedback(container) {
    const feedbackTargets = container.querySelectorAll(
        '[data-champs-calc-limit-max], [data-champs-calc-limit-warning], [data-champs-calc-limit-warning-offset]'
    );

    feedbackTargets.forEach((field) => {
        applyFieldFeedback(field);
    });
}

function applyFieldFeedback(field) {
    const config = extractFeedbackConfig(field);

    if (!config.hasAnyRule) {
        clearFieldFeedback(field, config);
        return;
    }

    const currentValue = readCalcValue(field);
    const status = resolveFeedbackStatus(currentValue, config);

    renderFieldFeedback(field, status, currentValue, config);
}

function extractFeedbackConfig(field) {
    const limitMax = parseOptionalNumber(field.dataset.champsCalcLimitMax);
    const warningValue = parseOptionalNumber(field.dataset.champsCalcLimitWarning);
    const warningOffset = parseOptionalNumber(field.dataset.champsCalcLimitWarningOffset);

    const feedbackTarget = resolveFeedbackTarget(field.dataset.champsCalcFeedbackTarget);

    return {
        limitMax,
        warningValue,
        warningOffset,
        feedbackTarget,
        markField: field.dataset.champsCalcFeedbackMarkField === 'true',
        overMessage: field.dataset.champsCalcFeedbackOver || 'Limite de {limit} extrapolado!',
        nearMessage: field.dataset.champsCalcFeedbackNear || 'Faltam {remaining} para extrapolar.',
        okMessage: field.dataset.champsCalcFeedbackOk || '',
        overClass: field.dataset.champsCalcFeedbackOverClass || DEFAULT_FEEDBACK_CLASSES.over,
        nearClass: field.dataset.champsCalcFeedbackNearClass || DEFAULT_FEEDBACK_CLASSES.near,
        okClass: field.dataset.champsCalcFeedbackOkClass || DEFAULT_FEEDBACK_CLASSES.ok,
        hasAnyRule:
            limitMax !== null ||
            warningValue !== null ||
            warningOffset !== null
    };
}

function resolveFeedbackTarget(selector) {
    const normalized = String(selector || '').trim();
    if (!normalized) return null;

    try {
        return document.querySelector(normalized);
    } catch (error) {
        console.warn('[Champs Calc] seletor de feedback inválido:', selector, error);
        return null;
    }
}

function parseOptionalNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const normalized = String(value)
        .trim()
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
}

function resolveFeedbackStatus(value, config) {
    const { limitMax, warningValue, warningOffset } = config;

    if (limitMax !== null && value > limitMax) {
        return 'over';
    }

    const nearThreshold = resolveNearThreshold(limitMax, warningValue, warningOffset);

    if (nearThreshold !== null && value >= nearThreshold) {
        return 'near';
    }

    return 'ok';
}

function resolveNearThreshold(limitMax, warningValue, warningOffset) {
    if (warningValue !== null) {
        return warningValue;
    }

    if (limitMax !== null && warningOffset !== null) {
        return limitMax - warningOffset;
    }

    return null;
}

function renderFieldFeedback(field, status, value, config) {
    const payload = buildFeedbackPayload(field, status, value, config);

    renderFeedbackTarget(config.feedbackTarget, payload, config);
    renderFieldState(field, status, config);

    field.dispatchEvent(new CustomEvent('champs:calc:feedback-updated', {
        bubbles: true,
        detail: {
            element: field,
            status,
            value,
            payload
        }
    }));
}

function buildFeedbackPayload(field, status, value, config) {
    const { limitMax } = config;

    const remaining = limitMax !== null ? Math.max(limitMax - value, 0) : 0;
    const exceeded = limitMax !== null ? Math.max(value - limitMax, 0) : 0;

    let message = '';
    let className = '';

    if (status === 'over') {
        message = interpolateFeedbackMessage(config.overMessage, {
            value,
            limit: limitMax,
            remaining,
            exceeded
        });
        className = config.overClass;
    } else if (status === 'near') {
        message = interpolateFeedbackMessage(config.nearMessage, {
            value,
            limit: limitMax,
            remaining,
            exceeded
        });
        className = config.nearClass;
    } else {
        message = interpolateFeedbackMessage(config.okMessage, {
            value,
            limit: limitMax,
            remaining,
            exceeded
        });
        className = config.okClass;
    }

    return {
        field,
        status,
        value,
        limit: limitMax,
        remaining,
        exceeded,
        message,
        className
    };
}

function interpolateFeedbackMessage(template, vars) {
    const base = String(template || '');

    return base.replace(/\{(value|limit|remaining|exceeded)\}/g, (_, key) => {
        const value = vars[key];

        if (value === null || value === undefined) {
            return '';
        }

        return String(value);
    });
}

function renderFeedbackTarget(target, payload, config) {
    if (!target) return;

    clearFeedbackClasses(target, config);

    if (!payload.message) {
        target.textContent = '';
        return;
    }

    target.textContent = payload.message;

    if (payload.className) {
        payload.className
            .split(/\s+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .forEach((cls) => target.classList.add(cls));
    }
}

function clearFieldFeedback(field, config) {
    if (config.feedbackTarget) {
        clearFeedbackClasses(config.feedbackTarget, config);
        config.feedbackTarget.textContent = '';
    }

    renderFieldState(field, 'clear', config);
}

function clearFeedbackClasses(target, config) {
    const classes = [
        config.overClass,
        config.nearClass,
        config.okClass
    ]
        .filter(Boolean)
        .flatMap((value) => String(value).split(/\s+/))
        .map((item) => item.trim())
        .filter(Boolean);

    classes.forEach((cls) => target.classList.remove(cls));
}

function renderFieldState(field, status, config) {
    if (!config.markField) {
        removeFieldStateClasses(field);
        return;
    }

    removeFieldStateClasses(field);

    if (status === 'over') {
        field.classList.add(FIELD_STATE_CLASSES.over);
        return;
    }

    if (status === 'near') {
        field.classList.add(FIELD_STATE_CLASSES.near);
        return;
    }

    if (status === 'ok') {
        field.classList.add(FIELD_STATE_CLASSES.ok);
    }
}

function removeFieldStateClasses(field) {
    Object.values(FIELD_STATE_CLASSES).forEach((cls) => {
        field.classList.remove(cls);
    });
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
    }

    return String(value).replace(/"/g, '\\"');
}