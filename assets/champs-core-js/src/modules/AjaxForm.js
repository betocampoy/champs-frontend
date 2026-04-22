import DomPatch from './DomPatch.js';
import { initActionRules, runUiActions, runActionRules, runNamedActionRules } from './ActionRules.js';

// ✅ Suporta gatilhos: click (default), change, input
// ✅ Suporta confirm modal automático (data-champs-ajax-confirm)
// ✅ Payload transparente:
//    - data-champs-ajax-field-* SEMPRE vai
//    - inputs do escopo só vão se with-inputs=true
//    - valor do elemento gatilho SEMPRE vai (se tiver name), mesmo with-inputs=false
// ✅ Conflito form/scope x data-field:
//    - escopo vence por padrão
//    - exceção: data-champs-ajax-priorize-data-attr="campo1,campo2" força data-field
// ✅ Pipeline de actions:
//    - actions[] executadas em sequência
//    - validation-error é terminal (para cascata)
//    - redirect/reload são terminais
// ✅ Integra ModalManager com botões dinâmicos (executeActions no ctx)
//
// ✅ NOVO: escopos explícitos e automáticos
//    - data-champs-ajax-form="formId|#formId|[selector]|nameDoForm"
//    - data-champs-ajax-scope="#container|.classe|[selector]"
//    - auto-discovery: form > scope semântico > modal > offcanvas > tab-pane > card > document
//
// ✅ NOVO: action "open-new-page" (robusta e flexível)
//    - suporte a url/html e múltiplas páginas
//    - opção de pré-abrir janelas (popup-blocker safe) via data-champs-open-new-page
// ✅ NOVO: botão gatilho
//    - disable por padrão durante a requisição
//    - reenable por padrão após o retorno
// ✅ NOVO: action "modal"
//    - html parcial => fluxo compatível atual
//    - html completo + full=true => autonomia total do backend/dev
// ✅ NOVO: fechamento do modal pai no gatilho ajax
//    - data-champs-modal-close-on-action="true"
//    - fecha antes da request e espera terminar
//
// ✅ NOVO: action "close-modal-window"
//    - fecha o modal atual somente quando o backend mandar
//    - compatível com BS5 e Champs Modal
//    - alias compatível: "close-modal"
//
// ✅ NOVO: inclusão opcional do ChampsFilter no payload
//    - data-champs-ajax-include-champs-filter="true" => busca no document
//    - data-champs-ajax-include-champs-filter="#seletor" => busca apenas dentro do seletor
//    - ignora champs_filter_label_*
//    - sobrescreve campos champs_filter_* já existentes no payload
//
// ✅ NOVO: integração com ActionRules
//    - action "ui-actions" => executa ações prontas de UI
//    - action "action-rules" => executa regras declarativas inline
//    - action "named-action-rules" => executa regra registrada em window.ChampsPageActions
//    - reinit do core após dom-patch
//
// ✅ NOVO: submit declarativo no form
//    - data-champs-ajax-submit="true"
//    - intercepta submit natural do form
//    - compatível com Enter, botão submit e requestSubmit()
//    - sempre envia os inputs do próprio form
//    - permite configurar route/method/loader no próprio form
//
// ✅ NOVO: proteção contra submit/loader duplicado
//    - listener de submit registrado em capturing phase
//    - preventDefault + stopPropagation + stopImmediatePropagation
//    - flags de estado:
//      - data-champs-ajax-intercepted
//      - data-champs-ajax-submitting
//
// ✅ NOVO: loader contextual vindo do form
//    - em submit declarativo, o form vira a fonte de configuração visual/contextual
//    - respeita data-champs-loader e data-champs-loader-target definidos no form
//    - envia X-Global-Loader: 0 quando houver loader local configurado

import Message from './Message.js';
import { applyValidationError } from './ValidationError.js';
import FormFiller from './FormFiller.js';
import FormPopulation from './FormPopulation.js';
import * as ModalManager from './ModalManager.js';

let _bound = false;
const _debounceTimers = new WeakMap();
const _preopenedPages = new WeakMap();

/* ============================= */
/*  INIT                         */
/* ============================= */

export function initAjaxForm(scope = document) {
    if (_bound) return;
    _bound = true;

    const hasTrigger = (el, expected, fallback) => {
        const raw = (el.getAttribute('data-champs-ajax-trigger') || fallback || '')
            .trim()
            .toLowerCase();

        if (!raw) return false;

        const triggers = raw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

        return triggers.includes(expected);
    };

    document.addEventListener('click', async (event) => {
        const trigger = event.target.closest('[data-champs-ajax]');
        if (!trigger) return;
        if (!hasTrigger(trigger, 'click', 'click')) return;

        event.preventDefault();
        await handleAjax(trigger);
    });

    document.addEventListener('change', async (event) => {
        const trigger = event.target.closest('[data-champs-ajax]');
        if (!trigger) return;
        if (!hasTrigger(trigger, 'change', '')) return;

        await handleAjax(trigger);
    });

    document.addEventListener('input', async (event) => {
        const trigger = event.target.closest('[data-champs-ajax]');
        if (!trigger) return;
        if (!hasTrigger(trigger, 'input', '')) return;

        const minLen = parseInt(trigger.getAttribute('data-champs-ajax-min-length') || '0', 10);
        const val = String(trigger.value ?? '');
        if (minLen > 0 && val.length < minLen) return;

        const debounceMs = parseInt(trigger.getAttribute('data-champs-ajax-debounce') || '0', 10);
        if (debounceMs > 0) {
            clearTimeout(_debounceTimers.get(trigger));
            _debounceTimers.set(
                trigger,
                setTimeout(() => handleAjax(trigger), debounceMs)
            );
            return;
        }

        await handleAjax(trigger);
    });

    // Capturing phase para interceptar o submit o mais cedo possível
    document.addEventListener('submit', async (event) => {
        const form = event.target;

        if (!(form instanceof HTMLFormElement)) return;
        if (form.dataset.champsAjaxSubmit !== 'true') return;

        form.dataset.champsAjaxIntercepted = 'true';

        if (form.dataset.champsAjaxSubmitting === 'true') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }

        await handleAjaxFormSubmit(form, event.submitter || null);
    }, true);

    initActionRules(scope);

    window.Champs = window.Champs || {};
    window.Champs.AjaxForm = {
        handleAjax,
        handleAjaxFormSubmit,
        executeActions: (actions, triggerEl) => executeActions(actions, triggerEl),
    };
}

/* ============================= */
/*  MAIN                         */
/* ============================= */

export async function handleAjax(triggerEl) {
    if (!triggerEl) return;

    const configSource = getAjaxConfigSource(triggerEl);

    const wantsPreopen = configSource.hasAttribute('data-champs-open-new-page')
        || configSource.hasAttribute('data-champs-ajax-open-new-page');

    if (wantsPreopen) {
        const count = Math.max(
            1,
            parseInt(
                configSource.getAttribute('data-champs-open-new-page-count')
                || configSource.getAttribute('data-champs-ajax-open-new-page-count')
                || '1',
                10
            )
        );

        const target = configSource.getAttribute('data-champs-open-new-page-target')
            || configSource.getAttribute('data-champs-ajax-open-new-page-target')
            || '_blank';

        const pages = [];
        for (let i = 0; i < count; i++) {
            try {
                const w = window.open('', target);
                try {
                    w?.document?.write('<p style="font-family:system-ui;padding:20px">Gerando…</p>');
                } catch {}
                pages.push(w);
            } catch {
                pages.push(null);
            }
        }
        _preopenedPages.set(triggerEl, pages);
    }

    const disableButton = parseBool(configSource.getAttribute('data-champs-ajax-disable-button'), true);
    const reenableButton = parseBool(configSource.getAttribute('data-champs-ajax-reenable-button'), true);

    if (isDisabled(triggerEl) && triggerEl.dataset.champsAjaxDisabledByRequest !== 'true') return;

    const confirmText = configSource.getAttribute('data-champs-ajax-confirm');
    if (confirmText) {
        const ok = await ModalManager.confirm(
            {
                title: 'Confirmação',
                body: `<p>${escapeHtml(confirmText)}</p>`,
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
            },
            {}
        );

        if (!ok) {
            const pages = _preopenedPages.get(triggerEl) || [];
            pages.forEach((w) => {
                try {
                    w?.close?.();
                } catch {}
            });
            _preopenedPages.delete(triggerEl);
            return;
        }
    }

    if (disableButton) {
        setDisabled(triggerEl, true);
        triggerEl.dataset.champsAjaxDisabledByRequest = 'true';
    }

    let requestRoute = '';
    let requestMethod = 'POST';

    try {
        await closeParentModalIfNeeded(triggerEl);

        const { fd, route, method } = buildFormData(triggerEl);
        requestRoute = route;
        requestMethod = method;

        if (!route) {
            console.warn('[AjaxForm] data-champs-ajax-route não informado.');
            if (disableButton && reenableButton && triggerEl.dataset.champsAjaxDisabledByRequest === 'true') {
                setDisabled(triggerEl, false);
                delete triggerEl.dataset.champsAjaxDisabledByRequest;
            }
            return;
        }

        const detail = { triggerEl, route, method };
        document.dispatchEvent(new CustomEvent('champs:ajax:start', { detail }));

        const res = await fetch(route, {
            method,
            body: fd,
            headers: (() => {
                const h = { 'X-Champs-Ajax': '1' };

                const hasLocalLoader =
                    !!configSource?.dataset?.champsLoaderTarget ||
                    configSource?.hasAttribute?.('data-champs-loader');

                h['X-Global-Loader'] = hasLocalLoader ? '0' : '1';

                return h;
            })(),
        });

        let json = null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            json = await res.json();
        } else {
            const text = await res.text();
            console.warn('[AjaxForm] Response não é JSON:', text);
            Message?.show?.('Resposta inválida do servidor.', 'error');
            if (disableButton && reenableButton && triggerEl.dataset.champsAjaxDisabledByRequest === 'true') {
                setDisabled(triggerEl, false);
                delete triggerEl.dataset.champsAjaxDisabledByRequest;
            }
            return;
        }

        const actions = normalizeActions(json);
        await executeActions(actions, triggerEl);

    } catch (e) {
        console.error('[AjaxForm] Erro:', e);
        Message?.show?.('Erro ao processar a requisição.', 'error');
        if (disableButton && reenableButton && triggerEl.dataset.champsAjaxDisabledByRequest === 'true') {
            setDisabled(triggerEl, false);
            delete triggerEl.dataset.champsAjaxDisabledByRequest;
        }
    } finally {
        if (
            disableButton &&
            reenableButton &&
            triggerEl?.dataset?.champsAjaxDisabledByRequest === 'true'
        ) {
            setDisabled(triggerEl, false);
            delete triggerEl.dataset.champsAjaxDisabledByRequest;
        }

        _preopenedPages.delete(triggerEl);

        document.dispatchEvent(new CustomEvent('champs:ajax:end', {
            detail: {
                triggerEl,
                route: requestRoute,
                method: requestMethod,
            }
        }));
    }
}

export async function handleAjaxFormSubmit(form, submitter = null) {
    if (!form) return;

    form.dataset.champsAjaxSubmitting = 'true';

    try {
        const triggerEl = createFormSubmitTrigger(form, submitter);
        await handleAjax(triggerEl);
    } finally {
        delete form.dataset.champsAjaxSubmitting;
        delete form.dataset.champsAjaxIntercepted;
    }
}

function createFormSubmitTrigger(form, submitter = null) {
    const trigger = document.createElement('button');
    trigger.type = 'button';

    trigger.setAttribute('data-champs-ajax', '');
    trigger.setAttribute('data-champs-ajax-with-inputs', 'true');

    const route = form.dataset.champsAjaxRoute || form.getAttribute('action') || '';
    const method = form.dataset.champsAjaxMethod || form.getAttribute('method') || 'POST';

    if (route) {
        trigger.setAttribute('data-champs-ajax-route', route);
    }

    if (method) {
        trigger.setAttribute('data-champs-ajax-method', method.toUpperCase());
    }

    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-confirm');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-disable-button');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-reenable-button');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-priorize-data-attr');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-include-champs-filter');
    copyDataAttrIfExists(form, trigger, 'data-champs-modal-close-on-action');

    copyDataAttrIfExists(form, trigger, 'data-champs-loader');
    copyDataAttrIfExists(form, trigger, 'data-champs-loader-target');

    copyDataAttrIfExists(form, trigger, 'data-champs-open-new-page');
    copyDataAttrIfExists(form, trigger, 'data-champs-open-new-page-count');
    copyDataAttrIfExists(form, trigger, 'data-champs-open-new-page-target');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-open-new-page');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-open-new-page-count');
    copyDataAttrIfExists(form, trigger, 'data-champs-ajax-open-new-page-target');

    trigger.__champsAjaxFormRef = form;
    trigger.__champsAjaxSubmitter = submitter || null;

    trigger.closest = function(selector) {
        if (!selector) return null;

        if (selector === 'form' || selector.includes('form')) {
            return form;
        }

        if (typeof form.closest === 'function') {
            return form.closest(selector);
        }

        return null;
    };

    return trigger;
}

function copyDataAttrIfExists(source, target, attrName) {
    if (!source?.hasAttribute?.(attrName)) return;
    target.setAttribute(attrName, source.getAttribute(attrName));
}

function getAjaxConfigSource(triggerEl) {
    return triggerEl?.__champsAjaxFormRef || triggerEl;
}

/* ============================= */
/*  PIPELINE                     */
/* ============================= */

async function executeActions(actions, triggerEl) {
    const configSource = getAjaxConfigSource(triggerEl);
    const disableButton = parseBool(configSource.getAttribute('data-champs-ajax-disable-button'), true);
    const reenableButton = parseBool(configSource.getAttribute('data-champs-ajax-reenable-button'), true);

    for (const action of actions) {
        const stopNow = await executeAction(action, triggerEl, {
            executeActions: (list) => executeActions(list, triggerEl),
        });

        if (stopNow) {
            if (
                disableButton &&
                reenableButton &&
                action?.type === 'validation-error' &&
                triggerEl?.dataset?.champsAjaxDisabledByRequest === 'true'
            ) {
                setDisabled(triggerEl, false);
                delete triggerEl.dataset.champsAjaxDisabledByRequest;
            }
            break;
        }
    }
}

async function executeAction(action, triggerEl, ctx) {
    if (!action || typeof action !== 'object') return false;

    const type = String(action.type || '').toLowerCase().trim();
    if (!type) return false;

    const terminal = (t) => t === 'validation-error' || t === 'redirect' || t === 'reload';

    switch (type) {
        case 'message': {
            const messageOptions = {
                clearBefore: action.clearBefore !== false,
                persist: action.persist === true,
                seconds: action.seconds,
            };

            if (action.html) {
                Message?.show?.(
                    action.html,
                    action.level || 'info',
                    {
                        ...messageOptions,
                        rawHtml: true,
                        target: action.target || null,
                        scopeEl: getAjaxConfigSource(triggerEl),
                        broadcast: action.broadcast === true,
                    }
                );
            } else {
                Message?.show?.(
                    action.text || action.message || '',
                    action.level || 'success',
                    {
                        ...messageOptions,
                        target: action.target || null,
                        scopeEl: getAjaxConfigSource(triggerEl),
                        broadcast: action.broadcast === true,
                    }
                );
            }
            return false;
        }

        case 'validation-error': {
            if (action?.message) {
                Message?.show?.(
                    action.message,
                    action.level || 'error',
                    {
                        clearBefore: action.clearBefore !== false,
                        persist: action.persist === true,
                        seconds: action.seconds,
                        target: action.target || null,
                        scopeEl: getAjaxConfigSource(triggerEl),
                        broadcast: action.broadcast === true,
                    }
                );
            }
            applyValidationError(action, getAjaxConfigSource(triggerEl));
            return true;
        }

        case 'formfiller': {
            FormFiller?.fill?.(action.data || {}, document);
            return false;
        }

        case 'populate': {
            FormPopulation?.populate?.(action, document);
            return false;
        }

        case 'modal': {
            ModalManager.openModal(action, {
                executeActions: ctx?.executeActions,
            });
            return false;
        }

        case 'close-modal':
        case 'close-modal-window': {
            await closeCurrentModalWindow(triggerEl, action);
            return false;
        }

        case 'custom': {
            const fnName = action.function;
            if (fnName && typeof window[fnName] === 'function') {
                window[fnName](action.data, { triggerEl, action });
            } else {
                console.warn('[AjaxForm] custom function não encontrada:', fnName);
            }
            return false;
        }

        case 'redirect': {
            if (action.url) window.location.href = action.url;
            return true;
        }

        case 'reload': {
            window.location.reload();
            return true;
        }

        case 'open-new-page': {
            const pages = normalizeOpenNewPagePayload(action);
            const preopened = _preopenedPages.get(triggerEl) || [];

            pages.forEach((p, idx) => {
                const win = preopened[idx] || safeOpenWindow(p.target || '_blank');
                if (!win) return;

                if (p.url) {
                    try {
                        win.location.href = p.url;
                    } catch {
                        try {
                            win.document.open();
                            win.document.write(`<meta http-equiv="refresh" content="0;url=${escapeHtml(p.url)}">`);
                            win.document.close();
                        } catch {}
                    }
                    return;
                }

                const html = p.html || p.page || '';
                if (!html) return;
                try {
                    win.document.open();
                    win.document.write(html);
                    win.document.close();
                } catch {}
            });

            return false;
        }

        case 'dom-patch': {
            const patchScope = resolveActionExecutionScope(triggerEl, action);
            await DomPatch.execute(action, {
                ...ctx,
                scope: patchScope,
            });
            afterDomMutation(patchScope);
            return false;
        }

        case 'ui-actions': {
            runUiActions(
                Array.isArray(action.actions) ? action.actions : [],
                buildActionRulesOptions(triggerEl, action)
            );
            return false;
        }

        case 'action-rules': {
            runActionRules(
                Array.isArray(action.rules) ? action.rules : [],
                buildActionRulesOptions(triggerEl, action)
            );
            return false;
        }

        case 'named-action-rules': {
            runNamedActionRules(
                action.name || '',
                buildActionRulesOptions(triggerEl, action)
            );
            return false;
        }

        default:
            console.warn('[AjaxForm] Action type não suportada:', type, action);
            return terminal(type);
    }
}

/* ============================= */
/*  ACTIONS NORMALIZATION        */
/* ============================= */

function normalizeActions(json) {
    if (json && Array.isArray(json.actions)) return json.actions;
    if (json && json.action && typeof json.action === 'object') return [json.action];
    if (Array.isArray(json)) return json;
    return [];
}

function safeOpenWindow(target = '_blank') {
    try {
        return window.open('', target);
    } catch {
        return null;
    }
}

function normalizeOpenNewPagePayload(action) {
    if (Array.isArray(action.pages)) {
        return action.pages.map((p) => ({
            target: p?.target,
            url: p?.url,
            html: p?.html || p?.page,
            page: p?.page,
        }));
    }

    if (action.url || action.html || action.page) {
        return [{
            target: action.target,
            url: action.url,
            html: action.html || action.page,
            page: action.page,
        }];
    }

    const np = action.newPage;
    if (Array.isArray(np)) {
        return np.map((p) => ({
            target: p?.target,
            url: p?.url,
            html: p?.html || p?.page,
            page: p?.page,
        }));
    }
    if (np && typeof np === 'object') {
        return [{
            target: np.target,
            url: np.url,
            html: np.html || np.page,
            page: np.page,
        }];
    }

    return [];
}

/* ============================= */
/*  FORMDATA / ESCOPOS           */
/* ============================= */

function parseBool(v, defaultValue = false) {
    if (v === undefined || v === null || v === '') return defaultValue;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase().trim();
    if (['1', 'true', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'off'].includes(s)) return false;
    return defaultValue;
}

function parseCsvList(v) {
    if (!v) return [];
    return String(v)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function rebuildFormDataWithout(fd, fieldName) {
    const rebuilt = new FormData();
    for (const [k, v] of fd.entries()) {
        if (k !== fieldName) rebuilt.append(k, v);
    }
    return rebuilt;
}

function rebuildFormDataWithoutPrefix(fd, prefix) {
    const rebuilt = new FormData();
    for (const [k, v] of fd.entries()) {
        if (!String(k).startsWith(prefix)) {
            rebuilt.append(k, v);
        }
    }
    return rebuilt;
}

function safeCssEscape(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
        return globalThis.CSS.escape(value);
    }

    return String(value).replace(/"/g, '\\"');
}

function findTargetElement(ref) {
    if (!ref) return null;

    const value = String(ref).trim();
    if (!value) return null;

    if (
        value.startsWith('#') ||
        value.startsWith('.') ||
        value.startsWith('[')
    ) {
        return document.querySelector(value);
    }

    const byId = document.getElementById(value);
    if (byId) return byId;

    const byFormName = document.querySelector(`form[name="${safeCssEscape(value)}"]`);
    if (byFormName) return byFormName;

    return null;
}

function hasNamedFields(scope) {
    if (!scope || typeof scope.querySelector !== 'function') return false;
    return !!scope.querySelector('input[name], select[name], textarea[name]');
}

function resolveInputScope(triggerEl) {
    if (triggerEl?.__champsAjaxFormRef) {
        return triggerEl.__champsAjaxFormRef;
    }

    const explicitForm = triggerEl.getAttribute('data-champs-ajax-form');
    if (explicitForm) {
        const formEl = findTargetElement(explicitForm);
        if (formEl && hasNamedFields(formEl)) return formEl;
    }

    const closestForm = triggerEl.closest('form');
    if (closestForm && hasNamedFields(closestForm)) return closestForm;

    const explicitScope = triggerEl.getAttribute('data-champs-ajax-scope');
    if (explicitScope) {
        const scopeEl = findTargetElement(explicitScope);
        if (scopeEl && hasNamedFields(scopeEl)) return scopeEl;
    }

    const candidates = [
        triggerEl.closest('[data-champs-form-scope]'),
        triggerEl.closest('.modal'),
        triggerEl.closest('.offcanvas'),
        triggerEl.closest('.tab-pane'),
        triggerEl.closest('.card'),
        document,
    ];

    for (const scope of candidates) {
        if (scope && hasNamedFields(scope)) {
            return scope;
        }
    }

    return null;
}

function appendFieldToFormData(fd, field) {
    if (!field || !field.name || field.disabled) return;

    const tag = (field.tagName || '').toLowerCase();
    const type = (field.type || '').toLowerCase();

    if (type === 'submit' || type === 'button' || type === 'reset') return;

    if (type === 'checkbox' || type === 'radio') {
        if (!field.checked) return;
        fd.append(field.name, field.value ?? 'on');
        return;
    }

    if (type === 'file') {
        if (field.files && field.files.length) {
            for (let i = 0; i < field.files.length; i += 1) {
                fd.append(field.name, field.files[i]);
            }
        }
        return;
    }

    if (tag === 'select' && field.multiple) {
        Array.from(field.selectedOptions).forEach((opt) => {
            fd.append(field.name, opt.value);
        });
        return;
    }

    fd.append(field.name, field.value ?? '');
}

function collectScopeFormData(scope) {
    const fd = new FormData();
    const fieldNames = new Set();

    if (!scope) {
        return { fd, fieldNames };
    }

    if (scope.tagName && scope.tagName.toLowerCase() === 'form') {
        const formFd = new FormData(scope);
        for (const [key, value] of formFd.entries()) {
            fd.append(key, value);
            fieldNames.add(key);
        }
        return { fd, fieldNames };
    }

    const fields = scope.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
        if (!field.name || field.disabled) return;
        fieldNames.add(field.name);
        appendFieldToFormData(fd, field);
    });

    return { fd, fieldNames };
}

function resolveChampsFilterSource(triggerEl) {
    const configSource = getAjaxConfigSource(triggerEl);
    const attr = configSource.getAttribute('data-champs-ajax-include-champs-filter');

    if (attr === null) {
        return null;
    }

    const value = attr.trim().toLowerCase();

    if (value === '' || value === 'true') {
        return document;
    }

    const target = document.querySelector(attr);
    if (target) {
        return target;
    }

    console.warn('[AjaxForm] alvo de filtro não encontrado:', attr);
    return null;
}

function collectChampsFilterFormData(source) {
    const fd = new FormData();

    if (!source) {
        return fd;
    }

    const fields = source.querySelectorAll('[name^="champs_filter_"]');

    fields.forEach((field) => {
        const name = field.getAttribute('name') || '';

        if (!name) return;
        if (name.startsWith('champs_filter_label_')) return;
        if (field.disabled) return;

        appendFieldToFormData(fd, field);
    });

    return fd;
}

function mergeChampsFilterIntoFormData(fd, filterFd) {
    if (!filterFd) return fd;

    let merged = rebuildFormDataWithoutPrefix(fd, 'champs_filter_');

    for (const [key, value] of filterFd.entries()) {
        merged.append(key, value);
    }

    return merged;
}

function buildFormData(triggerEl) {
    const configSource = getAjaxConfigSource(triggerEl);

    const route = configSource.getAttribute('data-champs-ajax-route') || '';
    const method = (configSource.getAttribute('data-champs-ajax-method') || 'POST').toUpperCase();

    const isFormSubmit = !!triggerEl.__champsAjaxFormRef;

    const withInputs = isFormSubmit
        ? true
        : parseBool(configSource.getAttribute('data-champs-ajax-with-inputs'), false);

    const priorize = new Set(parseCsvList(configSource.getAttribute('data-champs-ajax-priorize-data-attr')));

    let fd = new FormData();
    let scopeFieldNames = new Set();

    if (withInputs) {
        const scope = resolveInputScope(triggerEl);

        if (!scope) {
            console.warn('[AjaxForm] Nenhum escopo com campos foi encontrado para o gatilho:', triggerEl);
        } else {
            const collected = collectScopeFormData(scope);
            fd = collected.fd;
            scopeFieldNames = collected.fieldNames;
        }
    }

    const submitter = triggerEl.__champsAjaxSubmitter || null;
    if (submitter?.name) {
        const submitterValue = submitter.value ?? '';
        fd = rebuildFormDataWithout(fd, submitter.name);
        fd.append(submitter.name, submitterValue);
    }

    const triggerName = triggerEl.getAttribute('name');
    if (triggerName) {
        const triggerValue = triggerEl.value ?? '';
        if (!withInputs) {
            fd.append(triggerName, triggerValue);
        } else if (!scopeFieldNames.has(triggerName) || priorize.has(triggerName)) {
            fd = rebuildFormDataWithout(fd, triggerName);
            fd.append(triggerName, triggerValue);
        }
    }

    for (const [k, v] of Object.entries(configSource.dataset || {})) {
        if (!k.startsWith('champsAjaxField')) continue;
        const field = k.replace('champsAjaxField', '');
        if (!field) continue;

        const name = toSnake(field);
        const value = v ?? '';

        if (withInputs && scopeFieldNames.has(name) && !priorize.has(name)) {
            continue;
        }

        fd = rebuildFormDataWithout(fd, name);
        fd.append(name, value);
    }

    const champsFilterSource = resolveChampsFilterSource(triggerEl);

    if (champsFilterSource) {
        const filterFd = collectChampsFilterFormData(champsFilterSource);
        fd = mergeChampsFilterIntoFormData(fd, filterFd);
    }

    return { fd, route, method };
}

/* ============================= */
/*  ACTION RULES HELPERS         */
/* ============================= */

function resolveActionExecutionScope(triggerEl, action = {}) {
    const explicitScope = action.scope || action.targetScope || '';

    if (explicitScope) {
        const found = findTargetElement(explicitScope);
        if (found) {
            return found;
        }
    }

    return (
        resolveInputScope(triggerEl) ||
        triggerEl?.closest?.('.modal') ||
        triggerEl?.closest?.('.champs-modal') ||
        triggerEl?.closest?.('.offcanvas') ||
        triggerEl?.closest?.('.tab-pane') ||
        triggerEl?.closest?.('.card') ||
        document
    );
}

function buildActionRulesOptions(triggerEl, action = {}) {
    return {
        scope: resolveActionExecutionScope(triggerEl, action),
        element: getAjaxConfigSource(triggerEl),
        extra: action.context || {},
    };
}

function afterDomMutation(scope = document) {
    initActionRules(scope);

    if (window.Champs && typeof window.Champs.init === 'function') {
        window.Champs.init(scope);
    }
}

/* ============================= */
/*  MODAL HELPERS                */
/* ============================= */

function shouldCloseParentModalOnAction(triggerEl) {
    const configSource = getAjaxConfigSource(triggerEl);

    return parseBool(
        configSource?.getAttribute?.('data-champs-modal-close-on-action'),
        false
    );
}

function getClosestModal(triggerEl) {
    const configSource = getAjaxConfigSource(triggerEl);
    return configSource?.closest?.('.modal, .champs-modal') || null;
}

function closeParentModalIfNeeded(triggerEl) {
    return new Promise((resolve) => {
        if (!shouldCloseParentModalOnAction(triggerEl)) {
            resolve();
            return;
        }

        const modalEl = getClosestModal(triggerEl);
        if (!modalEl) {
            resolve();
            return;
        }

        if (modalEl.classList.contains('modal') && globalThis.bootstrap?.Modal) {
            const instance = globalThis.bootstrap.Modal.getOrCreateInstance(modalEl);

            const onHidden = () => {
                modalEl.removeEventListener('hidden.bs.modal', onHidden);
                resolve();
            };

            modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
            instance.hide();
            return;
        }

        const closeBtn = modalEl.querySelector('[data-champs-modal-close]');
        if (closeBtn) {
            closeBtn.click();
            setTimeout(resolve, 220);
            return;
        }

        modalEl.remove();
        setTimeout(resolve, 0);
    });
}

function closeCurrentModalWindow(triggerEl, action = {}) {
    return new Promise((resolve) => {
        const modalSelector = action?.target || action?.selector || null;
        let modalEl = null;
        let resolved = false;

        const done = () => {
            if (resolved) return;
            resolved = true;
            resolve();
        };

        if (modalSelector) {
            modalEl = findTargetElement(modalSelector);
        }

        if (!modalEl) {
            modalEl = getClosestModal(triggerEl);
        }

        if (!modalEl) {
            done();
            return;
        }

        const safetyTimeout = setTimeout(done, 300);

        if (modalEl.classList.contains('modal')) {
            const dismissBtn = modalEl.querySelector('[data-bs-dismiss="modal"], .btn-close');

            if (dismissBtn) {
                try {
                    dismissBtn.click();
                } catch {}

                setTimeout(() => {
                    clearTimeout(safetyTimeout);
                    done();
                }, 180);

                return;
            }

            if (globalThis.bootstrap?.Modal) {
                try {
                    const instance = globalThis.bootstrap.Modal.getOrCreateInstance(modalEl);
                    instance.hide();
                } catch {}

                setTimeout(() => {
                    clearTimeout(safetyTimeout);
                    done();
                }, 180);

                return;
            }
        }

        const closeBtn = modalEl.querySelector('[data-champs-modal-close]');
        if (closeBtn) {
            try {
                closeBtn.click();
            } catch {}

            setTimeout(() => {
                clearTimeout(safetyTimeout);
                done();
            }, 220);

            return;
        }

        try {
            modalEl.remove();
        } catch {}

        clearTimeout(safetyTimeout);
        done();
    });
}

/* ============================= */
/*  HELPERS                      */
/* ============================= */

function isDisabled(el) {
    return el.hasAttribute('disabled') || el.classList.contains('disabled');
}

function setDisabled(el, v) {
    if (v) {
        el.setAttribute('disabled', 'disabled');
        el.classList.add('disabled');
    } else {
        el.removeAttribute('disabled');
        el.classList.remove('disabled');
    }
}

function toSnake(str) {
    return String(str)
        .replace(/^[A-Z]/, (m) => m.toLowerCase())
        .replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}