/**
 * ActionRules (Champs Core)
 *
 * Responsável por:
 * - executar ações prontas de UI
 * - avaliar regras declarativas com `when`
 * - disparar regras declaradas no HTML
 * - buscar regras registradas em window.ChampsPageActions
 *
 * HTML:
 *   data-champs-action-trigger="change"
 *   data-champs-action="documentoRules"
 *
 * Também suporta:
 *   data-champs-action-trigger="load"
 *   data-champs-action="freightLockOnLoad"
 *
 *   data-champs-actions='[{"when": {...}, "actions": [...]}]'
 *   data-champs-ui-actions='[{"operation":"disable","target":"..."}]'
 *
 * Página:
 *   window.ChampsPageActions = window.ChampsPageActions || {};
 *   window.ChampsPageActions.documentoRules = function (context) {
 *       return [ ...regras ];
 *   };
 */

const boundScopes = new WeakSet();
const initializedLoadElements = new WeakSet();
const SUPPORTED_EVENTS = ['change', 'input', 'click', 'blur'];

// Operações que não miram elemento nenhum (sem `target`) — ex. tocar um som
// de feedback. Checadas ANTES da resolução de `target`/elementos, que pra
// toda outra operação continua obrigatória.
const GLOBAL_OPERATIONS = ['beep'];
let sharedAudioContext = null;

function playTone(frequency, durationMs, waveType, volume) {
    try {
        const oscillator = sharedAudioContext.createOscillator();
        const gainNode = sharedAudioContext.createGain();
        oscillator.type = waveType;
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(sharedAudioContext.destination);
        // setValueAtTime > 0 sempre — exponentialRampToValueAtTime não aceita
        // rampar a partir de 0 (DOMException), por isso volume nunca pode
        // chegar aqui como 0 (ver clamp em playBeep).
        gainNode.gain.setValueAtTime(volume, sharedAudioContext.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, sharedAudioContext.currentTime + durationMs / 1000);
        oscillator.stop(sharedAudioContext.currentTime + durationMs / 1000);
    } catch (error) {
        // Web Audio indisponível/instável — silencioso, nunca deveria
        // quebrar o resto das actions só porque o som falhou.
    }
}

/**
 * `repeat`/`gap` existem pra padrões rítmicos (ex. "alerta" = 2 bipes
 * curtos) serem reconhecíveis por RITMO, não só por altura do som — mais
 * fácil de distinguir sem olhar a tela (uso típico: bipagem de código de
 * barras). `gain` alto por padrão (0.5) de propósito — pensado pra ambiente
 * de operação barulhento, não pra silêncio de escritório.
 */
function playBeep(action) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return;
        }

        sharedAudioContext = sharedAudioContext || new AudioContextClass();

        const frequency = Number(action.frequency) || 440;
        const durationMs = Number(action.duration ?? action.durationMs) || 150;
        const waveType = action.waveType || 'sine';
        const gainValue = Number(action.gain);
        const volume = Number.isFinite(gainValue) && gainValue > 0 ? Math.min(gainValue, 1) : 0.5;
        const repeat = Math.max(1, Number(action.repeat) || 1);
        const gapMs = Number(action.gap ?? action.gapMs) || 80;

        for (let i = 0; i < repeat; i++) {
            const startDelayMs = i * (durationMs + gapMs);
            setTimeout(() => playTone(frequency, durationMs, waveType, volume), startDelayMs);
        }
    } catch (error) {
        // idem playTone — nunca deveria quebrar o resto das actions.
    }
}

function applyGlobalOperation(action) {
    switch (action.operation) {
        case 'beep':
            playBeep(action);
            break;

        default:
            console.warn('[Champs ActionRules] operação global desconhecida:', action.operation, action);
    }
}

function getPageRegistry() {
    return window.ChampsPageActions || {};
}

function safeScope(scope) {
    return scope || document;
}

function resolveElements(target, scope = document) {
    if (!target || typeof target !== 'string') {
        return [];
    }

    try {
        return Array.from(scope.querySelectorAll(target));
    } catch (error) {
        console.warn('[Champs ActionRules] seletor inválido:', target, error);
        return [];
    }
}

function resolveFirstElement(selector, scope = document) {
    return resolveElements(selector, scope)[0] || null;
}

function normalizeValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
}

function getRadioCheckedValue(element) {
    const name = element?.getAttribute?.('name');

    if (!name) {
        return element?.checked ? (element.value || '1') : '';
    }

    const root = element.closest('form') || document;
    const escapedName = typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(name)
        : name.replace(/"/g, '\\"');

    const checked = root.querySelector(`input[type="radio"][name="${escapedName}"]:checked`);
    return checked ? (checked.value || '') : '';
}

function getElementCurrentValue(element) {
    if (!element) {
        return '';
    }

    if (element.type === 'checkbox') {
        return element.checked ? (element.value || '1') : '';
    }

    if (element.type === 'radio') {
        return getRadioCheckedValue(element);
    }

    if ('value' in element) {
        return element.value;
    }

    return element.textContent || '';
}

function isElementChecked(element) {
    return !!(element && 'checked' in element && element.checked);
}

function buildContext(element = null, event = null, scope = document, extra = {}) {
    const finalScope = safeScope(scope);

    return {
        element,
        event,
        form: element?.closest?.('form') || null,
        scope: finalScope,
        value: element ? getElementCurrentValue(element) : '',
        name: element?.getAttribute?.('name') || '',
        dataset: element?.dataset || {},
        ...extra,
    };
}

function evaluateSimpleCondition(condition, context) {
    if (!condition || typeof condition !== 'object') {
        return true;
    }

    if (condition.always === true) {
        return true;
    }

    const sourceSelector = condition.source || null;
    const sourceElement = sourceSelector
        ? resolveFirstElement(sourceSelector, context.scope)
        : context.element;

    const currentValue = normalizeValue(getElementCurrentValue(sourceElement)).trim();

    if (Object.prototype.hasOwnProperty.call(condition, 'equals')) {
        return currentValue === normalizeValue(condition.equals);
    }

    if (Object.prototype.hasOwnProperty.call(condition, 'notEquals')) {
        return currentValue !== normalizeValue(condition.notEquals);
    }

    if (condition.empty === true) {
        return currentValue === '';
    }

    if (condition.notEmpty === true) {
        return currentValue !== '';
    }

    if (condition.checked === true) {
        return isElementChecked(sourceElement) === true;
    }

    if (condition.unchecked === true) {
        return isElementChecked(sourceElement) === false;
    }

    if (Array.isArray(condition.in)) {
        return condition.in.map(normalizeValue).includes(currentValue);
    }

    if (Array.isArray(condition.notIn)) {
        return !condition.notIn.map(normalizeValue).includes(currentValue);
    }

    return true;
}

function evaluateCondition(condition, context) {
    if (!condition) {
        return true;
    }

    if (Array.isArray(condition.all)) {
        return condition.all.every((item) => evaluateCondition(item, context));
    }

    if (Array.isArray(condition.any)) {
        return condition.any.some((item) => evaluateCondition(item, context));
    }

    return evaluateSimpleCondition(condition, context);
}

function applyOperationToElement(element, action) {
    const value = action.value ?? '';
    const name = action.name ?? '';

    switch (action.operation) {
        case 'show':
            element.classList.remove('d-none');
            element.hidden = false;
            break;

        case 'hide':
            element.classList.add('d-none');
            element.hidden = true;
            break;

        case 'enable':
            if ('disabled' in element) {
                element.disabled = false;
            }
            break;

        case 'disable':
            if ('disabled' in element) {
                element.disabled = true;
            }
            break;

        case 'text':
            element.textContent = value;
            break;

        case 'html':
            element.innerHTML = value;
            break;

        case 'value':
            if ('value' in element) {
                element.value = value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;

        case 'addClass':
            normalizeValue(value)
                .split(' ')
                .filter(Boolean)
                .forEach((className) => element.classList.add(className));
            break;

        case 'removeClass':
            normalizeValue(value)
                .split(' ')
                .filter(Boolean)
                .forEach((className) => element.classList.remove(className));
            break;

        case 'attr':
            if (name) {
                element.setAttribute(name, value);
            }
            break;

        case 'removeAttr':
            if (name) {
                element.removeAttribute(name);
            }
            break;

        case 'required':
            if ('required' in element) {
                element.required = true;
            }
            break;

        case 'notRequired':
            if ('required' in element) {
                element.required = false;
            }
            break;

        case 'readonly':
            if ('readOnly' in element) {
                element.readOnly = true;
            }
            break;

        case 'notReadonly':
            if ('readOnly' in element) {
                element.readOnly = false;
            }
            break;

        case 'checked':
            if ('checked' in element) {
                element.checked = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;

        case 'unchecked':
            if ('checked' in element) {
                element.checked = false;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;

        case 'focus':
            if (typeof element.focus === 'function') {
                element.focus();
            }
            break;

        default:
            console.warn('[Champs ActionRules] operação desconhecida:', action.operation, action);
    }
}

function executeAction(action, context) {
    if (!action || typeof action !== 'object') {
        return;
    }

    if (!action.operation) {
        return;
    }

    if (GLOBAL_OPERATIONS.includes(action.operation)) {
        applyGlobalOperation(action);
        return;
    }

    if (!action.target) {
        return;
    }

    const elements = resolveElements(action.target, context.scope);

    if (!elements.length) {
        return;
    }

    elements.forEach((element) => applyOperationToElement(element, action));
}

function executeActions(actions, context) {
    if (!Array.isArray(actions)) {
        return;
    }

    actions.forEach((action) => executeAction(action, context));
}

function runRuleSet(rules, context) {
    if (!Array.isArray(rules)) {
        console.warn('[Champs ActionRules] a rede de ações precisa ser um array.');
        return;
    }

    rules.forEach((rule) => {
        if (!rule || typeof rule !== 'object') {
            return;
        }

        const matched = evaluateCondition(rule.when, context);

        if (matched) {
            executeActions(rule.actions || [], context);
        }
    });
}

function resolveRulesEntry(entry, context) {
    if (typeof entry === 'function') {
        try {
            return entry(context);
        } catch (error) {
            console.error('[Champs ActionRules] erro ao executar função registrada:', error);
            return [];
        }
    }

    return entry;
}

function parseJsonAttribute(raw, attrName) {
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`[Champs ActionRules] JSON inválido em ${attrName}:`, error);
        return null;
    }
}

function resolveElementPayload(element, context) {
    const inlineUiActionsRaw = element.getAttribute('data-champs-ui-actions');
    const inlineRulesRaw = element.getAttribute('data-champs-actions');
    const actionName = (element.dataset.champsAction || '').trim();

    if (inlineUiActionsRaw) {
        return {
            mode: 'ui-actions',
            payload: parseJsonAttribute(inlineUiActionsRaw, 'data-champs-ui-actions') || [],
        };
    }

    if (inlineRulesRaw) {
        return {
            mode: 'rules',
            payload: parseJsonAttribute(inlineRulesRaw, 'data-champs-actions') || [],
        };
    }

    if (actionName) {
        const registry = getPageRegistry();
        const entry = registry[actionName];

        if (!entry) {
            console.warn(`[Champs ActionRules] ação "${actionName}" não encontrada em window.ChampsPageActions.`);
            return null;
        }

        return {
            mode: 'rules',
            payload: resolveRulesEntry(entry, context),
        };
    }

    return null;
}

function runElementPayload(element, scope, event = null) {
    if (!element) {
        return;
    }

    const context = buildContext(element, event, scope);
    const resolved = resolveElementPayload(element, context);

    if (!resolved) {
        return;
    }

    if (resolved.mode === 'ui-actions') {
        executeActions(resolved.payload, context);
        return;
    }

    runRuleSet(resolved.payload, context);
}

function handleTriggeredEvent(event) {
    const scope = event.currentTarget || document;
    const target = event.target;

    if (!target || typeof target.closest !== 'function') {
        return;
    }

    const element = target.closest('[data-champs-action-trigger]');

    if (!element || !scope.contains(element)) {
        return;
    }

    const triggerName = (element.dataset.champsActionTrigger || '').trim();

    if (!triggerName || event.type !== triggerName) {
        return;
    }

    runElementPayload(element, scope, event);
}

function bindSupportedEvents(scope) {
    if (boundScopes.has(scope)) {
        return;
    }

    SUPPORTED_EVENTS.forEach((eventName) => {
        scope.addEventListener(eventName, handleTriggeredEvent);
    });

    boundScopes.add(scope);
}

function runLoadActions(scope) {
    const elements = scope.querySelectorAll('[data-champs-action-trigger="load"]');

    elements.forEach((element) => {
        if (initializedLoadElements.has(element)) {
            return;
        }

        initializedLoadElements.add(element);
        runElementPayload(element, scope, null);
    });
}

export function runActionRules(rules, options = {}) {
    const context = buildContext(
        options.element || null,
        options.event || null,
        options.scope || document,
        options.extra || {}
    );

    runRuleSet(rules, context);
}

export function runNamedActionRules(actionName, options = {}) {
    if (!actionName) {
        return;
    }

    const registry = getPageRegistry();
    const entry = registry[actionName];

    if (!entry) {
        console.warn(`[Champs ActionRules] ação "${actionName}" não encontrada em window.ChampsPageActions.`);
        return;
    }

    const context = buildContext(
        options.element || null,
        options.event || null,
        options.scope || document,
        options.extra || {}
    );

    const rules = resolveRulesEntry(entry, context);
    runRuleSet(rules, context);
}

export function runUiActions(actions, options = {}) {
    const context = buildContext(
        options.element || null,
        options.event || null,
        options.scope || document,
        options.extra || {}
    );

    executeActions(actions, context);
}

export function initActionRules(scope = document) {
    const finalScope = safeScope(scope);

    bindSupportedEvents(finalScope);
    runLoadActions(finalScope);

    window.Champs = window.Champs || {};
    window.Champs.runActionRules = runActionRules;
    window.Champs.runNamedActionRules = runNamedActionRules;
    window.Champs.runUiActions = runUiActions;
}