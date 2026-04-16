// src/modules/Loader.js
import * as Templates from '../loader.templates.js';

/**
 * Loader (Champs Core)
 *
 * Globais (no <body> ou <html>):
 *  - data-champs-loader-template="default|wine|minimal|truck|truck-min|..."
 *  - data-champs-no-loader                                  (desativa o loader no projeto todo)
 *
 * Locais:
 *  - data-champs-loader
 *  - data-champs-loader-template
 *  - data-champs-loader-text
 *  - data-champs-loader-mode="overlay|inline" (default: overlay)
 *  - data-champs-loader-block="true|false"   (default: true)
 */

const Loader = (() => {
    const state = {
        templates: new Map(),
        currentTemplate: 'default',
        attached: new WeakMap(), // Element -> opts
    };

    function isGloballyDisabled() {
        return (
            document.body?.hasAttribute?.('data-champs-no-loader') ||
            document.documentElement?.hasAttribute?.('data-champs-no-loader')
        );
    }

    function getDefaultTemplateFromDOM() {
        return (
            document.body?.dataset?.champsLoaderTemplate ||
            document.documentElement?.dataset?.champsLoaderTemplate ||
            null
        );
    }

    function getTruthyDatasetValue(value) {
        if (value === undefined || value === null || value === '') return null;
        return value;
    }

    function registerTemplate(name, htmlOrFn) {
        if (!name) return;
        state.templates.set(name, htmlOrFn);
    }

    function resolveTemplate(nameOrHtml, context = {}) {
        // 1) se vier vazio, usa o default global ou o atual
        if (!nameOrHtml) {
            nameOrHtml = getDefaultTemplateFromDOM() || state.currentTemplate;
        }

        // 2) se for um template registrado (default/wine/minimal/etc)
        if (state.templates.has(nameOrHtml)) {
            const t = state.templates.get(nameOrHtml);
            return (typeof t === 'function') ? t(context.message, context) : t;
        }

        // 3) se parecer seletor CSS (#id, .class, [attr]) tenta achar no DOM
        if (typeof nameOrHtml === 'string') {
            const sel = nameOrHtml.trim();

            if (/^[#.\[]/.test(sel)) {
                const el = document.querySelector(sel);

                if (el) {
                    // se for <template>, pega o HTML dele
                    if (el.tagName === 'TEMPLATE') {
                        return el.innerHTML || '';
                    }

                    // senão, pega innerHTML do elemento encontrado
                    return el.innerHTML || '';
                }

                // se não achou o seletor, segue e retorna como HTML literal (para debug)
                console.warn(`[Loader] seletor de template não encontrado: ${sel}`);
            }
        }

        // 4) fallback: assume que já é HTML
        return nameOrHtml;
    }

    function useTemplate(name) {
        if (!state.templates.has(name)) {
            console.warn(`[Loader] template "${name}" não encontrado.`);
            return;
        }
        state.currentTemplate = name;
    }

    function createLoaderNode(html) {
        const el = document.createElement('div');
        el.className = 'champs-loader';
        el.innerHTML = html;
        return el;
    }

    function ensureLocalBase(target) {
        const style = window.getComputedStyle(target);
        if (style.position === 'static') target.style.position = 'relative';
    }

    function showGlobal(opts = {}) {
        if (isGloballyDisabled()) return;

        const html = resolveTemplate(opts.template, opts);
        hideGlobal(); // evita duplicação do global

        const overlay = document.createElement('div');
        overlay.className = 'champs-loader-overlay';
        overlay.dataset.champsLoaderScope = 'global';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'rgba(255,255,255,0.7)';
        overlay.style.color = '#111';

        overlay.appendChild(createLoaderNode(html));
        document.body.appendChild(overlay);
    }

    function hideGlobal() {
        document
            .querySelectorAll('body > .champs-loader-overlay[data-champs-loader-scope="global"]')
            .forEach((n) => n.remove());
    }

    function showLocal(target, opts = {}) {
        if (isGloballyDisabled()) return;
        if (!target) return;

        const html = resolveTemplate(opts.template, opts);
        const mode = opts.mode || 'overlay';
        const block = opts.block !== false;

        ensureLocalBase(target);
        hideLocal(target);

        if (mode === 'inline') {
            const inlineNode = createLoaderNode(html);
            inlineNode.dataset.champsLoaderScope = 'local-inline';
            target.appendChild(inlineNode);
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'champs-loader-overlay';
        overlay.dataset.champsLoaderScope = 'local';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'rgba(255,255,255,0.6)';
        overlay.style.color = '#111';
        if (!block) overlay.style.pointerEvents = 'none';

        overlay.appendChild(createLoaderNode(html));
        target.appendChild(overlay);
    }

    function hideLocal(target) {
        if (!target) return;

        target
            .querySelectorAll(':scope > .champs-loader-overlay[data-champs-loader-scope="local"]')
            .forEach((n) => n.remove());

        target
            .querySelectorAll(':scope > .champs-loader[data-champs-loader-scope="local-inline"]')
            .forEach((n) => n.remove());

        // fallback de compatibilidade com versões anteriores
        target.querySelectorAll(':scope > .champs-loader-overlay:not([data-champs-loader-scope])').forEach((n) => n.remove());
        target.querySelectorAll(':scope > .champs-loader:not([data-champs-loader-scope])').forEach((n) => n.remove());
    }

    function show(target = null, opts = {}) {
        if (!target) return showGlobal(opts);
        return showLocal(target, opts);
    }

    function hide(target = null) {
        if (!target) return hideGlobal();
        return hideLocal(target);
    }

    function attach(el) {
        if (!el) return;

        const loaderTemplateAttr = getTruthyDatasetValue(el.dataset.champsLoaderTemplate);
        const loaderMarkerValue = getTruthyDatasetValue(el.dataset.champsLoader);

        state.attached.set(el, {
            template: loaderTemplateAttr || loaderMarkerValue || null,
            message: getTruthyDatasetValue(el.dataset.champsLoaderText),
            mode: el.dataset.champsLoaderMode || 'overlay',
            block: el.dataset.champsLoaderBlock !== 'false',
        });
    }

    function initFromDataAttributes(scope = document) {
        const root = scope?.querySelectorAll ? scope : document;
        root.querySelectorAll('[data-champs-loader]').forEach(attach);
    }

    function showFromEl(el) {
        if (!el) return show(null, {});

        const fallbackTemplate =
            getTruthyDatasetValue(el.dataset?.champsLoaderTemplate) ||
            getTruthyDatasetValue(el.dataset?.champsLoader) ||
            null;

        const opts = state.attached.get(el) || {
            template: fallbackTemplate,
            message: getTruthyDatasetValue(el.dataset?.champsLoaderText),
            mode: el.dataset?.champsLoaderMode || 'overlay',
            block: el.dataset?.champsLoaderBlock !== 'false',
        };

        return show(el, opts);
    }

    function hideFromEl(el) {
        return hide(el || null);
    }

    function registerDefaultTemplatesOnce() {
        if (state.templates.size > 0) return;

        registerTemplate(
            'default',
            `<div aria-label="Carregando" role="status" style="display:flex;align-items:center;justify-content:center;gap:10px">
                <svg width="44" height="44" viewBox="0 0 50 50" aria-hidden="true" focusable="false">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"
                        stroke-dasharray="90 150" stroke-dashoffset="0">
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dasharray" values="1 150;90 150;1 150" dur="0.9s" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" values="0;-35;-125" dur="0.9s" repeatCount="indefinite"/>
                    </circle>
                </svg>
                <span style="font-size:12px;color:#111">Carregando...</span>
            </div>`
        );

        if (Templates.loaderWine) registerTemplate('wine', Templates.loaderWine);
        if (Templates.loaderWineAnimated) registerTemplate('wine-animated', Templates.loaderWineAnimated);
        if (Templates.loaderMinimal) registerTemplate('minimal', Templates.loaderMinimal);
        if (Templates.loaderCornetas) registerTemplate('cornetas', Templates.loaderCornetas);
        if (Templates.loaderCornetasMinimal) registerTemplate('cornetas-min', Templates.loaderCornetasMinimal);
        if (Templates.loaderOrganizzeMe) registerTemplate('org', Templates.loaderOrganizzeMe);
        if (Templates.loaderOrganizzeMeMinimal) registerTemplate('org-min', Templates.loaderOrganizzeMeMinimal);

        // Novos templates - Minha Encomenda
        if (Templates.getTruckLoaderTemplate) registerTemplate('truck', Templates.getTruckLoaderTemplate);
        if (Templates.loaderTruckMinimal) registerTemplate('truck-min', Templates.loaderTruckMinimal);

        const domTemplate = getDefaultTemplateFromDOM();
        if (domTemplate && state.templates.has(domTemplate)) {
            state.currentTemplate = domTemplate;
        }
    }

    return {
        registerTemplate,
        useTemplate,
        show,
        hide,
        initFromDataAttributes,
        showFromEl,
        hideFromEl,
        registerDefaultTemplatesOnce,
    };
})();

export const registerLoaderTemplate = Loader.registerTemplate;
export const useLoaderTemplate = Loader.useTemplate;
export const showLoader = Loader.show;
export const hideLoader = Loader.hide;

export function initLoader(scope = document) {
    Loader.registerDefaultTemplatesOnce();
    Loader.initFromDataAttributes(scope);
}

export function showLoaderFromEl(el) {
    return Loader.showFromEl(el);
}

export function hideLoaderFromEl(el) {
    return Loader.hideFromEl(el);
}

export default Loader;
